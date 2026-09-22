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
const detectButton = document.querySelector("#detectButton");
const detectionStatus = document.querySelector("#detectionStatus");
const detections = document.querySelector("#detections");

let cars = [];
let filteredCars = [];
let image = null;
let points = [];
let result = null;
let imageFile = null;
let vehicleDetections = [];
let selectedDetection = -1;
const apiBase = localStorage.getItem("roadWidthApi") || "http://localhost:8000";

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
  imageFile = file;
  vehicleDetections = [];
  selectedDetection = -1;
  detections.innerHTML = "";
  detectButton.disabled = false;
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

async function checkBackend() {
  try {
    const response = await fetch(`${apiBase}/health`);
    if (!response.ok) throw new Error();
    const health = await response.json();
    detectionStatus.textContent = `YOLO backend ready · ${health.model}`;
  } catch {
    detectionStatus.textContent = "YOLO backend offline. Start it with the backend command in README.";
  }
}

function detectionCrop(box) {
  const crop = document.createElement("canvas");
  const width = Math.max(1, box.x2 - box.x1);
  const height = Math.max(1, box.y2 - box.y1);
  crop.width = 180;
  crop.height = Math.max(80, Math.round(180 * height / width));
  crop.getContext("2d").drawImage(image, box.x1, box.y1, width, height, 0, 0, crop.width, crop.height);
  return crop.toDataURL("image/jpeg", 0.82);
}

function renderDetections() {
  detections.innerHTML = vehicleDetections.map((item, index) => `
    <button type="button" class="detection ${index === selectedDetection ? "selected" : ""}" data-detection="${index}">
      <img src="${detectionCrop(item.box)}" alt="Detected ${item.label}">
      <span><strong>${item.label}</strong><small>${(item.confidence * 100).toFixed(1)}% confidence</small></span>
    </button>
  `).join("");
  detections.querySelectorAll("[data-detection]").forEach(button => {
    button.addEventListener("click", () => {
      selectedDetection = Number(button.dataset.detection);
      renderDetections();
      draw();
    });
  });
}

detectButton.addEventListener("click", async () => {
  if (!imageFile) return;
  detectButton.disabled = true;
  detectionStatus.textContent = "Running YOLO detection…";
  const form = new FormData();
  form.append("image", imageFile);
  try {
    const response = await fetch(`${apiBase}/api/detect-vehicles`, { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "Detection failed");
    vehicleDetections = payload.detections;
    selectedDetection = vehicleDetections.length ? 0 : -1;
    detectionStatus.textContent = vehicleDetections.length
      ? `${vehicleDetections.length} vehicle${vehicleDetections.length === 1 ? "" : "s"} found. Select the reference car.`
      : "No suitable vehicle found. Continue with manual points.";
    renderDetections();
    draw();
  } catch (error) {
    detectionStatus.textContent = `${error.message}. Manual measurement is still available.`;
  } finally {
    detectButton.disabled = false;
  }
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
  vehicleDetections.forEach((item, index) => {
    const { x1, y1, x2, y2 } = item.box;
    ctx.save();
    ctx.strokeStyle = index === selectedDetection ? "#22c55e" : "rgba(255,255,255,.75)";
    ctx.lineWidth = Math.max(index === selectedDetection ? 5 : 2, canvas.width / 400);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = `700 ${Math.max(15, canvas.width / 70)}px system-ui`;
    ctx.fillText(`${item.label} ${(item.confidence * 100).toFixed(0)}%`, x1, Math.max(20, y1 - 8));
    ctx.restore();
  });
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
checkBackend();
