from database import SessionLocal
from app_models import User, PendingInspector, ApprovedInspector

def check_inspectors():
    db = SessionLocal()
    try:
        print("\n--- USERS (Inspectors) ---")
        users = db.query(User).filter(User.role == "INSPECTOR").all()
        for u in users:
            print(f"ID: {u.id} | Name: {u.name} | Approved: {u.is_approved} | Dept (User Table): {u.department}")

        print("\n--- PENDING INSPECTORS ---")
        pending = db.query(PendingInspector).all()
        for p in pending:
            print(f"User ID: {p.user_id} | Name: {p.name} | Dept: {p.department}")

        print("\n--- APPROVED INSPECTORS ---")
        approved = db.query(ApprovedInspector).all()
        for a in approved:
            print(f"User ID: {a.user_id} | Name: {a.name} | Dept: {a.department}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_inspectors()
