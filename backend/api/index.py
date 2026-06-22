# Vercel's zero-config Python runtime treats any file under api/ as a
# serverless function entrypoint. main.py stays at the backend/ root so local
# `uvicorn main:app --reload` keeps working unchanged; this just re-exports
# the same FastAPI app for Vercel to find.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: E402,F401
