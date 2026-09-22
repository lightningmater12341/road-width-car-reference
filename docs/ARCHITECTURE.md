# System Architecture

## Goal

Estimate road width from a single road photograph using an identified vehicle as the absolute scale reference, while exposing assumptions and uncertainty.

## MVP architecture

```text
Browser image
    ↓
Manual car-body and road-edge points
    ↓
Vehicle lookup → mirror-excluded body width
    ↓
Local ratio + yaw correction
    ↓
Uncertainty engine and quality gates
    ↓
Annotated result + JSON export
```

The MVP is static HTML/CSS/JavaScript. It performs no uploads, needs no backend, and can be evaluated using controlled photographs immediately.

## Production architecture

### 1. Input and metadata

- Original image and EXIF focal-length/device data
- Optional device calibration profile
- Capture-quality checks: blur, resolution, horizon visibility, and extreme distortion

### 2. Vision inference

- Vehicle detector/instance segmentation
- Make/model classifier returning top-k candidates
- Vehicle landmark and 3D pose estimator
- Road/drivable-area segmentation
- Lane/kerb/road-boundary detector
- Vanishing-point and horizon estimator

### 3. Reference database

- Generation-aware Indian vehicle catalogue
- Separate body width, mirrors-folded width, and mirrors-open width
- Source provenance and effective dates
- Variant scope and facelift tracking
- Human verification workflow

### 4. Geometry service

- Lens-undistortion stage
- Camera intrinsics estimator
- Vehicle 3D pose fit
- Road-plane estimator
- Homography/inverse perspective mapping
- Absolute scale transfer from vehicle model to road plane

### 5. Confidence and rejection

- Propagate keypoint, pose, dimension, and boundary uncertainty
- Calibrate intervals against ground truth
- Reject images with ambiguous model, occlusion, excessive yaw, mismatched depth, missing road boundaries, or high distortion

### 6. User interface

- Show detected vehicle and allow correction
- Overlay the exact body and road points used
- Display width, interval, confidence, and warnings
- Preserve manual point editing as a fallback

## Suggested technology

- Research: Python, OpenCV, PyTorch, FastAPI
- Models: instance segmentation, fine-grained vehicle classifier, keypoint/pose network
- Data: PostgreSQL in production; SQLite for offline prototype
- Frontend: TypeScript/React or a mobile client
- Export: measurement JSON plus annotated image

## API sketch

```text
POST /v1/measurements
  image
  optional_vehicle_model_id
  optional_camera_profile_id

GET /v1/measurements/{id}
  detected vehicle candidates
  geometry features
  estimated width and interval
  warnings and rejection reasons

GET /v1/vehicles/search?q=
  generation-aware vehicle matches
```

## Development phases

1. Validate manual ratio estimator on controlled photographs.
2. Add automated road boundary and vehicle segmentation.
3. Add model classification with user confirmation.
4. Add landmarks, calibration, and pose-aware ground-plane geometry.
5. Train and calibrate confidence on measured Indian-road scenes.
6. Package as mobile/web application.

