/* summary.js
   Combines data from:
     - Expenses API (http://127.0.0.1:5000/api/expenses)
     - Sells backend (http://localhost:5001/api/jobs and /api/bcs)

   Produces:
     - Cards summary (responding to commodity filter)
     - Table of jobs with: Overall, Commodity, Stock Location, Origin, Current Qty, Sold Qty, Total Nett, Total Job Expense
     - Filters, CSV export, PDF export (inline open)
*/

// ---------------- CONFIG ----------------
console.log("Trading Summary Dashboard (combined) Loaded");

// expenses API (expense page)
const EXPENSES_API = "https://backend-service-1-f006.onrender.com/api/expenses";

// sells backend (jobs + bcs)
const SELLS_BACKEND = "https://backend-service-2-pmrn.onrender.com";



// ---------------- PURCHASE TOTAL SUMMARY ----------------
const PURCHASE_API_URL = "https://backend-service-1-f006.onrender.com/api/purchases";

const purchaseFromDate = document.getElementById("purchaseFromDate");
const purchaseToDate = document.getElementById("purchaseToDate");
const fetchPurchaseSummaryBtn = document.getElementById("fetchPurchaseSummaryBtn");
const purchaseTotalAmountEl = document.getElementById("purchaseTotalAmount");

// 🔹 Function to fetch and display purchase total (optionally with filters)
async function fetchPurchaseSummary(from = "", to = "") {
  try {
    // Build URL with optional query params
    let url = PURCHASE_API_URL;
    if (from && to) {
      url += `?from=${from}&to=${to}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch purchase data");
    const data = await res.json();

    // Sum total Amount (INR)
    let totalINR = 0;
    data.forEach(p => {
      totalINR += parseFloat(p.amountINR || 0);
    });

    purchaseTotalAmountEl.textContent = `₹ ${totalINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  } catch (err) {
    console.error("Purchase summary fetch error:", err);
    purchaseTotalAmountEl.textContent = "Error";
  }
}

// 🔸 On button click — fetch with selected date range
if (fetchPurchaseSummaryBtn) {
  fetchPurchaseSummaryBtn.addEventListener("click", () => {
    const from = purchaseFromDate.value;
    const to = purchaseToDate.value;
    if (!from || !to) {
      alert("Please select both From and To dates.");
      return;
    }
    fetchPurchaseSummary(from, to);
  });
}

// 🔸 On page load — fetch all-time data
document.addEventListener("DOMContentLoaded", () => {
  fetchPurchaseSummary(); // no filters = all data
});

// ---------------- NETT SUMMARY (From Sells Data) ----------------
const NETT_API_URL = "https://backend-service-2-pmrn.onrender.com/api/bcs";

const nettFromDate = document.getElementById("nettFromDate");
const nettToDate = document.getElementById("nettToDate");
const fetchNettSummaryBtn = document.getElementById("fetchNettSummaryBtn");
const nettTotalAmountEl = document.getElementById("nettTotalAmount");

// 🔹 Function to fetch Nett total for selected range
async function fetchNettSummary(from = "", to = "") {
  try {
    const res = await fetch(NETT_API_URL);
    if (!res.ok) throw new Error("Failed to fetch sells data");
    const data = await res.json(); // expecting array of BCs

    let filtered = data;
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      filtered = data.filter(bc => {
        if (!bc.date) return false;
        const d = new Date(bc.date);
        return d >= fromDate && d <= toDate;
      });
    }

    const totalNett = filtered.reduce(
      (sum, bc) => sum + (parseFloat(bc.nett) || 0),
      0
    );

    nettTotalAmountEl.textContent = `₹ ${totalNett.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  } catch (err) {
    console.error("Nett summary fetch error:", err);
    nettTotalAmountEl.textContent = "Error";
  }
}

// 🔸 On button click — fetch with selected date range
if (fetchNettSummaryBtn) {
  fetchNettSummaryBtn.addEventListener("click", () => {
    const from = nettFromDate.value;
    const to = nettToDate.value;
    if (!from || !to) {
      alert("Please select both From and To dates.");
      return;
    }
    fetchNettSummary(from, to);
  });
}

// 🔸 On page load — fetch all-time Nett total
document.addEventListener("DOMContentLoaded", () => {
  fetchNettSummary(); // all data
});

// ---------------- EXPENSE TOTAL SUMMARY ----------------
const EXPENSE_API_URL = "https://backend-service-1-f006.onrender.com/api/expenses";

const expenseFromDate = document.getElementById("expenseFromDate");
const expenseToDate = document.getElementById("expenseToDate");
const fetchExpenseSummaryBtn = document.getElementById("fetchExpenseSummaryBtn");
const expenseTotalAmountEl = document.getElementById("expenseTotalAmount");

// 🔹 Function to fetch and display total expense amount for date range
async function fetchExpenseSummary(from = "", to = "") {
  try {
    const res = await fetch(EXPENSE_API_URL);
    if (!res.ok) throw new Error("Failed to fetch expense data");
    const data = await res.json(); // expecting array of jobs (each with expenseData array)

    let totalExpense = 0;

    data.forEach(job => {
      if (!job.expenseData) return;
      job.expenseData.forEach(exp => {
        const expDate = new Date(exp.date);
        if (from && to) {
          const fromDate = new Date(from);
          const toDate = new Date(to);
          if (expDate >= fromDate && expDate <= toDate) {
            totalExpense += parseFloat(exp.amount || 0);
          }
        } else {
          totalExpense += parseFloat(exp.amount || 0);
        }
      });
    });

    expenseTotalAmountEl.textContent = `₹ ${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  } catch (err) {
    console.error("Expense summary fetch error:", err);
    expenseTotalAmountEl.textContent = "Error";
  }
}

// 🔸 On button click — fetch with selected date range
if (fetchExpenseSummaryBtn) {
  fetchExpenseSummaryBtn.addEventListener("click", () => {
    const from = expenseFromDate.value;
    const to = expenseToDate.value;
    if (!from || !to) {
      alert("Please select both From and To dates.");
      return;
    }
    fetchExpenseSummary(from, to);
  });
}

// 🔸 On page load — fetch all-time expense total
document.addEventListener("DOMContentLoaded", () => {
  fetchExpenseSummary(); // no filters = all data
});

// ---------------- PROFIT / LOSS SUMMARY ----------------
const profitFromDate = document.getElementById("profitFromDate");
const profitToDate = document.getElementById("profitToDate");
const fetchProfitSummaryBtn = document.getElementById("fetchProfitSummaryBtn");
const profitTotalAmountEl = document.getElementById("profitTotalAmount");
const profitBreakdownEl = document.getElementById("profitBreakdown");
const exportProfitPDFBtn = document.getElementById("exportProfitPDFBtn");

// Helper to fetch totals (all-time by default or filtered by date)
async function calculateProfitLoss(from = null, to = null) {
  try {
    // Convert to Date objects only if both dates exist
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    // 1️⃣ Fetch Purchase Total
    let purchaseTotal = 0;
    const purchaseRes = await fetch(PURCHASE_API_URL);
    const purchaseData = await purchaseRes.json();
    purchaseData.forEach(p => {
      const d = new Date(p.date || p.createdAt || Date.now());
      if (!fromDate || !toDate || (d >= fromDate && d <= toDate)) {
        purchaseTotal += parseFloat(p.amountINR || 0);
      }
    });

    // 2️⃣ Fetch Nett (Sales) Total
    let nettTotal = 0;
    const bcRes = await fetch(NETT_API_URL);
    const bcData = await bcRes.json();
    bcData.forEach(bc => {
      const d = new Date(bc.date);
      if (!fromDate || !toDate || (d >= fromDate && d <= toDate)) {
        nettTotal += parseFloat(bc.nett || 0);
      }
    });

    // 3️⃣ Fetch Expense Total
    let expenseTotal = 0;
    const expRes = await fetch(EXPENSE_API_URL);
    const expData = await expRes.json();
    expData.forEach(job => {
      if (!job.expenseData) return;
      job.expenseData.forEach(exp => {
        const d = new Date(exp.date);
        if (!fromDate || !toDate || (d >= fromDate && d <= toDate)) {
          expenseTotal += parseFloat(exp.amount || 0);
        }
      });
    });

    // 4️⃣ Calculate Profit or Loss
    const profit = nettTotal - (purchaseTotal + expenseTotal);

    // 5️⃣ Display Result
    let emoji = "";
    if (profit > 0) {
      emoji = "📈";
      profitTotalAmountEl.className = "profit";
    } else if (profit < 0) {
      emoji = "📉";
      profitTotalAmountEl.className = "loss";
    } else {
      emoji = "⚖️";
      profitTotalAmountEl.className = "";
    }

    profitTotalAmountEl.textContent =
      `${emoji} ${profit > 0 ? '+' : ''}₹ ${profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    profitBreakdownEl.innerHTML = `
      Sells: ₹${nettTotal.toLocaleString('en-IN')} <br>
      Purchases + Expenses: ₹${(purchaseTotal + expenseTotal).toLocaleString('en-IN')}
    `;

    return { nettTotal, purchaseTotal, expenseTotal, profit };
  } catch (err) {
    console.error("Profit/Loss calculation error:", err);
    profitTotalAmountEl.textContent = "Error calculating";
  }
}

// On click — calculate profit/loss for selected range OR all-time
if (fetchProfitSummaryBtn) {
  fetchProfitSummaryBtn.addEventListener("click", async () => {
    const from = profitFromDate.value || null;
    const to = profitToDate.value || null;
    await calculateProfitLoss(from, to);
  });
}

// On page load — show ALL-TIME summary by default
document.addEventListener("DOMContentLoaded", async () => {
  await calculateProfitLoss(); // no dates → all-time data
});

// ---------------- PROFIT / LOSS PDF EXPORT ----------------
if (exportProfitPDFBtn) {
  exportProfitPDFBtn.addEventListener("click", async () => {
    const from = profitFromDate.value || null;
    const to = profitToDate.value || null;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const result = await calculateProfitLoss(from, to);
    if (!result) return;

    const { nettTotal, purchaseTotal, expenseTotal, profit } = result;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Profit / Loss Summary Report", 40, 50);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  if (from && to) {
  const fromDate = new Date(from).toLocaleDateString("en-GB"); // DD-MM-YYYY
  const toDate = new Date(to).toLocaleDateString("en-GB");     // DD-MM-YYYY
  doc.text(`Date Range: ${fromDate} to ${toDate}`, 40, 70);
} else {
  doc.text(`Date Range: All-Time`, 40, 70);
}
    const body = [
      ['Total Sells (Nett)', `INR ${nettTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Total Purchase', `INR ${purchaseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Total Expenses', `INR ${expenseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['----------------------------------', ''],
      ['Profit / Loss', `${profit > 0 ? 'Profit +' : ' Loss -'} INR ${Math.abs(profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
    ];

    doc.autoTable({
      startY: 90,
      head: [['Particulars', 'Amount (INR)']],
      body,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59,130,246], textColor: 255, halign: 'center' },
    });

    const arrayBuffer = doc.output('arraybuffer');
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  });
}



// DOM
const summaryGrid = document.getElementById("summaryGrid");
const filterInput = document.getElementById("filterInput");
const commodityFilter = document.getElementById("commodityFilter");

const jobsTableBody = document.getElementById("jobsTableBody");
const tableRowsCount = document.getElementById("tableRowsCount");
const tableJobFilter = document.getElementById("tableJobFilter");
const tableCommodityFilter = document.getElementById("tableCommodityFilter");

const exportFilteredPDFBtn = document.getElementById("exportFilteredPDFBtn");
const exportFilteredCSVBtnTop = document.getElementById("exportFilteredCSVBtnTop");
const exportAllPDFBtn = document.getElementById("exportAllPDFBtn");
const exportAllCSVBtn = document.getElementById("exportAllCSVBtn");

// state
let jobs = {};    // { jobNo: { overall, commodity, location, origin } }
let bcs = [];     // array of BC records (from sells backend)
let expenses = []; // array of expense job records (from expense API)

document.addEventListener("DOMContentLoaded", init);
filterInput.addEventListener("input", renderAll);
commodityFilter.addEventListener("change", renderAll);

tableJobFilter.addEventListener("input", renderTable);
tableCommodityFilter.addEventListener("input", renderTable);

exportFilteredPDFBtn.addEventListener("click", () => exportFilteredJobsPDF());
exportFilteredCSVBtnTop.addEventListener("click", () => exportFilteredCSV());
exportAllPDFBtn.addEventListener("click", () => exportAllJobsPDF());
exportAllCSVBtn.addEventListener("click", () => exportAllCSV());

// ---------------- INIT ----------------
async function init() {
  await Promise.all([ loadJobsFromServer(), loadBcsFromServer(), loadExpensesFromServer() ]);
  populateCommodityFilter();
  renderAll();
}

// ---------------- BACKEND LOADERS ----------------
async function loadJobsFromServer() {
  try {
    const res = await fetch(`${SELLS_BACKEND}/api/jobs`);
    if (!res.ok) throw new Error("Failed to load jobs");
    const data = await res.json(); // expecting [{jobNo, overall, commodity, location, origin}, ...]
    jobs = {};
    data.forEach(j => {
      jobs[j.jobNo] = {
        overall: Number(j.overall || 0),
        commodity: j.commodity || '',
        location: j.location || '',
        origin: j.origin || ''
      };
    });
  } catch (e) {
    console.error("loadJobsFromServer error", e);
    // keep empty jobs but don't interrupt
  }
}

async function loadBcsFromServer() {
  try {
    const res = await fetch(`${SELLS_BACKEND}/api/bcs`);
    if (!res.ok) throw new Error("Failed to load bcs");
    bcs = await res.json(); // expecting array of BC objects
  } catch (e) {
    console.error("loadBcsFromServer error", e);
    bcs = [];
  }
}

async function loadExpensesFromServer() {
  try {
    const res = await fetch(EXPENSES_API);
    if (!res.ok) throw new Error("Failed to load expenses");
    expenses = await res.json(); // expecting array: [{ jobNo, expenseData: [{amount,...}, ...]}, ...] or similar
  } catch (e) {
    console.error("loadExpensesFromServer error", e);
    expenses = [];
  }
}

// ---------------- AGGREGATION ----------------
function aggregatePerJob() {
  // Build a map of job aggregates
  const map = {}; // jobNo => { overall, commodity, location, origin, soldQty, totalNett, totalExpense, currentQty }
  // initialize from jobs
  Object.keys(jobs).forEach(jobNo => {
    map[jobNo] = {
      jobNo,
      overall: Number(jobs[jobNo].overall || 0),
      commodity: jobs[jobNo].commodity || '',
      location: jobs[jobNo].location || '',
      origin: jobs[jobNo].origin || '',
      soldQty: 0,
      totalNett: 0,
      totalExpense: 0
    };
  });

  // accumulate from bcs (sells)
  bcs.forEach(bc => {
    const j = bc.jobNo || '';
    if (!j) return;
    if (!map[j]) {
      // job exists in sells data but not in jobs list (create a skeleton)
      map[j] = {
        jobNo: j,
        overall: 0,
        commodity: bc.commodity || '',
        location: '',
        origin: bc.origin || '',
        soldQty: 0,
        totalNett: 0,
        totalExpense: 0
      };
    }
    const qty = Number(bc.qty || 0);
    const nett = Number(bc.nett || 0);
    map[j].soldQty = preciseAdd(map[j].soldQty, qty);
    map[j].totalNett = preciseAdd(map[j].totalNett, nett);
  });

  // accumulate expenses per job from expenses array
  // expectation: expenses may be array of job objects or a flat list. We'll handle both shapes:
  // shape1: [ { jobNo: "J1", expenseData:[{amount:123}, ...] }, ... ]
  // shape2: [ { jobNo: "J1", amount: 123, ... }, ... ] or flat receipts with jobNo field.
  // We'll handle both by checking keys.
  expenses.forEach(item => {
    if (!item) return;
    if (item.jobNo && Array.isArray(item.expenseData)) {
      const jn = item.jobNo;
      const total = item.expenseData.reduce((s, e) => preciseAdd(s, Number(e.amount || 0)), 0);
      if (!map[jn]) {
        map[jn] = {
          jobNo: jn, overall: 0, commodity: '', location: '', origin: '', soldQty:0, totalNett:0, totalExpense:0
        };
      }
      map[jn].totalExpense = preciseAdd(map[jn].totalExpense, total);
    } else if (item.jobNo && item.amount !== undefined) {
      const jn = item.jobNo;
      if (!map[jn]) map[jn] = { jobNo: jn, overall:0, commodity:'', location:'', origin:'', soldQty:0, totalNett:0, totalExpense:0};
      map[jn].totalExpense = preciseAdd(map[jn].totalExpense, Number(item.amount || 0));
    } else {
      // Could be flat expense records keyed differently - attempt to find jobNo property anywhere
      if (item.job && item.amount !== undefined) {
        const jn = item.job;
        if (!map[jn]) map[jn] = { jobNo: jn, overall:0, commodity:'', location:'', origin:'', soldQty:0, totalNett:0, totalExpense:0};
        map[jn].totalExpense = preciseAdd(map[jn].totalExpense, Number(item.amount || 0));
      }
    }
  });

  // compute currentQty
  Object.keys(map).forEach(k => {
    const rec = map[k];
    rec.currentQty = Number((Number(rec.overall) - Number(rec.soldQty)).toFixed(2));
    // safety: avoid negative visual surprises
    if (rec.currentQty < 0) rec.currentQty = Number(rec.currentQty.toFixed(2));
  });

  return map;
}

// ---------------- RENDERING ----------------
function renderAll() {
  const map = aggregatePerJob();
  renderCommodityDropdown(map);
  renderCards(map);
  renderTable(); // table reads same aggregated map internally
}

// render cards (summaryGrid) — respects the filterInput and commodityFilter
function renderCards(map) {
  const filterVal = filterInput.value.trim().toLowerCase();
  const commodityVal = commodityFilter.value;

  summaryGrid.innerHTML = "";
  const keys = Object.keys(map).sort();

  const filteredKeys = keys.filter(jobNo => {
    const rec = map[jobNo];
    if (filterVal && !jobNo.toLowerCase().includes(filterVal)) return false;
    if (commodityVal && rec.commodity !== commodityVal) return false;
    return true;
  });

  if (filteredKeys.length === 0) {
    summaryGrid.innerHTML = `<p style="text-align:center;">No matching jobs found.</p>`;
    return;
  }

  filteredKeys.forEach(jobNo => {
    const rec = map[jobNo];
    const card = document.createElement("div");
    card.className = "job-card";
    card.innerHTML = `
      <h2>Job No: ${escapeHtml(rec.jobNo)}</h2>
      <p class="muted">Commodity: ${escapeHtml(rec.commodity || '—')}</p>
      <p>Overall Qty: <span> ${formatNumber(rec.overall)} MT</span></p>
      <p>Current Qty: <span> ${formatNumber(rec.currentQty)} MT</span></p>
      <p>Sold Qty: <span> ${formatNumber(rec.soldQty)} MT</span></p>
      <p>Total Nett: <span> Rs ${formatNumber(rec.totalNett)}</span></p>
      <p>Total Expense: <span> Rs ${formatNumber(rec.totalExpense)}</span></p>
      <div class="stat-row">
        <div class="stat">Location: ${escapeHtml(rec.location || '—')}</div>
        <div class="stat">Origin: ${escapeHtml(rec.origin || '—')}</div>
      </div>
    `;
    summaryGrid.appendChild(card);
  });
}

// populate commodity filter dropdown from aggregated map
function populateCommodityFilter() {
  const map = aggregatePerJob();
  renderCommodityDropdown(map);
}
function renderCommodityDropdown(map) {
  const existing = new Set();
  Object.values(map).forEach(r => { if (r.commodity) existing.add(r.commodity); });
  // clear & rebuild selector
  const selVal = commodityFilter.value || "";
  commodityFilter.innerHTML = `<option value="">All Commodities</option>`;
  Array.from(existing).sort().forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    commodityFilter.appendChild(opt);
  });
  if (selVal) commodityFilter.value = selVal;
}

