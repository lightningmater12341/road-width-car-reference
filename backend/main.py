import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from detector import VehicleDetector


model_name = os.getenv("YOLO_MODEL", "yolo11n.pt")
detector = VehicleDetector(model_name)
app = FastAPI(title="Road Width Vehicle Detector", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5500", "http://localhost:8080"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)


@app.get("/health")
def health():
    return {"status": "ok", "model": model_name}


@app.post("/api/detect-vehicles")
async def detect_vehicles(image: UploadFile = File(...), confidence: float = 0.25):
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Upload a JPEG, PNG, or WebP image")
    if not 0.05 <= confidence <= 0.95:
        raise HTTPException(422, "confidence must be between 0.05 and 0.95")
    data = await image.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "Image must be smaller than 15 MB")
    try:
        return detector.detect(data, confidence)
    except Exception as error:
        raise HTTPException(400, f"Could not process image: {error}") from error
