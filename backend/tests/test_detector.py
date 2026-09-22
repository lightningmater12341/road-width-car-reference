from io import BytesIO
from unittest.mock import MagicMock

from PIL import Image

from detector import VehicleDetector


def test_vehicle_filtering_and_sorting():
    image_buffer = BytesIO()
    Image.new("RGB", (1000, 500)).save(image_buffer, format="JPEG")
    result = MagicMock()
    result.names = {0: "person", 2: "car", 7: "truck"}

    person = MagicMock()
    person.cls.item.return_value = 0
    person.conf.item.return_value = 0.99
    person.xyxy.__getitem__.return_value.tolist.return_value = [1, 1, 50, 100]

    car = MagicMock()
    car.cls.item.return_value = 2
    car.conf.item.return_value = 0.8
    car.xyxy.__getitem__.return_value.tolist.return_value = [100, 100, 600, 400]

    truck = MagicMock()
    truck.cls.item.return_value = 7
    truck.conf.item.return_value = 0.9
    truck.xyxy.__getitem__.return_value.tolist.return_value = [700, 100, 900, 300]

    result.boxes = [person, truck, car]
    model = MagicMock()
    model.predict.return_value = [result]
    detector = VehicleDetector()
    detector._model = model

    output = detector.detect(image_buffer.getvalue())

    assert output["image"] == {"width": 1000, "height": 500}
    assert [item["label"] for item in output["detections"]] == ["car", "truck"]
