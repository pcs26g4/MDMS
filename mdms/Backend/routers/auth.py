from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from app_models import User, PendingInspector, ApprovedInspector
from passlib.context import CryptContext
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Using pbkdf2_sha256 to avoid bcrypt's 72 byte limit and potential environment issues
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

from schemas import UserCreate, UserLogin, UserResponse

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        is_approved = True
        department = None
        
        if user.role == "INSPECTOR":
            is_approved = False
            department = user.department
        
        hashed_password = get_password_hash(user.password)
        new_user = User(
            name=user.name,
            email=user.email,
            hashed_password=hashed_password,
            role=user.role,
            is_approved=is_approved,
            department=department
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # If Inspector, add to pending_inspectors
        if user.role == "INSPECTOR":
            pending = PendingInspector(
                user_id=new_user.id,
                name=user.name,
                email=user.email,
                department=department
            )
            db.add(pending)
            db.commit()

        return new_user
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/login")
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    if user.role == "INSPECTOR" and not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inspector account not approved yet"
        )

    return {
        "status": "success",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_approved": user.is_approved,
            "department": user.department
        }
    }

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    # 1. All Users (for backward compatibility and admin list)
    users = db.query(User).all()
    
    # 2. Pending Inspectors
    pending_inspectors = db.query(PendingInspector).all()
    
    # 3. Approved Inspectors
    approved_inspectors = db.query(ApprovedInspector).all()
    
    return {
        "status": "success",
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "is_approved": u.is_approved,
                "department": u.department
            } for u in users
        ],
        "pending_inspectors": [
            {
                "id": p.id,
                "user_id": p.user_id,
                "name": p.name,
                "email": p.email,
                "department": p.department,
                "created_at": p.created_at
            } for p in pending_inspectors
        ],
        "approved_inspectors": [
           {
                "id": a.id,
                "user_id": a.user_id,
                "name": a.name,
                "email": a.email,
                "department": a.department,
                "approved_at": a.approved_at
            } for a in approved_inspectors
        ]
    }

@router.put("/approve/{user_id}")
def approve_inspector(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role != "INSPECTOR":
        raise HTTPException(status_code=400, detail="User is not an inspector")
    
    # 1. Update User table
    user.is_approved = True
    
    # 2. Move from Pending -> Approved
    pending = db.query(PendingInspector).filter(PendingInspector.user_id == user_id).first()
    
    if pending:
        approved = ApprovedInspector(
            user_id=user.id,
            name=user.name,
            email=user.email,
            department=pending.department or user.department
        )
        db.add(approved)
        db.delete(pending)
    else:
        # Fallback if not in pending list (legacy data)
        approved = ApprovedInspector(
            user_id=user.id,
            name=user.name,
            email=user.email,
            department=user.department
        )
        db.add(approved)

    db.commit()
    
    return {"status": "success", "message": "Inspector approved successfully and moved to approved_inspectors table"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If the user is an inspector, delete associated records in approved_inspectors and pending_inspectors
    if user.role == "INSPECTOR":
        approved_inspector = db.query(ApprovedInspector).filter(ApprovedInspector.user_id == user_id).first()
        if approved_inspector:
            db.delete(approved_inspector)
        
        pending_inspector = db.query(PendingInspector).filter(PendingInspector.user_id == user_id).first()
        if pending_inspector:
            db.delete(pending_inspector)

    db.delete(user)
    db.commit()
    
    return {"status": "success", "message": "User deleted"}
