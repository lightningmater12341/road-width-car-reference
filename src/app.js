import { estimateRoadWidth } from "./geometry.mjs";

const canvas = document.querySelector("#photoCanvas");
const ctx = canvas.getContext("2d");
const imageInput = document.querySelector("#imageInput");
const carSelect = document.querySelector("#carSelect");
const carSearch = document.querySelector("#carSearch");
const customWidth = document.querySelector("#customWidth");
const yawAngle = document.querySelector("#yawAngle");
const pointSigma = document.querySelector("#pointSigma");
const yawSigma = document.querySelector("#yawSigma");
const steps = [...document.querySelectorAll("#steps li")];
const emptyState = document.querySelector("#emptyState");
const roadWidth = document.querySelector("#roadWidth");
const interval = document.querySelector("#interval");
const confidence = document.querySelector("#confidence");
const confidenceBar = document.querySelector("#confidenceBar");
const warnings = document.querySelector("#warnings");
const exportButton = document.querySelector("#exportButton");
const demoButton = document.querySelector("#demoButton");
const diagnostics = document.querySelector("#diagnostics");

let cars = [];
let filteredCars = [];
let image = null;
let points = [];
let result = null;

async function loadCars() {
  const response = await fetch("data/cars-india-starter.json");
  cars = await response.json();
  filteredCars = cars;
  renderCars();
}

function renderCars() {
  const previous = carSelect.value;
  carSelect.innerHTML = filteredCars.map(car =>
    `<option value="${car.id}">${car.make} ${car.model} — ${car.width_mm} mm</option>`
  ).join("");
  if (filteredCars.some(car => car.id === previous)) carSelect.value = previous;
  syncSelectedCar();
}

function syncSelectedCar() {
  const car = cars.find(item => item.id === carSelect.value);
  if (car) customWidth.value = car.width_mm;
  calculate();
}

carSearch.addEventListener("input", () => {
  const query = carSearch.value.trim().toLowerCase();
  filteredCars = cars.filter(car => `${car.make} ${car.model}`.toLowerCase().includes(query));
  renderCars();
});

carSelect.addEventListener("change", syncSelectedCar);
[customWidth, yawAngle, pointSigma, yawSigma].forEach(element => element.addEventListener("input", calculate));

imageInput.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const nextImage = new Image();
    nextImage.onload = () => {
      image = nextImage;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.style.display = "block";
      emptyState.style.display = "none";
      points = [];
      draw();
      updateSteps();
      calculate();
    };
    nextImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

demoButton.addEventListener("click", async () => {
  const response = await fetch("sample/synthetic-road.svg");
  const blob = await response.blob();
  const reader = new FileReader();
  reader.onload = () => {
    const nextImage = new Image();
    nextImage.onload = () => {
      image = nextImage;
      canvas.width = 1200;
      canvas.height = 720;
      canvas.style.display = "block";
      emptyState.style.display = "none";
      customWidth.value = 1800;
      yawAngle.value = 0;
      points = [
        {x: 480, y: 520}, {x: 720, y: 520},
        {x: 240, y: 520}, {x: 960, y: 520}
      ];
      draw();
      updateSteps();
      calculate();
    };
    nextImage.src = reader.result;
  };
  reader.readAsDataURL(blob);
});

canvas.addEventListener("click", event => {
  if (!image || points.length >= 4) return;
  const rect = canvas.getBoundingClientRect();
  points.push({
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height
  });
  draw();
  updateSteps();
  calculate();
});

document.querySelector("#undoButton").addEventListener("click", () => {
  points.pop();
  draw();
  updateSteps();
  calculate();
});

document.querySelector("#resetButton").addEventListener("click", () => {
  points = [];
  draw();
  updateSteps();
  calculate();
});

function updateSteps() {
  steps.forEach((step, index) => {
    step.classList.toggle("done", index < points.length);
    step.classList.toggle("active", index === points.length);
  });
}

function drawLine(a, b, color, label) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, canvas.width / 500);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  for (const point of [a, b]) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(7, canvas.width / 220), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = `700 ${Math.max(16, canvas.width / 65)}px system-ui`;
  ctx.fillText(label, (a.x + b.x) / 2 + 10, (a.y + b.y) / 2 - 10);
  ctx.restore();
}

function draw() {
  if (!image) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  if (points.length >= 2) drawLine(points[0], points[1], "#ff7a00", "Car body");
  if (points.length >= 4) drawLine(points[2], points[3], "#38bdf8", "Road");
  if (points.length % 2 === 1) {
    const point = points[points.length - 1];
    ctx.fillStyle = points.length === 1 ? "#ff7a00" : "#38bdf8";
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(7, canvas.width / 220), 0, Math.PI * 2);
    ctx.fill();
  }
}

function clearResult(message = "Complete all four points to calculate.") {
  result = null;
  roadWidth.textContent = "—";
  interval.textContent = message;
  confidence.textContent = "—";
  confidenceBar.style.width = "0";
  warnings.innerHTML = "";
  diagnostics.innerHTML = "";
  exportButton.disabled = true;
}

function calculate() {
  if (!image || points.length !== 4) {
    clearResult();
    return;
  }
  try {
    result = estimateRoadWidth({
      carLeft: points[0],
      carRight: points[1],
      roadLeft: points[2],
      roadRight: points[3],
      carWidthMm: Number(customWidth.value),
      imageHeightPx: canvas.height,
      yawDeg: Number(yawAngle.value),
      pointSigmaPx: Number(pointSigma.value),
      yawSigmaDeg: Number(yawSigma.value)
    });
    roadWidth.textContent = (result.widthMm / 1000).toFixed(2);
    interval.textContent = `95% interval: ${(result.lower95Mm / 1000).toFixed(2)}–${(result.upper95Mm / 1000).toFixed(2)} m`;
    confidence.textContent = `${result.confidence}%`;
    confidenceBar.style.width = `${result.confidence}%`;
    warnings.innerHTML = result.warnings.map(item => `<li>${item}</li>`).join("");
    diagnostics.innerHTML = [
      ["Car reference", `${result.carPixels.toFixed(1)} px`],
      ["Road reference", `${result.roadPixels.toFixed(1)} px`],
      ["Depth mismatch", `${(result.depthMismatchRatio * 100).toFixed(1)}%`],
      ["Line mismatch", `${result.alignmentAngleDeg.toFixed(1)}°`],
      ["Yaw factor", result.yawFactor.toFixed(3)]
    ].map(([label, value]) => `<div class="diagnostic"><span>${label}</span><strong>${value}</strong></div>`).join("");
    exportButton.disabled = false;
  } catch (error) {
    clearResult(error.message);
  }
}

exportButton.addEventListener("click", () => {
  if (!result) return;
  const car = cars.find(item => item.id === carSelect.value) || null;
  const payload = {
    measured_at: new Date().toISOString(),
    reference_vehicle: car,
    reference_width_mm: Number(customWidth.value),
    yaw_deg: Number(yawAngle.value),
    image_size_px: { width: canvas.width, height: canvas.height },
    points,
    result
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "road-width-measurement.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

updateSteps();
loadCars().catch(() => {
  carSelect.innerHTML = '<option value="">Database unavailable — enter width manually</option>';
});
