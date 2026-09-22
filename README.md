# Road Width Estimator — Car Reference MVP

This browser-based prototype estimates road width from one photograph by using a known, mirror-excluded vehicle body width as the scale reference.

It now includes an optional YOLO-assisted workflow. A local FastAPI backend detects vehicles and ranks possible reference cars, while exact model confirmation and chassis endpoints remain manual for reliability.

## What works

- Load a road photograph locally in the browser.
- Select a car from a starter Indian-market dimensions database or enter a custom width.
- Click the car body's left and right edges, excluding mirrors.
- Click the road's left and right edges at the same image depth as the car-width line.
- Apply an approximate vehicle-yaw correction.
- Receive a road-width estimate, 95% uncertainty interval, confidence score, and warnings.
- Inspect pixel scale, depth mismatch, line alignment, and yaw diagnostics.
- Load a one-click 5.40 m synthetic demonstration.
- Export the measurement and clicked points as JSON.
- Detect cars automatically with a pretrained YOLO model.
- Preview detected car crops and select the best reference vehicle.
- Save completed measurements as image/annotation training pairs.
- Review a locally sourced queue of openly licensed candidate photographs.

When YOLO detection is enabled, the photograph is sent only to the locally running backend.

## Run

Serve the directory locally:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Run with YOLO detection

Start the API in one terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Serve the frontend on a different port in another terminal:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. The YOLO weights download automatically on the first detection. The current pretrained model detects vehicle categories such as car and truck; it does not identify the exact make, model, generation, or mirror-excluded chassis edges.

## Source the first 100 candidate photographs

With the backend environment active:

```bash
python source_commons.py --count 100
```

The script searches Wikimedia Commons for Indian roads and common Indian vehicles, keeps landscape images with reusable licences, downloads display-sized copies, and stores the source URL, creator, licence and credit beside each image. Review is still mandatory: skip irrelevant images, confirm the exact vehicle, mark the four points, and press **Save training example**.

Downloaded candidates and annotations stay in `backend/dataset/` and are excluded from Git because photographs and local training data should not be committed blindly.

For a quick check, load `sample/synthetic-road.svg`, choose a custom car width of
1800 mm, and click the labelled orange and blue endpoints. The expected result
is approximately 5.40 m.

## Recommended photograph conditions

- Rear or front of one car clearly visible.
- Car yaw within approximately ±15°.
- Both road boundaries visible.
- Road-width endpoints selected at the same depth as the car-width reference.
- Photograph taken without panorama, digital stretching, or ultra-wide correction.
- Car body edges selected without mirrors, open doors, shadows, or protruding accessories.

## Formula used by the MVP

For a near-frontal/rear view and locally constant perspective scale:

```text
road_width = reference_car_width × cos(yaw) × road_pixel_width / car_pixel_width
```

The result is not a certified survey measurement. See `docs/GEOMETRY.md` for assumptions and the upgrade path.

## Tests

```bash
node --test tests/geometry.test.mjs
```

Or use:

```bash
npm test
```

## Project layout

```text
index.html                  Browser application
assets/styles.css           Interface styling
src/app.js                  Canvas interaction and UI
src/geometry.mjs            Measurement and uncertainty engine
backend/main.py             FastAPI upload and detection endpoint
backend/detector.py         Lazy-loaded YOLO vehicle detector
backend/tests/              Detector unit tests
backend/source_commons.py   Open-licence candidate image sourcer
data/cars-india-starter.json Starter vehicle database
data/schema.sql             Production database schema
docs/ARCHITECTURE.md        Full system architecture
docs/GEOMETRY.md            Mathematical method and limitations
docs/DATA_SOURCING.md       Vehicle data acquisition and QA plan
tests/geometry.test.mjs     Automated geometry tests
sample/synthetic-road.svg   Labelled 5.40 m geometry test scene
.github/workflows/test.yml  GitHub Actions validation
ROADMAP.md                  Planned automation and validation work
```

## Next milestone

Replace manual selection with automatic modules while preserving the manual fallback:

1. Make/model classification with top-k user confirmation.
2. Chassis segmentation and vehicle keypoints.
3. Vehicle keypoints and 3D pose estimation.
4. Road-edge or drivable-area segmentation.
5. Camera calibration or EXIF-based intrinsics.
6. Homography/ground-plane fitting and calibrated uncertainty.
