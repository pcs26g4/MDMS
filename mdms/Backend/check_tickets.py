from database import SessionLocal
from app_models import Ticket, SubTicket

def check_tickets():
    db = SessionLocal()
    try:
        print("\n--- SUB TICKETS (Individual Issues) ---")
        sub_tickets = db.query(SubTicket).all()
        for s in sub_tickets:
            print(f"SubID: {s.sub_id} | Type: {s.issue_type} | Status: {s.status} | Resolved At: {s.resolved_at}")

        print("\n--- PARENT TICKETS (Location Based) ---")
        tickets = db.query(Ticket).all()
        for t in tickets:
            print(f"TicketID: {t.ticket_id} | Status: {t.status} | Resolved At: {t.resolved_at}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_tickets()
