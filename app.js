const STORAGE_KEY = "temper-readings-v1";
const seedReadings = [
  { id: 1, value: 36.8, unit: "C", note: "Feeling well", date: offsetDate(-2) },
  { id: 2, value: 36.6, unit: "C", note: "A little tired", date: offsetDate(-1) },
];

let unit = "C";
let deferredInstallPrompt;
const form = document.querySelector("#temperature-form");
const temperatureInput = document.querySelector("#temperature-input");
const noteInput = document.querySelector("#note-input");
const unitToggle = document.querySelector("#unit-toggle");
const installButton = document.querySelector("#install-button");

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getReadings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedReadings));
  return seedReadings;
}

function saveReadings(readings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
}

function toCelsius(value, readingUnit) {
  return readingUnit === "C" ? value : (value - 32) * 5 / 9;
}

function displayTemperature(reading) {
  const celsius = toCelsius(reading.value, reading.unit);
  const value = unit === "C" ? celsius : celsius * 9 / 5 + 32;
  return `${value.toFixed(1)}°${unit}`;
}

function render() {
  const readings = getReadings().sort((a, b) => new Date(b.date) - new Date(a.date));
  const list = document.querySelector("#entries-list");
  const empty = document.querySelector("#empty-state");
  list.innerHTML = readings.slice(0, 4).map((reading) => {
    const date = new Date(reading.date);
    const isToday = date.toDateString() === new Date().toDateString();
    return `<article class="entry-row">
      <div class="entry-date"><span>${date.toLocaleDateString("en", { month: "short" }).toUpperCase()}</span><strong>${date.getDate()}</strong></div>
      <div class="entry-info"><strong>${isToday ? "Today" : date.toLocaleDateString("en", { weekday: "long" })}</strong><span>${escapeHtml(reading.note || "No note added")}</span></div>
      <span class="entry-temp">${displayTemperature(reading)}</span>
    </article>`;
  }).join("");
  empty.hidden = readings.length > 0;
  document.querySelector("#clear-button").hidden = readings.length === 0;
  renderChart(readings);
}

function renderChart(readings) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    const match = readings.find((reading) => new Date(reading.date).toDateString() === date.toDateString());
    return { date, value: match ? toCelsius(match.value, match.unit) : null };
  });
  const available = days.filter((day) => day.value !== null);
  const average = available.length ? available.reduce((sum, day) => sum + day.value, 0) / available.length : 0;
  const shownAverage = unit === "C" ? average : average * 9 / 5 + 32;
  document.querySelector("#average-value").textContent = available.length ? `${shownAverage.toFixed(1)}°${unit}` : "—";
  document.querySelector("#trend-label").hidden = !available.length;
  document.querySelector("#chart").innerHTML = days.map((day, index) => {
    const height = day.value === null ? 3 : Math.max(18, Math.min(94, 25 + (day.value - 35.5) * 45));
    return `<div class="chart-column ${index === 6 ? "today" : ""}"><div class="chart-bar" style="height:${height}%"></div><span>${day.date.toLocaleDateString("en", { weekday: "short" }).slice(0, 1)}</span></div>`;
  }).join("");
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = Number(temperatureInput.value);
  const bounds = unit === "C" ? [34, 43] : [93.2, 109.4];
  if (value < bounds[0] || value > bounds[1]) {
    showToast(`Enter a value between ${bounds[0]}° and ${bounds[1]}°${unit}`);
    return;
  }
  const readings = getReadings();
  readings.push({ id: Date.now(), value, unit, note: noteInput.value.trim(), date: new Date().toISOString() });
  saveReadings(readings);
  noteInput.value = "";
  render();
  showToast("Today’s reading has been saved");
});

unitToggle.addEventListener("click", () => {
  const current = Number(temperatureInput.value);
  unit = unit === "C" ? "F" : "C";
  const converted = unit === "F" ? current * 9 / 5 + 32 : (current - 32) * 5 / 9;
  temperatureInput.value = converted.toFixed(1);
  temperatureInput.min = unit === "C" ? 34 : 93.2;
  temperatureInput.max = unit === "C" ? 43 : 109.4;
  document.querySelector("#active-unit").textContent = `°${unit}`;
  document.querySelector("#other-unit").textContent = unit === "C" ? "°F" : "°C";
  render();
});

document.querySelector("#clear-button").addEventListener("click", () => {
  if (window.confirm("Remove all temperature readings from this device?")) {
    saveReadings([]);
    render();
    showToast("All readings removed");
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

document.querySelector("#today-label").textContent = new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}
