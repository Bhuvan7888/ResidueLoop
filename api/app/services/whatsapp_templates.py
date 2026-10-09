"""Fixed Punjabi replies. Answers are filled from database values, never written by a model.

Every string here needs a native-speaker review before production (listed in progress-tracker.md).
"""

from app.core.enums import PaymentStatus

PAYMENT_STATUS_LABELS = {
    PaymentStatus.PENDING: "ਬਾਕੀ",
    PaymentStatus.RECEIVED: "ਮਿਲ ਗਿਆ",
    PaymentStatus.NOT_RECEIVED: "ਨਹੀਂ ਮਿਲਿਆ",
}

TEMPLATES = {
    "unknown_number": "ਇਹ ਨੰਬਰ ਰੈਜ਼ੀਡਿਊਲੂਪ ਵਿੱਚ ਦਰਜ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਐਪ ਵਿੱਚ ਇਸ ਨੰਬਰ ਨਾਲ ਰਜਿਸਟਰ ਕਰੋ।",
    "farmers_only": "ਇਹ ਸੇਵਾ ਸਿਰਫ਼ ਕਿਸਾਨਾਂ ਲਈ ਹੈ।",
    "clarify": "ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਲਿਖੋ, ਜਿਵੇਂ: '4 ਏਕੜ, ਵਾਢੀ 2026-10-20'।",
    "too_long": "ਸੁਨੇਹਾ ਬਹੁਤ ਲੰਮਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਛੋਟਾ ਲਿਖੋ।",
    "error": "ਕੁਝ ਗਲਤ ਹੋ ਗਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਬਾਅਦ ਵਿੱਚ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    "need_date": "ਵਾਢੀ ਦੀ ਤਾਰੀਖ਼ ਦੱਸੋ, ਜਿਵੇਂ: 2026-10-20।",
    "need_acres": "ਕਿੰਨੇ ਏਕੜ ਦੀ ਪਰਾਲੀ ਹੈ? ਜਿਵੇਂ: 4 ਏਕੜ।",
    "no_plot": "ਤੁਹਾਡਾ ਕੋਈ ਪਲਾਟ ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਐਪ ਵਿੱਚ ਪਲਾਟ ਜੋੜੋ।",
    "which_plot": "ਇਸ ਏਕੜ ਦਾ ਕੋਈ ਪਲਾਟ ਨਹੀਂ ਮਿਲਿਆ। ਆਪਣੇ ਪਲਾਟ ਦੇ ਏਕੜ ਲਿਖੋ।",
    "not_verified": "ਲਿਸਟਿੰਗ ਬਣਾਉਣ ਲਈ ਪਹਿਲਾਂ ਐਪ ਵਿੱਚ ਆਪਣੀ ਆਈਡੀ ਵੈਰੀਫ਼ਾਈ ਕਰੋ।",
    "listing_with_offer": (
        "ਲਿਸਟਿੰਗ ਬਣ ਗਈ। ਅੰਦਾਜ਼ਨ {tonnes} ਟਨ। ਪੇਸ਼ਕਸ਼: ₹{price} ਪ੍ਰਤੀ ਟਨ, ਪਿਕਅੱਪ {date} ਦੇ ਆਸ-ਪਾਸ। "
        "ਮਨਜ਼ੂਰ ਕਰਨ ਲਈ 'ਹਾਂ' ਲਿਖੋ।"
    ),
    "listing_no_offer": "ਲਿਸਟਿੰਗ ਬਣ ਗਈ। ਅੰਦਾਜ਼ਨ {tonnes} ਟਨ। ਅਜੇ ਕੋਈ ਖਰੀਦਦਾਰ ਨਹੀਂ ਮਿਲਿਆ।",
    "no_pending_offer": "ਮਨਜ਼ੂਰ ਕਰਨ ਲਈ ਕੋਈ ਪੇਸ਼ਕਸ਼ ਨਹੀਂ ਹੈ।",
    "offer_accepted": "ਪੇਸ਼ਕਸ਼ ਮਨਜ਼ੂਰ ਹੋ ਗਈ। ਪੂਲ: {target} ਟਨ ਵਿੱਚੋਂ {current} ਟਨ ਭਰਿਆ ਹੈ।",
    "pickup_date": "ਤੁਹਾਡਾ ਪਿਕਅੱਪ {date} ਨੂੰ ਹੈ।",
    "pickup_date_pending": "ਪਿਕਅੱਪ ਦੀ ਤਾਰੀਖ਼ ਅਜੇ ਤੈਅ ਨਹੀਂ ਹੋਈ। ਪੂਲ ਨੂੰ ਹੋਰ ਟਨ ਚਾਹੀਦੇ ਹਨ।",
    "no_pool": "ਤੁਹਾਡੀ ਕੋਈ ਲਿਸਟਿੰਗ ਅਜੇ ਪੂਲ ਵਿੱਚ ਨਹੀਂ ਹੈ।",
    "pool_progress": "ਪੂਲ: {target} ਟਨ ਵਿੱਚੋਂ {current} ਟਨ ਭਰਿਆ ਹੈ। ਹੋਰ {needed} ਟਨ ਚਾਹੀਦੇ ਹਨ।",
    "pool_full": "ਪੂਲ ਪੂਰਾ ਹੈ ({current} ਟਨ)। ਪਿਕਅੱਪ {date} ਨੂੰ ਹੈ।",
    "no_pickup": "ਤੁਹਾਡਾ ਕੋਈ ਪਿਕਅੱਪ ਨਹੀਂ ਮਿਲਿਆ।",
    "not_weighed": "ਅਜੇ ਵਜ਼ਨ ਦਰਜ ਨਹੀਂ ਹੋਇਆ।",
    "payment_status": "ਭੁਗਤਾਨ ਦੀ ਸਥਿਤੀ: {status}। ਬਣਦੀ ਰਕਮ: ₹{amount}।",
    "need_payment_status": "ਭੁਗਤਾਨ ਮਿਲਿਆ ਹੈ ਜਾਂ ਨਹੀਂ? 'RECEIVED' ਜਾਂ 'NOT RECEIVED' ਲਿਖੋ।",
    "payment_updated": "ਭੁਗਤਾਨ ਦੀ ਸਥਿਤੀ '{status}' ਕਰ ਦਿੱਤੀ ਗਈ।",
    "support_unavailable": "NGO ਸਹਾਇਤਾ ਦੀ ਬੇਨਤੀ ਅਜੇ ਇਸ ਚੈਟ ਵਿੱਚ ਉਪਲਬਧ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਐਪ ਵਿੱਚ ਕਰੋ।",
}


def render(key: str, **values: object) -> str:
    return TEMPLATES[key].format(**values)
