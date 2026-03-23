"""
SyncLyst - FastAPI backend.
API-first, headless product onboarding from images.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import vision, products, audit, shopify, feedback, ucp, integrations, usage, billing


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Shutdown: close pools, etc. if needed


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        description="Multimodal product onboarding: image → structured data → omnichannel sync",
        version="0.1.0",
        lifespan=lifespan,
    )
    # Browsers forbid Access-Control-Allow-Origin: * together with credentials.
    # We keep credentials for explicit origin lists; with wildcard, use credentials=False
    # (Bearer tokens in Authorization still work).
    _cors_origins = settings.get_cors_origins_list()
    _cors_credentials = False if _cors_origins == ["*"] else True
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=_cors_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        """Return 500 with a clear message instead of unhandled exception."""
        from fastapi.responses import JSONResponse
        from fastapi import HTTPException
        if isinstance(exc, HTTPException):
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        detail = str(exc) if str(exc) else "Internal server error"
        return JSONResponse(status_code=500, content={"detail": detail})

    app.include_router(vision.router, prefix="/api/v1/vision", tags=["Vision"])
    app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
    app.include_router(shopify.router, prefix="/api/v1/shopify", tags=["Shopify"])
    app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["Feedback"])
    app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])
    app.include_router(integrations.router, prefix="/api/v1/integrations", tags=["Integrations"])
    app.include_router(ucp.router, prefix="/.well-known/ucp", tags=["UCP", "GEO"])
    app.include_router(usage.router, prefix="/api/v1/usage", tags=["Usage"])
    app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])
    return app


app = create_app()


@app.get("/health")
def health():
    from app.config import get_settings
    s = get_settings()
    shopify_configured = bool(s.shopify_client_id and s.shopify_client_secret)
    return {
        "status": "ok",
        "service": "synclyst",
        "shopify_configured": shopify_configured,
    }
