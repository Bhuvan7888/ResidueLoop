import logging
import uuid
from typing import Callable, Awaitable
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.routers.v1 import health, farmer, buyer, listing, offer
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
    allow_origins=["http://localhost:5173", "https://residueloop.example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request_id = str(uuid.uuid4())
        # Simplified logging for unit 1
        logging.info(f"[{request_id}] {request.method} {request.url.path}")
        response = await call_next(request)
        return response

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)
setup_exception_handlers(app)

app.include_router(health.router, prefix="/api/v1")
app.include_router(farmer.router, prefix="/api/v1")
app.include_router(buyer.router, prefix="/api/v1")
app.include_router(listing.router, prefix="/api/v1")
app.include_router(offer.router, prefix="/api/v1")
