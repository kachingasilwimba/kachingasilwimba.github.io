"use strict";

const get = (id) => document.getElementById(id);
const captions = {
  "true-color": "Red, green, and blue make the visible-light composite.",
  "false-color": "Near infrared, red, and green map to screen red, green, and blue. Vegetation tends to appear red.",
  ndvi: "The Normalized Difference Vegetation Index (NDVI) is (NIR − red) / (NIR + red). Higher values usually correspond to more green vegetation.",
};
const bandColors = ["#94bdea", "#9ad6a3", "#f6a391", "#ffd193", "#d4b5e0", "#bca9d9"];
const dateText = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

function calendarDate(date) {
  return new Date(date + "T00:00:00Z");
}

function makeOption(value, label) {
  return new Option(label, String(value));
}

function drawOverlay(canvas, gridSize, row, column, gridVisible) {
  const ctx = canvas.getContext("2d");
  const step = canvas.width / gridSize;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (gridVisible) {
    ctx.beginPath();
    for (let i = 1; i < gridSize; i += 1) {
      const line = i * step + 0.5;
      ctx.moveTo(line, 0);
      ctx.lineTo(line, canvas.height);
      ctx.moveTo(0, line);
      ctx.lineTo(canvas.width, line);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(239, 251, 230, 0.58)";
    ctx.stroke();
  }
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#152820";
  ctx.strokeRect(column * step + 2.5, row * step + 2.5, step - 5, step - 5);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffe29c";
  ctx.strokeRect(column * step + 2.5, row * step + 2.5, step - 5, step - 5);
}

function renderBandList(names, bandMeans) {
  const bands = names.map((name, index) => {
    const item = document.createElement("div");
    const title = document.createElement("dt");
    const values = document.createElement("dd");
    const value = document.createElement("span");
    const meter = document.createElement("meter");
    const mean = bandMeans[index];
    item.className = "band";
    item.style.setProperty("--band-color", bandColors[index]);
    title.textContent = name;
    meter.min = 0;
    meter.max = 1;
    meter.value = mean ?? 0;
    meter.setAttribute("aria-hidden", "true");
    value.textContent = Number.isFinite(mean) ? mean.toFixed(3) : "—";
    values.append(meter, value);
    item.append(title, values);
    return item;
  });
  get("bands").replaceChildren(...bands);
}

function setUpExplorer(data) {
  const { gridSize, patchSize, scenes, bandNames, ndviPalette, embeddingDistances } = data;
  const date = get("scene-date");
  const layers = get("layers");
  const grid = get("grid-toggle");
  const rowControl = get("patch-row");
  const colControl = get("patch-col");
  const image = get("scene-image");
  const canvas = get("patch-overlay");
  const scale = get("ndvi-scale");

  date.replaceChildren(...scenes.map((scene, i) => makeOption(i, dateText.format(calendarDate(scene.date)))));
  for (let i = 0; i < gridSize; i += 1) {
    rowControl.add(makeOption(i, i + 1));
    colControl.add(makeOption(i, i + 1));
  }
  rowControl.value = "8";
  colControl.value = "3";
  scale.style.setProperty("--ndvi-ramp", ndviPalette.map(([ndvi, color]) => color + " " + ((ndvi + 1) * 50) + "%").join(", "));

  function showPatch() {
    const row = Number(rowControl.value);
    const column = Number(colControl.value);
    const patchIndex = row * gridSize + column;
    const patch = scenes[Number(date.value)].patches[patchIndex];
    const [early, late] = scenes.map((scene) => scene.patches[patchIndex].ndvi);
    const delta = Number.isFinite(early) && Number.isFinite(late) ? late - early : null;
    const [earlyMonth, lateMonth] = scenes.map((scene) => shortDate.format(calendarDate(scene.date)));
    get("patch-title").textContent = "Row " + (row + 1) + ", column " + (column + 1);
    get("valid-count").textContent = patch.validPixels + " / " + (patchSize * patchSize) + " valid pixels";
    get("ndvi-value").textContent = Number.isFinite(patch.ndvi) ? patch.ndvi.toFixed(3) : "—";
    get("ndvi-delta").textContent = delta === null ? "" : (delta > 0 ? "+" : "") + delta.toFixed(3) + " · " + lateMonth + " − " + earlyMonth;
    const distance = embeddingDistances[patchIndex];
    get("embedding-distance").textContent = Number.isFinite(distance) ? distance.toFixed(3) : "—";
    renderBandList(bandNames, patch.bandMeans);
    drawOverlay(canvas, gridSize, row, column, grid.checked);
  }

  function showLayer() {
    const scene = scenes[Number(date.value)];
    const selection = layers.querySelector("input:checked");
    const layer = selection.value;
    const exactDate = dateText.format(calendarDate(scene.date));
    image.src = scene.images[layer];
    image.alt = selection.nextElementSibling.textContent + " view of HLS tile T13REM acquired " + exactDate;
    get("layer-caption").textContent = captions[layer];
    scale.hidden = layer !== "ndvi";
  }

  date.addEventListener("change", () => {
    showLayer();
    showPatch();
  });
  layers.addEventListener("change", showLayer);
  grid.addEventListener("change", showPatch);
  rowControl.addEventListener("change", showPatch);
  colControl.addEventListener("change", showPatch);
  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const row = Math.floor((event.clientY - rect.top) / rect.height * gridSize);
    const column = Math.floor((event.clientX - rect.left) / rect.width * gridSize);
    rowControl.value = Math.min(gridSize - 1, Math.max(0, row));
    colControl.value = Math.min(gridSize - 1, Math.max(0, column));
    showPatch();
  });

  showLayer();
  showPatch();
  date.disabled = false;
  layers.disabled = false;
  grid.disabled = false;
  get("load-status").hidden = true;
  get("explorer-content").hidden = false;
}

async function loadExplorer() {
  try {
    const result = await fetch("assets/explorer-data.json");
    if (!result.ok) throw new Error("HTTP " + result.status);
    setUpExplorer(await result.json());
  } catch (error) {
    get("load-status").textContent = "The explorer data could not load. Reload this page, or serve the lab over HTTP if you opened a local file.";
    console.error("Could not load the HLS explorer", error);
  }
}

for (const button of document.querySelectorAll("[data-copy]")) {
  let reset;
  button.addEventListener("click", async () => {
    const code = get(button.dataset.copy);
    clearTimeout(reset);
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = "Copied";
      get("copy-status").textContent = "Commands copied.";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "Selected";
      get("copy-status").textContent = "Commands selected. Use your keyboard shortcut to copy.";
    }
    reset = setTimeout(() => { button.textContent = "Copy"; }, 2200);
  });
}

loadExplorer();
