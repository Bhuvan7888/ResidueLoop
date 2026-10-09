import os

# Settings are validated at import time, so test values must exist before the app loads.
for name, value in {
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role",
    "SUPABASE_JWT_SECRET": "test-jwt-secret-with-at-least-32-chars!",
    "DATABASE_URL": "postgresql://test:test@localhost:5432/test",
}.items():
    os.environ[name] = value
