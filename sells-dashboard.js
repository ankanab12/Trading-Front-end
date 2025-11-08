console.log("Trading Sells Dashboard Loaded");

const BACKEND = "https://backend-service-2-pmrn.onrender.com"; // Flask backend
let bcs = [];
let jobs = {};

// DOM elements
const monthFilter = document.getElementById("monthFilter");
const lastUpdatedEl = document.getElementById("lastUpdated");
const jobsCountEl = document.getElementById("jobsCount");
const totalNettEl = document.getElementById("totalNett");
const commodityCountEl = document.getElementById("commodityCount");
const totalQtyEl = document.getElementById("totalQty");
const jobFilter = document.getElementById("jobFilter");

// Load data
init();
async function init() {
  await Promise.all([loadBcs(), loadJobs()]);
  updateDashboard();
  renderAllCharts();
  populateJobFilter();
}

// Fetch BCs & Jobs
async function loadBcs() {
  const res = await fetch(`${BACKEND}/api/bcs`);
  bcs = await res.json();
}
async function loadJobs() {
  const res = await fetch(`${BACKEND}/api/jobs`);
  const data = await res.json();
  jobs = {};
  data.forEach(j => (jobs[j.jobNo] = Number(j.overall || 0)));
}

// Helper functions
function filterByMonth(bcsList) {
  const monthVal = monthFilter.value;
  if (!monthVal) return bcsList;
  const [year, month] = monthVal.split("-");
  return bcsList.filter(bc => {
    if (!bc.date) return false;
    const d = new Date(bc.date);
    return d.getFullYear() == year && d.getMonth() + 1 == parseInt(month);
  });
}

function formatNumber(n) {
  if (isNaN(n)) return "—";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function updateDashboard() {
  const filtered = filterByMonth(bcs);
  if (!filtered.length) {
    lastUpdatedEl.textContent = "—";
    jobsCountEl.textContent = "0";
    totalNettEl.textContent = "₹0.00";
    commodityCountEl.textContent = "0";
    totalQtyEl.textContent = "0";
    return;
  }

  const lastDate = filtered
    .map(b => b.date)
    .filter(Boolean)
    .sort()
    .pop();
  lastUpdatedEl.textContent = lastDate || "—";

  if (lastDate) {
  const dateObj = new Date(lastDate);
  const formattedDate = dateObj.toLocaleDateString('en-GB'); // gives DD/MM/YYYY
  lastUpdatedEl.textContent = formattedDate.replace(/\//g, '-'); // convert to DD-MM-YYYY
} else {
  lastUpdatedEl.textContent = "—";
}

  const jobSet = new Set(filtered.map(b => b.jobNo));
  const commodities = new Set(filtered.map(b => b.commodity));
  const totalNett = filtered.reduce((sum, b) => sum + (b.nett || 0), 0);
  const totalQty = filtered.reduce((sum, b) => sum + (b.qty || 0), 0);

  jobsCountEl.textContent = jobSet.size;
  totalNettEl.textContent = "₹" + formatNumber(totalNett);
  commodityCountEl.textContent = commodities.size;
  totalQtyEl.textContent = formatNumber(totalQty);
}

// ===== Charts =====
function renderAllCharts() {
  renderBarCommodity();
  renderDonutCommodity();
  renderLineAmount();
  renderJobQtyBar();
}

function applyDateFilter(fromId, toId, fn) {
  const from = document.getElementById(fromId).value;
  const to = document.getElementById(toId).value;
  let filtered = bcs;
  if (from) filtered = filtered.filter(b => b.date >= from);
  if (to) filtered = filtered.filter(b => b.date <= to);
  fn(filtered);
}

// 1️⃣ Bar: Commodity vs Quantity
document.getElementById("barApply").onclick = () =>
  applyDateFilter("barFrom", "barTo", renderBarCommodity);

function renderBarCommodity(filtered = bcs) {
  const grouped = {};
  filtered.forEach(b => {
    if (!grouped[b.commodity]) grouped[b.commodity] = 0;
    grouped[b.commodity] += Number(b.qty) || 0;
  });
  const data = [
    {
      x: Object.keys(grouped),
      y: Object.values(grouped),
      type: "bar",
      marker: { color: "#9cefd4ff" },
    },
  ];
  Plotly.newPlot("barCommodityQty", data, {
    title: "Commodity-wise Quantity Summary",
    xaxis: { title: "Commodity" },
    yaxis: { title: "Quantity (MT)" },
  });
}

// 2️⃣ Donut: Commodity Share
document.getElementById("donutApply").onclick = () =>
  applyDateFilter("donutFrom", "donutTo", renderDonutCommodity);

function renderDonutCommodity(filtered = bcs) {
  const grouped = {};
  filtered.forEach(b => {
    if (!grouped[b.commodity]) grouped[b.commodity] = 0;
    grouped[b.commodity] += Number(b.qty) || 0;
  });
  const data = [
    {
      labels: Object.keys(grouped),
      values: Object.values(grouped),
      type: "pie",
      hole: 0.4,
    },
  ];
  Plotly.newPlot("donutCommodityShare", data, {
    title: "Commodity Share (%)",
  });
}

// 3️⃣ Line: Amount Trend
document.getElementById("lineApply").onclick = () =>
  applyDateFilter("lineFrom", "lineTo", renderLineAmount);

function renderLineAmount(filtered = bcs) {
  const grouped = {};
  filtered.forEach(b => {
    if (!b.date) return;
    grouped[b.date] = (grouped[b.date] || 0) + (b.nett || 0);
  });
  const sorted = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  const data = [
    {
      x: sorted.map(([d]) => d),
      y: sorted.map(([, v]) => v),
      type: "scatter",
      mode: "lines+markers",
      line: { color: "#065f46" },
    },
  ];
  Plotly.newPlot("lineAmount", data, {
    title: "Nett Amount Trend Over Time",
    xaxis: { title: "Date" },
    yaxis: { title: "Nett Amount (₹)" },
  });
}

// 4️⃣ Job Qty Breakdown
function populateJobFilter() {
  jobFilter.innerHTML = "<option value=''>Select Job</option>";
  Object.keys(jobs).forEach(job =>
    jobFilter.insertAdjacentHTML("beforeend", `<option>${job}</option>`)
  );
  jobFilter.addEventListener("change", renderJobQtyBar);
}

function renderJobQtyBar() {
  const job = jobFilter.value;
  if (!job) {
    Plotly.purge("jobQtyBar");
    return;
  }
  const overall = jobs[job] || 0;
  const sold = bcs
    .filter(b => b.jobNo === job)
    .reduce((sum, b) => sum + (Number(b.qty) || 0), 0);
  const unsold = overall - sold;

  const data = [
    {
      x: ["Overall", "Sold", "Unsold"],
      y: [overall, sold, unsold],
      type: "bar",
      marker: { color: ["#10b981", "#065f46", "#f87171"] },
    },
  ];
  Plotly.newPlot("jobQtyBar", data, {
    title: `Quantity Breakdown for Job ${job}`,
    yaxis: { title: "Quantity (MT)" },
  });
}

// Event: Month filter
monthFilter.addEventListener("change", () => {
  updateDashboard();
});