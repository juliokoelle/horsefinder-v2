from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.events import router as events_router

app = FastAPI(title="HorseFinder API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(events_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