// render table of jobs (one row per job) — respects table filters
function renderTable() {
  const map = aggregatePerJob();
  const tableFilterJob = (tableJobFilter.value || "").trim().toLowerCase();
  const tableFilterComm = (tableCommodityFilter.value || "").trim().toLowerCase();

  jobsTableBody.innerHTML = "";
  const keys = Object.keys(map).sort();

  const filtered = keys.filter(k => {
    const r = map[k];
    if (tableFilterJob && !k.toLowerCase().includes(tableFilterJob)) return false;
    if (tableFilterComm && !(r.commodity || '').toLowerCase().includes(tableFilterComm)) return false;
    return true;
  });

  filtered.forEach(jobNo => {
    const r = map[jobNo];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.jobNo)}</td>
      <td>${formatNumber(r.overall)}</td>
      <td>${escapeHtml(r.commodity || '—')}</td>
      <td>${escapeHtml(r.location || '—')}</td>
      <td>${escapeHtml(r.origin || '—')}</td>
      <td>${formatNumber(r.currentQty)}</td>
      <td>${formatNumber(r.soldQty)}</td>
      <td>Rs ${formatNumber(r.totalNett)}</td>
      <td>Rs ${formatNumber(r.totalExpense)}</td>
      <td>
        <button class="btn" data-action="viewPdf" data-job="${escapeHtml(r.jobNo)}">PDF</button>
      </td>
    `;
    jobsTableBody.appendChild(tr);
  });

  tableRowsCount.innerText = `${filtered.length} record(s)`;

  // attach handlers
  Array.from(jobsTableBody.querySelectorAll('button')).forEach(btn => {
    const action = btn.dataset.action;
    const jobNo = btn.dataset.job;
    btn.addEventListener('click', () => {
      if (action === 'viewPdf') openJobPdf(jobNo);
      if (action === 'viewDetails') openJobDetailsModal(jobNo); // simple table expansion or alert for now
      if (action === 'exportCsv') exportJobCsv(jobNo);
    });
  });
}

// simple details popup (keeps page minimal per instruction)
function openJobDetailsModal(jobNo) {
  const map = aggregatePerJob();
  const r = map[jobNo];
  if (!r) return alert('No details found for job ' + jobNo);
  // Show details inline using a small window (user asked everything inline in table — keep simple)
  const details = [
    `Job No: ${r.jobNo}`,
    `Commodity: ${r.commodity || '—'}`,
    `Overall: ${formatNumber(r.overall)} MT`,
    `Current Qty: ${formatNumber(r.currentQty)} MT`,
    `Sold Qty: ${formatNumber(r.soldQty)} MT`,
    `Total Nett: Rs ${formatNumber(r.totalNett)}`,
    `Total Expense: Rs ${formatNumber(r.totalExpense)}`,
    `Stock Location: ${r.location || '—'}`,
    `Origin: ${r.origin || '—'}`
  ].join('\n');
  alert(details);
}

// ---------------- EXPORTS ----------------
function exportJobCsv(jobNo) {
  // collect BC rows for jobNo
  const rows = bcs.filter(b => (b.jobNo || '') === jobNo);
  if (!rows.length) return alert('No BC rows for job ' + jobNo);
  const headers = ['BC No', 'Date', 'Job No', 'Seller', 'Buyer', 'Commodity', 'Origin', 'Quantity (MT)', 'Rate/MT', 'Nett', 'Delivery', 'DeliveryLoc', 'Quality', 'Packaging'];
  const csvRows = [headers.join(',')];
  rows.forEach(r => {
    const row = [
      csvSafe(r.bcNo), csvSafe(r.date), csvSafe(r.jobNo), csvSafe(r.seller), csvSafe(r.buyer),
      csvSafe(r.commodity), csvSafe(r.origin), csvSafe(r.qty), csvSafe(r.rate), csvSafe(r.nett),
      csvSafe(r.delivery), csvSafe(r.deliveryLoc), csvSafe(r.quality), csvSafe(r.packaging)
    ];
    csvRows.push(row.join(','));
  });
  downloadBlob(csvRows.join('\n'), `${jobNo}_bcs.csv`, 'text/csv;charset=utf-8;');
}

function exportFilteredCSV() {
  const map = aggregatePerJob();
  const commodityVal = commodityFilter.value;
  const filterVal = (filterInput.value || "").trim().toLowerCase();
  const rows = Object.values(map)
    .filter(r => (!commodityVal || r.commodity === commodityVal) && (!filterVal || r.jobNo.toLowerCase().includes(filterVal)))
    .map(r => ({
      jobNo: r.jobNo, overall: r.overall, commodity: r.commodity, location: r.location, origin: r.origin,
      currentQty: r.currentQty, soldQty: r.soldQty, totalNett: r.totalNett, totalExpense: r.totalExpense
    }));
  if (!rows.length) return alert('No jobs to export for current filters.');
  const headers = ['Job No','Overall Qty (MT)','Commodity','Location','Origin','Current Qty (MT)','Sold Qty (MT)','Total Nett (Rs)','Total Expense (Rs)'];
  const csvRows = [headers.join(',')];
  rows.forEach(r => {
    csvRows.push([csvSafe(r.jobNo), csvSafe(r.overall), csvSafe(r.commodity), csvSafe(r.location), csvSafe(r.origin),
      csvSafe(r.currentQty), csvSafe(r.soldQty), csvSafe(r.totalNett), csvSafe(r.totalExpense)].join(','));
  });
  downloadBlob(csvRows.join('\n'), `filtered_jobs_summary.csv`, 'text/csv;charset=utf-8;');
}

function exportAllCSV() {
  const map = aggregatePerJob();
  const rows = Object.values(map);
  if (!rows.length) return alert('No jobs to export.');
  const headers = ['Job No','Overall Qty (MT)','Commodity','Location','Origin','Current Qty (MT)','Sold Qty (MT)','Total Nett (Rs)','Total Expense (Rs)'];
  const csvRows = [headers.join(',')];
  rows.forEach(r => {
    csvRows.push([csvSafe(r.jobNo), csvSafe(r.overall), csvSafe(r.commodity), csvSafe(r.location), csvSafe(r.origin),
      csvSafe(r.currentQty), csvSafe(r.soldQty), csvSafe(r.totalNett), csvSafe(r.totalExpense)].join(','));
  });
  downloadBlob(csvRows.join('\n'), `all_jobs_summary.csv`, 'text/csv;charset=utf-8;');
}

// PDF generation: inline open in new tab (user requested inline in table)
function openJobPdf(jobNo) {
  const map = aggregatePerJob();
  const r = map[jobNo];
  if (!r) return alert('No job data for ' + jobNo);

  // create a PDF summary for the job — uses jsPDF and autoTable already loaded in the page
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  doc.setFontSize(12);
  doc.setFont("helvetica","bold");
  doc.text(`Job Summary — ${r.jobNo}`, 40, 50);

  doc.setFontSize(10);
  doc.setFont("helvetica","normal");
  doc.text(`Commodity: ${r.commodity || '—'}`, 40, 70);
  doc.text(`Stock Location: ${r.location || '—'}`, 40, 86);
  doc.text(`Origin: ${r.origin || '—'}`, 40, 102);

  // details table
  const body = [
    ['Overall Qty (MT)', formatNumber(r.overall)],
    ['Current Qty (MT)', formatNumber(r.currentQty)],
    ['Sold Qty (MT)', formatNumber(r.soldQty)],
    ['Total Nett (Rs)', `Rs ${formatNumber(r.totalNett)}`],
    ['Total Expense (Rs)', `Rs ${formatNumber(r.totalExpense)}`]
  ];
  doc.autoTable({
    startY: 120,
    head: [['Particulars','Value']],
    body,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [16,185,129], textColor: 255, halign: 'center' }
  });

  // add BC rows for this job inline in the PDF
  const jobBcs = bcs.filter(x => x.jobNo === r.jobNo);
  if (jobBcs.length) {
    const bcTable = jobBcs.map((b, i) => ([
      (i+1).toString(),
      b.bcNo || '',
      b.date ? new Date(b.date).toLocaleDateString('en-GB').replace(/\//g,'-') : '',
      (b.qty || ''),
      (b.rate || ''),
      (b.nett || '')
    ]));
    doc.autoTable({
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 240,
      head: [['#','BC No','Date','Qty (MT)','Rate/MT','Nett (Rs)']],
      body: bcTable,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [220,53,69], textColor: 255 }
    });
  }

  // open PDF inline in new tab
  const arrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// Export filtered jobs PDF (multiple jobs, inline)
function exportFilteredJobsPDF() {
  const map = aggregatePerJob();
  const commodityVal = commodityFilter.value;
  const filterVal = (filterInput.value || "").trim().toLowerCase();
  const rows = Object.values(map)
    .filter(r => (!commodityVal || r.commodity === commodityVal) && (!filterVal || r.jobNo.toLowerCase().includes(filterVal)))
    .sort((a,b)=> a.jobNo.localeCompare(b.jobNo));
  if (!rows.length) return alert('No jobs to export for current filters.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(12);
  doc.setFont("helvetica","bold");
  doc.text(`Filtered Jobs Summary (${rows.length} jobs)`, 40, 50);

  const tableBody = rows.map(r => [
    r.jobNo, formatNumber(r.overall), r.commodity || '', r.location || '', r.origin || '',
    formatNumber(r.currentQty), formatNumber(r.soldQty), `Rs ${formatNumber(r.totalNett)}`, `Rs ${formatNumber(r.totalExpense)}`
  ]);
  doc.autoTable({
    startY: 80,
    head: [['Job No','Overall','Commodity','Location','Origin','Current','Sold','Total Nett','Total Expense']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [6,95,70], textColor:255 }
  });

  const arrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function exportAllJobsPDF() {
  const map = aggregatePerJob();
  const rows = Object.values(map).sort((a,b)=> a.jobNo.localeCompare(b.jobNo));
  if (!rows.length) return alert('No jobs to export.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(12);
  doc.setFont("helvetica","bold");
  doc.text(`All Jobs Summary (${rows.length} jobs)`, 40, 50);

  const tableBody = rows.map(r => [
    r.jobNo, formatNumber(r.overall), r.commodity || '', r.location || '', r.origin || '',
    formatNumber(r.currentQty), formatNumber(r.soldQty), `Rs ${formatNumber(r.totalNett)}`, `Rs ${formatNumber(r.totalExpense)}`
  ]);
  doc.autoTable({
    startY: 80,
    head: [['Job No','Overall','Commodity','Location','Origin','Current','Sold','Total Nett','Total Expense']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [6,95,70], textColor:255 }
  });

  const arrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// ---------------- UTILITIES ----------------
function formatNumber(n) {
  // Show up to 2 decimal places, but keep as number formatting
  if (n === null || n === undefined || isNaN(Number(n))) return '—';
  // We must compute digit-by-digit style accuracy: use Number and toLocaleString accordingly
  const val = Number(n) || 0;
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, function(m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
  });
}

function csvSafe(val) {
  if (val === undefined || val === null) return '';
  const s = String(val).replace(/"/g, '""');
  if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
  return s;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* preciseAdd - handle floating arithmetic more robustly */
function preciseAdd(a, b) {
  // convert to integer by scaling
  const s = 100; // two decimal precision
  const ai = Math.round(Number(a || 0) * s);
  const bi = Math.round(Number(b || 0) * s);
  return (ai + bi) / s;
}
