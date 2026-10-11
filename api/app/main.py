import logging
import uuid
from typing import Awaitable, Callable
from fastapi import FastAPI, Request, Response
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
    TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "residueloop.example.com"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://residueloop.example.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
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
