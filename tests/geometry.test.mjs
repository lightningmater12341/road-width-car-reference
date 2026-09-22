import test from "node:test";
import assert from "node:assert/strict";
import { acuteAngleDifferenceDeg, distance, estimateRoadWidth, lineAngleDeg } from "../src/geometry.mjs";

test("distance computes Euclidean pixel length", () => {
  assert.equal(distance({x: 0, y: 0}, {x: 3, y: 4}), 5);
});

test("line helpers normalize orientation differences", () => {
  assert.equal(lineAngleDeg({x: 0, y: 0}, {x: 5, y: 0}), 0);
  assert.equal(acuteAngleDifferenceDeg(175, -175), 10);
});

test("ratio estimator recovers a 5.4 metre road", () => {
  const result = estimateRoadWidth({
    carLeft: {x: 300, y: 500},
    carRight: {x: 600, y: 500},
    roadLeft: {x: 0, y: 500},
    roadRight: {x: 900, y: 500},
    carWidthMm: 1800,
    imageHeightPx: 800,
    yawDeg: 0
  });
  assert.equal(result.widthMm, 5400);
  assert.equal(result.depthMismatchRatio, 0);
});

test("yaw correction reduces the estimated road width by cos yaw", () => {
  const straight = estimateRoadWidth({
    carLeft: {x: 100, y: 300}, carRight: {x: 300, y: 300},
    roadLeft: {x: 0, y: 300}, roadRight: {x: 600, y: 300},
    carWidthMm: 1800, imageHeightPx: 600, yawDeg: 0
  });
  const angled = estimateRoadWidth({
    carLeft: {x: 100, y: 300}, carRight: {x: 300, y: 300},
    roadLeft: {x: 0, y: 300}, roadRight: {x: 600, y: 300},
    carWidthMm: 1800, imageHeightPx: 600, yawDeg: 30
  });
  assert.ok(Math.abs(angled.widthMm / straight.widthMm - Math.cos(Math.PI / 6)) < 1e-12);
});

test("depth mismatch produces a warning and wider uncertainty", () => {
  const aligned = estimateRoadWidth({
    carLeft: {x: 100, y: 300}, carRight: {x: 300, y: 300},
    roadLeft: {x: 0, y: 300}, roadRight: {x: 600, y: 300},
    carWidthMm: 1800, imageHeightPx: 600
  });
  const mismatched = estimateRoadWidth({
    carLeft: {x: 100, y: 300}, carRight: {x: 300, y: 300},
    roadLeft: {x: 0, y: 360}, roadRight: {x: 600, y: 360},
    carWidthMm: 1800, imageHeightPx: 600
  });
  assert.ok(mismatched.relativeSigma > aligned.relativeSigma);
  assert.ok(mismatched.warnings.some(message => message.includes("same image depth")));
});

test("non-parallel references produce an alignment warning", () => {
  const result = estimateRoadWidth({
    carLeft: {x: 100, y: 300}, carRight: {x: 300, y: 300},
    roadLeft: {x: 0, y: 260}, roadRight: {x: 600, y: 340},
    carWidthMm: 1800, imageHeightPx: 600
  });
  assert.ok(result.alignmentAngleDeg > 5);
  assert.ok(result.warnings.some(message => message.includes("not parallel")));
});

test("invalid reference width is rejected", () => {
  assert.throws(() => estimateRoadWidth({
    carLeft: {x: 0, y: 0}, carRight: {x: 100, y: 0},
    roadLeft: {x: 0, y: 0}, roadRight: {x: 200, y: 0},
    carWidthMm: 0, imageHeightPx: 500
  }), /positive/);
});
