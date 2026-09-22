# Geometry and Measurement Model

## 1. What can and cannot be recovered from one image

A monocular photograph contains projective coordinates, not absolute metres. Absolute road width is underdetermined until at least one real-world scale constraint is introduced. This project uses a recognised car's mirror-excluded body width as that constraint.

The reference is still insufficient for arbitrary photographs because:

- the vehicle body-width endpoints are above the road plane;
- the vehicle may have yaw, pitch, or roll;
- the reference line and road-width line may be at different depths;
- lens distortion changes the apparent geometry;
- a bounding box may include mirrors, shadows, or background.

The MVP therefore enforces a constrained image-capture protocol and reports uncertainty rather than presenting the result as survey grade.

## 2. MVP estimator

Let:

- `Wc` be the known mirror-excluded car body width;
- `pc` be the clicked car-body width in pixels;
- `pr` be the clicked road width in pixels at the same image depth;
- `θ` be estimated vehicle yaw relative to a direct front/rear view.

The first-order estimator is:

```text
Wr = Wc × cos(θ) × pr / pc
```

The cosine factor follows the approximation `pc ≈ s Wc cos(θ)`, where `s` is the local pixel scale. This approximation breaks down when the visible vehicle side materially contributes to the selected silhouette.

## 3. Depth alignment

The road-width line must cross the road at the same image depth as the car reference. In the UI this means the midpoint y-coordinates should nearly match. The engine calculates:

```text
depth_mismatch = abs(y_car_mid - y_road_mid) / image_height
```

Mismatch is converted into an uncertainty penalty and a visible warning.

## 4. Uncertainty calculation

The MVP combines independent relative 1σ components by root-sum-square:

```text
σrel² = σreference²
      + (√2 σpoint / pc)²
      + (√2 σpoint / pr)²
      + (tan(θ) σθ)²
      + σperspective²
```

where angular uncertainty is converted to radians and:

```text
σperspective = 0.025 + 0.8 × depth_mismatch + 0.0015 × abs(yaw_degrees)
```

The perspective term is currently a conservative engineering heuristic. It must later be calibrated against a labelled validation dataset.

The displayed interval is:

```text
Wr ± 1.96 × Wr × σrel
```

## 5. Production geometry upgrade

### Camera calibration

Estimate the camera intrinsic matrix and radial/tangential distortion coefficients. Undistort every input before feature extraction. If the camera model is known, a stored calibration profile may be reused; otherwise guide the user through a checkerboard or road-scene calibration.

### Vehicle pose

Detect semantic keypoints such as lamps, wheels, bumper corners, windscreen corners, and number-plate corners. Match them to a canonical 3D vehicle model or a coarse make/model template and solve for pose. Pose uncertainty must propagate into width uncertainty.

### Ground plane

Fit the road plane using lane boundaries, kerbs, semantic road masks, vanishing points, and tyre-road contact points. Compute an inverse-perspective mapping only after validating that the selected features belong to one approximately planar surface.

### Scale transfer

The vehicle body width exists above the road plane, so production scale transfer should project a pose-aware 3D vehicle model into the calibrated camera rather than pretending the roof/body line lies on the road. Tyre contact points provide the bridge to the road plane.

### Multi-frame option

If the input can be a short video instead of one image, structure-from-motion and temporal tracking can greatly improve stability and reject bad frames.

## 6. Validation protocol

Collect at least 200 scenes spanning:

- 2.5–12 m road widths;
- 10–50 m camera-to-car distances;
- daylight, dusk, rain, and shadows;
- different phone focal lengths;
- yaw bins of 0–5°, 5–10°, 10–15°, and 15–25°;
- hatchbacks, sedans, SUVs, and MPVs.

Measure ground truth with a laser distance meter or surveyed reference. Report median absolute error, mean absolute percentage error, 95th-percentile error, coverage of the stated 95% interval, and failure/rejection rate.

## References

- OpenCV camera calibration and 3D reconstruction: https://docs.opencv.org/4.x/d9/d0c/group__calib3d.html
- OpenCV camera-calibration tutorial: https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html
- OpenCV homography tutorial: https://docs.opencv.org/4.x/d9/dab/tutorial_homography.html

