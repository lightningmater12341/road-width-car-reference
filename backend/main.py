import os
import hashlib
import json
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from detector import VehicleDetector


model_name = os.getenv("YOLO_MODEL", "yolo11n.pt")
detector = VehicleDetector(model_name)
dataset_root = Path(os.getenv("DATASET_ROOT", Path(__file__).parent / "dataset"))
images_dir = dataset_root / "images"
labels_dir = dataset_root / "labels"
inbox_dir = dataset_root / "inbox"
for directory in (images_dir, labels_dir, inbox_dir):
    directory.mkdir(parents=True, exist_ok=True)
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


def validate_annotation(value):
    required = {"body_width_mm", "image_size_px", "chassis_points", "road_points"}
    if not required.issubset(value):
        raise HTTPException(422, "Annotation is missing required fields")
    if not 1000 <= float(value["body_width_mm"]) <= 2600:
        raise HTTPException(422, "Body width must be between 1000 and 2600 mm")
    for key in ("chassis_points", "road_points"):
        if len(value[key]) != 2 or any("x" not in point or "y" not in point for point in value[key]):
            raise HTTPException(422, f"{key} must contain exactly two x/y points")


@app.post("/api/annotations")
async def save_annotation(image: UploadFile = File(...), annotation: str = Form(...)):
    try:
        value = json.loads(annotation)
    except json.JSONDecodeError as error:
        raise HTTPException(422, "annotation must be valid JSON") from error
    validate_annotation(value)
    data = await image.read()
    if not data or len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "Image must be between 1 byte and 15 MB")
    digest = hashlib.sha256(data).hexdigest()
    existing = list(labels_dir.glob(f"{digest}-*.json"))
    if existing:
        return {"id": existing[0].stem, "duplicate": True}
    suffix = Path(image.filename or "image.jpg").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"
    record_id = f"{digest}-{uuid4().hex[:8]}"
    image_name = f"{record_id}{suffix}"
    (images_dir / image_name).write_bytes(data)
    value.update({
        "id": record_id,
        "image_file": image_name,
        "original_filename": image.filename,
        "sha256": digest
    })
    (labels_dir / f"{record_id}.json").write_text(json.dumps(value, indent=2), encoding="utf-8")
    return {"id": record_id, "duplicate": False}


@app.get("/api/dataset/stats")
def dataset_stats():
    return {
        "annotations": len(list(labels_dir.glob("*.json"))),
        "images": len(list(images_dir.iterdir())),
        "candidates": len(list(inbox_dir.glob("candidate-*.json")))
    }


@app.get("/api/candidates")
def candidates():
    records = []
    for path in sorted(inbox_dir.glob("candidate-*.json")):
        try:
            records.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue
    return records


@app.get("/api/candidates/{filename}")
def candidate_image(filename: str):
    safe_name = Path(filename).name
    path = inbox_dir / safe_name
    if not path.is_file():
        raise HTTPException(404, "Candidate image not found")
    return FileResponse(path)
