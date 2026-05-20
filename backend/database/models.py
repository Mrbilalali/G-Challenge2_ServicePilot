from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database.connection import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String(50), primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=True)
    phone = Column(String(50), unique=True, index=True, nullable=True)
    role = Column(String(20), default="customer") # customer, provider, admin, support
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    provider_profile = relationship("Provider", back_populates="user", uselist=False)
    bookings_as_customer = relationship("Booking", back_populates="customer", foreign_keys="[Booking.customer_id]")
    notifications = relationship("Notification", back_populates="user")
    preferences = relationship("CustomerPreference", back_populates="customer", uselist=False)

class Provider(Base):
    __tablename__ = "providers"
    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    rating = Column(Float, default=4.7)
    review_count = Column(Integer, default=0)
    trust_score = Column(Float, default=50.0)
    cancellation_rate = Column(Float, default=0.0)
    base_rate = Column(Float, default=1000.0)
    experience_years = Column(Integer, default=1)
    on_time_score = Column(Float, default=0.9)
    reliability_score = Column(Float, default=90.0)
    customer_repeat_rate = Column(Float, default=0.1)
    response_time_minutes = Column(Integer, default=10)
    area = Column(String(100), nullable=True)
    is_verified = Column(Boolean, default=False)
    verified_status = Column(String(30), default="unverified")
    phone = Column(String(50), nullable=True)

    # Relationships
    user = relationship("User", back_populates="provider_profile")
    profile = relationship("ProviderProfile", back_populates="provider", uselist=False)
    listings = relationship("ProviderListing", back_populates="provider")
    bookings_as_provider = relationship("Booking", back_populates="provider", foreign_keys="[Booking.provider_id]")
    availability = relationship("ProviderAvailability", back_populates="provider")
    gallery = relationship("ProviderGallery", back_populates="provider")
    keywords = relationship("ProviderKeyword", back_populates="provider")
    verifications = relationship("ProviderVerification", back_populates="provider", uselist=False)
    reviews = relationship("Review", back_populates="provider", cascade="all, delete-orphan")

class ProviderProfile(Base):
    __tablename__ = "provider_profiles"
    id = Column(String(50), primary_key=True, index=True)
    provider_id = Column(String(50), ForeignKey("providers.id"), nullable=False)
    biography = Column(Text, nullable=True)
    certifications = Column(JSON, nullable=True) # list of certification strings
    profile_verified = Column(Boolean, default=False)

    provider = relationship("Provider", back_populates="profile")

class ServiceCategory(Base):
    __tablename__ = "service_categories"
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    base_rate_estimate = Column(Float, default=500.0)

    listings = relationship("ProviderListing", back_populates="category")

