from enum import StrEnum


class ListingStatus(StrEnum):
    OPEN = "open"
    MATCHED = "matched"
    POOLED = "pooled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OfferStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class PoolStatus(StrEnum):
    FORMING = "forming"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    RECEIVED = "received"
    NOT_RECEIVED = "not_received"


class IdStatus(StrEnum):
    NOT_SUBMITTED = "not_submitted"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class ListingSource(StrEnum):
    WEB = "web"
    WHATSAPP = "whatsapp"
