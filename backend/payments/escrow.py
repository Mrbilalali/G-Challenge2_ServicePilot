from datetime import datetime
from database.connection import SessionLocal
from database import models

def deposit_to_escrow(booking_id: str, customer_id: str, provider_id: str, amount: float) -> bool:
    db = SessionLocal()
    try:
        # Create escrow transaction entry
        escrow = models.EscrowTransaction(
            id=f"esc_{booking_id}_{datetime.utcnow().microsecond}",
            booking_id=booking_id,
            customer_id=customer_id,
            provider_id=provider_id,
            amount=amount,
            status="locked",
            release_authorized=False
        )
        db.add(escrow)
        
        # Log payment advance deposit
        payment = models.Payment(
            id=f"pay_{booking_id}_{datetime.utcnow().microsecond}",
            booking_id=booking_id,
            amount=amount,
            status="paid",
            method="escrow",
            transaction_id=f"ch_{booking_id[:6]}"
        )
        db.add(payment)
        db.commit()
        return True
    except Exception as e:
        print(f"Escrow deposit failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def release_escrow(booking_id: str) -> bool:
    db = SessionLocal()
    try:
        escrow = db.query(models.EscrowTransaction).filter(
            models.EscrowTransaction.booking_id == booking_id,
            models.EscrowTransaction.status == "locked"
        ).first()
        if not escrow:
            return False
        
        escrow.status = "released"
        escrow.release_authorized = True
        escrow.release_date = datetime.utcnow()
        
        # Advance booking status
        booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
        if booking:
            booking.status = "completed"
            
        db.commit()
        return True
    except Exception as e:
        print(f"Escrow release failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def refund_escrow(booking_id: str) -> bool:
    db = SessionLocal()
    try:
        escrow = db.query(models.EscrowTransaction).filter(
            models.EscrowTransaction.booking_id == booking_id,
            models.EscrowTransaction.status == "locked"
        ).first()
        if not escrow:
            return False
        
        escrow.status = "refunded"
        escrow.release_authorized = False
        escrow.release_date = datetime.utcnow()
        
        # Update payment entry status
        payment = db.query(models.Payment).filter(
            models.Payment.booking_id == booking_id,
            models.Payment.status == "paid"
        ).first()
        if payment:
            payment.status = "refunded"
            
        db.commit()
        return True
    except Exception as e:
        print(f"Escrow refund failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()
