# Roadmap

## Version 0.2 — current

- Manual four-point measurement
- Mirror-excluded vehicle-width lookup
- Custom width input
- First-order yaw correction
- Depth and line-alignment diagnostics
- Uncertainty interval and confidence warnings
- Synthetic test scene and automated geometry tests

## Version 0.3 — controlled field validation

- Collect 20–50 original road photographs with measured ground truth
- Add image-level validation manifest
- Calculate mean absolute error and mean absolute percentage error
- Replace heuristic uncertainty constants with fitted values
- Add rejection thresholds derived from observed error

## Version 0.4 — assisted detection

- Suggest car and road-body endpoints using segmentation
- Preserve manual correction
- Read EXIF focal length and camera model
- Detect image resizing and missing metadata

## Version 0.5 — automatic vehicle reference

- Detect the vehicle
- Rank make/model candidates
- Require user confirmation when model confidence is low
- Estimate semantic vehicle keypoints and yaw
- Query the generation-aware dimensions database

## Version 0.6 — calibrated road plane

- Camera undistortion
- Horizon and vanishing-point estimation
- Tyre-contact point detection
- Road-plane homography
- Pose-aware transfer of body-width scale to the road plane

## Release target

A mobile-friendly application that returns road width, a calibrated 95% interval, visible evidence points, and a rejection reason when the image cannot support a reliable measurement.
