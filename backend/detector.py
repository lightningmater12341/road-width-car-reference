from io import BytesIO
from threading import Lock

from PIL import Image


class VehicleDetector:
    vehicle_labels = {"car", "motorcycle", "bus", "truck"}

    def __init__(self, model_name="yolo11n.pt"):
        self.model_name = model_name
        self._model = None
        self._lock = Lock()

    def _get_model(self):
        if self._model is None:
            from ultralytics import YOLO
            with self._lock:
                if self._model is None:
                    self._model = YOLO(self.model_name)
        return self._model

    def detect(self, image_bytes, confidence=0.25):
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        width, height = image.size
        results = self._get_model().predict(image, conf=confidence, verbose=False)
        detections = []
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls.item())
                label = result.names[class_id]
                if label not in self.vehicle_labels:
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append({
                    "label": label,
                    "confidence": round(float(box.conf.item()), 5),
                    "box": {
                        "x1": round(max(0, x1), 2),
                        "y1": round(max(0, y1), 2),
                        "x2": round(min(width, x2), 2),
                        "y2": round(min(height, y2), 2)
                    },
                    "area_ratio": round(max(0, x2 - x1) * max(0, y2 - y1) / (width * height), 5)
                })
        detections.sort(key=lambda item: item["confidence"] * item["area_ratio"], reverse=True)
        return {"image": {"width": width, "height": height}, "detections": detections}