class ProviderListing(Base):
    __tablename__ = "provider_listings"
    id = Column(String(50), primary_key=True, index=True)
    provider_id = Column(String(50), ForeignKey("providers.id"), nullable=False)
    category_id = Column(String(50), ForeignKey("service_categories.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    pricing_packages = Column(JSON, nullable=True) # packages pricing details
    faqs = Column(JSON, nullable=True)

    provider = relationship("Provider", back_populates="listings")
    category = relationship("ServiceCategory", back_populates="listings")

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(String(50), primary_key=True, index=True)
    customer_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    provider_id = Column(String(50), ForeignKey("providers.id"), nullable=False)
    service_type = Column(String(100), nullable=False)
    location = Column(String(200), nullable=True)
    timing = Column(String(100), nullable=True)
    urgency = Column(String(20), default="Normal")
    status = Column(String(30), default="pending") # pending, accepted, confirmed, ongoing, completed, cancelled, recovered
    details = Column(Text, nullable=True)
    total_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("User", back_populates="bookings_as_customer", foreign_keys=[customer_id])
    provider = relationship("Provider", back_populates="bookings_as_provider", foreign_keys=[provider_id])
    status_logs = relationship("BookingStatusLog", back_populates="booking")
    payments = relationship("Payment", back_populates="booking")
    escrow_transactions = relationship("EscrowTransaction", back_populates="booking")
    reviews = relationship("Review", back_populates="booking")
    disputes = relationship("Dispute", back_populates="booking")
    ai_traces = relationship("AITraceLog", back_populates="booking")

class BookingStatusLog(Base):
    __tablename__ = "booking_status_logs"
    id = Column(String(50), primary_key=True, index=True)
    booking_id = Column(String(50), ForeignKey("bookings.id"), nullable=False)
    status = Column(String(30), nullable=False)
    changed_by = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="status_logs")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(String(50), primary_key=True, index=True)
    booking_id = Column(String(50), ForeignKey("bookings.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(30), default="pending") # pending, paid, refunded, failed
    method = Column(String(30), default="escrow")
    transaction_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="payments")

class EscrowTransaction(Base):
    __tablename__ = "escrow_transactions"
    id = Column(String(50), primary_key=True, index=True)
    booking_id = Column(String(50), ForeignKey("bookings.id"), nullable=False)
    customer_id = Column(String(50), nullable=False)
    provider_id = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(30), default="locked") # locked, released, refunded
    release_authorized = Column(Boolean, default=False)
    release_date = Column(DateTime, nullable=True)

    booking = relationship("Booking", back_populates="escrow_transactions")

class Review(Base):
    __tablename__ = "reviews"
    id = Column(String(50), primary_key=True, index=True)
    booking_id = Column(String(50), ForeignKey("bookings.id"), nullable=False)
    reviewer_id = Column(String(50), nullable=False)
    reviewee_id = Column(String(50), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    sentiment = Column(String(20), default="neutral")

    provider_id = Column(String(50), ForeignKey("providers.id"), nullable=True)
    booking = relationship("Booking", back_populates="reviews")
    provider = relationship("Provider", back_populates="reviews")

class ProviderAvailability(Base):
    __tablename__ = "provider_availability"
    id = Column(String(50), primary_key=True, index=True)
    provider_id = Column(String(50), ForeignKey("providers.id"), nullable=False)
    date = Column(String(30), nullable=False)
    slots = Column(JSON, nullable=True) # list of times like ["09:00", "14:00"]
    capacity_limit = Column(Integer, default=4)

    provider = relationship("Provider", back_populates="availability")

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    id = Column(String(50), primary_key=True, index=True)
    booking_id = Column(String(50), nullable=True)
    customer_id = Column(String(50), nullable=False)
    provider_id = Column(String(50), nullable=False)

    messages = relationship("Message", back_populates="chat_room")

class Message(Base):
    __tablename__ = "messages"
    id = Column(String(50), primary_key=True, index=True)
    chat_room_id = Column(String(50), ForeignKey("chat_rooms.id"), nullable=False)
    sender_id = Column(String(50), nullable=False)
    text = Column(Text, nullable=True)
    media_url = Column(String(200), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    chat_room = relationship("ChatRoom", back_populates="messages")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class AITraceLog(Base):
    __tablename__ = "ai_trace_logs"
    id = Column(String(50), primary_key=True, index=True)
    booking_id = Column(String(50), ForeignKey("bookings.id"), nullable=True)
    agent_name = Column(String(100), nullable=False)
    input_payload = Column(JSON, nullable=True)
    reasoning = Column(JSON, nullable=True) # list of reasoning logs
    output_payload = Column(JSON, nullable=True)
    status = Column(String(20), default="success")
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="ai_traces")

class Dispute(Base):
    __tablename__ = "disputes"
    id = Column(String(50), primary_key=True, index=True)
    booking_id = Column(String(50), ForeignKey("bookings.id"), nullable=False)
    initiator_id = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="open") # open, investigated, resolved
    resolution_details = Column(Text, nullable=True)

    booking = relationship("Booking", back_populates="disputes")

class ProviderVerification(Base):
    __tablename__ = "provider_verifications"
    id = Column(String(50), primary_key=True, index=True)
    provider_id = Column(String(50), ForeignKey("providers.id"), nullable=False)
    cnic_front_url = Column(String(200), nullable=True)
    cnic_back_url = Column(String(200), nullable=True)
    face_video_url = Column(String(200), nullable=True)
    liveness_status = Column(String(30), default="pending")
    trust_score = Column(Float, default=50.0)

    provider = relationship("Provider", back_populates="verifications")

class CustomerPreference(Base):
    __tablename__ = "customer_preferences"
    id = Column(String(50), primary_key=True, index=True)
    customer_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    service_interests = Column(JSON, nullable=True)
    max_distance_pref = Column(Float, default=15.0)

    customer = relationship("User", back_populates="preferences")

class ProviderKeyword(Base):
    __tablename__ = "provider_keywords"
    id = Column(String(50), primary_key=True, index=True)
    provider_id = Column(String(50), ForeignKey("providers.id"), nullable=False)
    keyword = Column(String(50), nullable=False)

    provider = relationship("Provider", back_populates="keywords")

class ProviderGallery(Base):
    __tablename__ = "provider_gallery"
    id = Column(String(50), primary_key=True, index=True)
    provider_id = Column(String(50), ForeignKey("providers.id"), nullable=False)
    image_url = Column(String(200), nullable=True)
    video_url = Column(String(200), nullable=True)

    provider = relationship("Provider", back_populates="gallery")
