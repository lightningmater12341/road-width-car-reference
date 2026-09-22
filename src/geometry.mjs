export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lineAngleDeg(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
}

export function acuteAngleDifferenceDeg(first, second) {
  let difference = Math.abs(first - second) % 180;
  if (difference > 90) difference = 180 - difference;
  return difference;
}

export function estimateRoadWidth(input) {
  const {
    carLeft,
    carRight,
    roadLeft,
    roadRight,
    carWidthMm,
    imageHeightPx,
    yawDeg = 0,
    pointSigmaPx = 3,
    yawSigmaDeg = 3,
    referenceRelativeSigma = 0.005
  } = input;

  const carPixels = distance(carLeft, carRight);
  const roadPixels = distance(roadLeft, roadRight);
  if (!Number.isFinite(carWidthMm) || carWidthMm <= 0) throw new Error("Car width must be positive.");
  if (carPixels < 2 || roadPixels < 2) throw new Error("Selected lines are too short.");
  if (!Number.isFinite(imageHeightPx) || imageHeightPx <= 0) throw new Error("Image height must be positive.");
  if (Math.abs(yawDeg) >= 60) throw new Error("Yaw must remain below 60 degrees for this model.");

  const yawRad = yawDeg * Math.PI / 180;
  const yawFactor = Math.cos(yawRad);
  const widthMm = carWidthMm * yawFactor * roadPixels / carPixels;

  const carMid = midpoint(carLeft, carRight);
  const roadMid = midpoint(roadLeft, roadRight);
  const depthMismatchRatio = Math.abs(carMid.y - roadMid.y) / imageHeightPx;
  const carLineAngleDeg = lineAngleDeg(carLeft, carRight);
  const roadLineAngleDeg = lineAngleDeg(roadLeft, roadRight);
  const alignmentAngleDeg = acuteAngleDifferenceDeg(carLineAngleDeg, roadLineAngleDeg);

  const carPixelRelativeSigma = Math.SQRT2 * pointSigmaPx / carPixels;
  const roadPixelRelativeSigma = Math.SQRT2 * pointSigmaPx / roadPixels;
  const yawRelativeSigma = Math.abs(Math.tan(yawRad)) * yawSigmaDeg * Math.PI / 180;
  const perspectiveRelativeSigma = 0.025 + 0.8 * depthMismatchRatio + 0.0015 * Math.abs(yawDeg) + 0.002 * alignmentAngleDeg;

  const relativeSigma = Math.sqrt(
    referenceRelativeSigma ** 2 +
    carPixelRelativeSigma ** 2 +
    roadPixelRelativeSigma ** 2 +
    yawRelativeSigma ** 2 +
    perspectiveRelativeSigma ** 2
  );

  const sigmaMm = widthMm * relativeSigma;
  const lower95Mm = Math.max(0, widthMm - 1.96 * sigmaMm);
  const upper95Mm = widthMm + 1.96 * sigmaMm;
  const relativeHalfInterval = 1.96 * relativeSigma;
  const confidence = Math.round(clamp(100 * (1 - relativeHalfInterval / 0.35), 5, 98));

  const warnings = [];
  if (depthMismatchRatio > 0.025) warnings.push("Road endpoints are not at the same image depth as the car reference.");
  if (alignmentAngleDeg > 5) warnings.push("Car and road reference lines are not parallel in the image.");
  if (Math.abs(yawDeg) > 15) warnings.push("Vehicle yaw is high; the cosine correction is only a first-order approximation.");
  if (carPixels < 80) warnings.push("The car reference is small in the image, increasing point-selection error.");
  if (relativeHalfInterval > 0.15) warnings.push("The 95% interval exceeds ±15%; use a straighter, closer photograph.");

  return {
    widthMm,
    lower95Mm,
    upper95Mm,
    sigmaMm,
    relativeSigma,
    confidence,
    carPixels,
    roadPixels,
    yawFactor,
    depthMismatchRatio,
    carLineAngleDeg,
    roadLineAngleDeg,
    alignmentAngleDeg,
    warnings
  };
}
