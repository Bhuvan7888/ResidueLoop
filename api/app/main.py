import logging
import uuid
from typing import Awaitable, Callable
from fastapi import FastAPI, Request, Response, Query, Header
from fastapi.responses import JSONResponse
import time
from collections import defaultdict
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.routers.v1 import buyer, charity, farmer, health, listing, offer, pickup, profile, whatsapp, heatmap, verification
from app.core.config import get_settings
from app.core.errors import setup_exception_handlers

# Validate settings at startup
get_settings()

app = FastAPI(
    title="ResidueLoop API",
    version="0.1.0",
    docs_url=None,  # Disabled in production
    redoc_url=None,
)

# Baseline Security Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["residueloop.in", "www.residueloop.in"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

# Simple in-memory rate limiter
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 60
request_counts: defaultdict[str, list[float]] = defaultdict(list)

MAX_BODY_SIZE = 1 * 1024 * 1024  # 1MB limit

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        
        # Check Content-Length for oversized body
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            return JSONResponse(status_code=413, content={"error": {"code": "payload_too_large", "message": "Request body too large"}})

        # Rate limiting logic
        now = time.time()
        # Clean up old requests
        request_counts[client_ip] = [t for t in request_counts[client_ip] if now - t < RATE_LIMIT_WINDOW]
        
        if len(request_counts[client_ip]) >= RATE_LIMIT_REQUESTS:
            return JSONResponse(status_code=429, content={"error": {"code": "too_many_requests", "message": "Rate limit exceeded"}})
            
        request_counts[client_ip].append(now)
        return await call_next(request)

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request_id = str(uuid.uuid4())
        # Simplified logging for unit 1
        logging.info(f"[{request_id}] {request.method} {request.url.path}")
        response = await call_next(request)
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://residueloop.in",
        "https://www.residueloop.in",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
setup_exception_handlers(app)

app.include_router(health.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(farmer.router, prefix="/api/v1")
app.include_router(buyer.router, prefix="/api/v1")
app.include_router(listing.router, prefix="/api/v1")
app.include_router(offer.router, prefix="/api/v1")
app.include_router(pickup.router, prefix="/api/v1")
app.include_router(charity.router, prefix="/api/v1")
app.include_router(whatsapp.router, prefix="/api/v1")
app.include_router(heatmap.router, prefix="/api/v1")
app.include_router(verification.router, prefix="/api/v1")


@app.get("/api/v1/webhooks/whatsapp")
def meta_webhook_get_alias(
    hub_mode: str = Query("", alias="hub.mode"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
    hub_challenge: str = Query("", alias="hub.challenge"),
):
    return whatsapp.verify_meta_webhook(hub_mode, hub_verify_token, hub_challenge)


@app.post("/api/v1/webhooks/whatsapp")
async def meta_webhook_post_alias(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None, alias="x-hub-signature-256"),
):
    return await whatsapp.inbound_webhook(request, x_hub_signature_256)
