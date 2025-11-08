console.log("Trading Expense Dashboard Loaded");

const BASE_URL = "https://backend-service-1-f006.onrender.com/api/expenses"; // Flask backend endpoint

const expenseHeads = [
  "Clearing Cost",
  "P.P. Bags",
  "Warehouse/Port Rent",
  "Stock Management",
  "Labour Charges/Sweeping/Restacking",
  "Loading/Unloading charges/Hamali/Khamali charges",
  "Weighment Charges",
  "Surveyor Charges",
  "Transportation Charges",
  "Others"
];

// ---------- GLOBALS ----------
let jobs = [];
const bcContainer = document.getElementById("bcContainer");
const expenseContainer = document.getElementById("expenseContainer");
const addBCBtn = document.getElementById("addBCBtn");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const submitBtn = document.getElementById("submitBtn");
const filterInput = document.getElementById("filterInput");
const resultTable = document.querySelector("#resultTable tbody");

let editingId = null;

// ---------- BUSINESS CONFIRMATIONS ----------
function addBCEntry(bc = {}) {
  const div = document.createElement("div");
  div.classList.add("bc-row");
  div.innerHTML = `
    <input type="text" placeholder="Business Confirmation No." value="${bc.bcNo || ""}" required>
    <input type="number" placeholder="Quantity (MT)" step="0.01" value="${bc.qty || ""}" required>
    <input type="number" placeholder="Rate/MT" step="0.01" value="${bc.rate || ""}" required>
    <input type="number" placeholder="Amount" step="0.01" value="${bc.amount || ""}" readonly>
    <button type="button" class="removeBC">X</button>
  `;
  bcContainer.appendChild(div);

  const qtyInput = div.children[1];
  const rateInput = div.children[2];
  const amountInput = div.children[3];
  const removeBtn = div.children[4];

  function updateAmount() {
    const qty = parseFloat(qtyInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    amountInput.value = (qty * rate).toFixed(2);
  }

  qtyInput.addEventListener("input", updateAmount);
  rateInput.addEventListener("input", updateAmount);
  removeBtn.addEventListener("click", () => div.remove());
}


// ---------- EXPENSE HEADS (With Date) ----------
let expenses = [];

function addExpenseRow(data = {}) {
  const div = document.createElement("div");
  div.classList.add("expense-row");

  const selectedHead = data.head || "";
  const selectedDate = data.date || "";
  const amount = data.amount || "";
  const note = data.note || "";

  div.innerHTML = `
    <select class="expense-select">
      <option value="">Select Expense Head</option>
      ${expenseHeads.map(h => `<option value="${h}" ${h === selectedHead ? "selected" : ""}>${h}</option>`).join("")}
    </select>
    <input type="number" class="expense-amount" placeholder="Amount (INR)" step="0.01" value="${amount}">
    <input type="date" class="expense-date" value="${selectedDate}">
    <input type="text" class="other-note" placeholder="Specify if Others" value="${note}" style="display:${selectedHead === "Others" ? "inline-block" : "none"}">
    <button type="button" class="removeExpense">X</button>
  `;

  const select = div.querySelector(".expense-select");
  const amountInput = div.querySelector(".expense-amount");
  const dateInput = div.querySelector(".expense-date");
  const noteInput = div.querySelector(".other-note");
  const removeBtn = div.querySelector(".removeExpense");

  // Update expense list when any input changes
  const updateExpenseList = () => {
    const allRows = [...expenseContainer.querySelectorAll(".expense-row")];
    expenses = allRows.map(r => {
      return {
        head: r.querySelector(".expense-select").value || "",
        amount: parseFloat(r.querySelector(".expense-amount").value) || 0,
        date: r.querySelector(".expense-date").value || "",
        note: r.querySelector(".other-note").value || ""
      };
    });
  };

  select.addEventListener("change", () => {
    if (select.value === "Others") {
      noteInput.style.display = "inline-block";
    } else {
      noteInput.style.display = "none";
      noteInput.value = "";
    }
    updateExpenseList();
  });

  [amountInput, dateInput, noteInput].forEach(el => {
    el.addEventListener("input", updateExpenseList);
  });

  removeBtn.addEventListener("click", () => {
    div.remove();
    updateExpenseList();
  });

  expenseContainer.appendChild(div);
  updateExpenseList();
}

// ---------- CALCULATIONS ----------
function calculateJobData(jobNo, overallQty, bcData, expenseData) {
  const totalAmt = bcData.reduce((sum, bc) => sum + parseFloat(bc.amount || 0), 0);
  const totalQty = bcData.reduce((sum, bc) => sum + parseFloat(bc.qty || 0), 0);
  const avgRate = totalQty ? totalAmt / totalQty : 0;

  const totalExpense = expenseData.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const avgExpense = overallQty ? totalExpense / overallQty : 0;

  return { jobNo, overallQty, avgRate, avgExpense, bcData, expenseData };
}

// ---------- FETCH / RENDER TABLE ----------
async function fetchJobs() {
  const filterValue = filterInput.value.trim();
  let url = BASE_URL;
  if (filterValue) url += `?jobNo=${encodeURIComponent(filterValue)}`;

  try {
    const res = await fetch(url);
    jobs = await res.json();
    renderTable();
  } catch (err) {
    console.error(err);
    alert("Error fetching jobs from server.");
  }
}

function renderTable() {
  resultTable.innerHTML = "";

  if (jobs.length === 0) {
    resultTable.innerHTML = `<tr><td colspan="4" style="text-align:center;">No jobs found</td></tr>`;
    return;
  }

  jobs.forEach((job) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${job.jobNo}</td>
      <td>${(job.avgRate || 0).toFixed(2)}</td>
      <td>${(job.avgExpense || 0).toFixed(2)}</td>
      <td>
        <button onclick="editJob('${job._id}')">Edit</button>
        <button onclick="deleteJob('${job._id}')">Delete</button>
        <button onclick="exportPdf('${job._id}')">Export PDF</button>
      </td>
    `;
    resultTable.appendChild(tr);
  });
}

// ---------- SAVE / UPDATE JOB ----------
submitBtn.addEventListener("click", async () => {
  const jobNo = document.getElementById("jobNo").value.trim();
  const overallQty = parseFloat(document.getElementById("overallQty").value) || 0;

  if (!jobNo || overallQty <= 0) {
    alert("Please enter valid Job No. and Overall Quantity.");
    return;
  }

  const bcData = [];
  bcContainer.querySelectorAll(".bc-row").forEach(row => {
    const bcNo = row.children[0].value.trim();
    const qty = parseFloat(row.children[1].value) || 0;
    const rate = parseFloat(row.children[2].value) || 0;
    const amount = parseFloat(row.children[3].value) || 0;
    if (bcNo) bcData.push({ bcNo, qty, rate, amount });
  });

  const expenseData = [];
  expenseContainer.querySelectorAll(".expense-row").forEach(row => {
    const head = row.querySelector(".expense-select").value;
    const amount = parseFloat(row.querySelector('input[type="number"]').value) || 0;
    const date = row.querySelector(".expense-date").value;
    const note = row.querySelector(".other-note").value.trim();
    if (head) expenseData.push({ head, amount, date, note });
  });

  const job = calculateJobData(jobNo, overallQty, bcData, expenseData);

  try {
    if (editingId) {
      await fetch(`${BASE_URL}/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job)
      });
      editingId = null;
    } else {
      await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job)
      });
    }
    alert("Job saved successfully!");
    resetForm();
    fetchJobs();
  } catch (err) {
    console.error(err);
    alert("Error saving job.");
  }
});

// ---------- RESET FORM ----------
function resetForm() {
  document.getElementById("jobNo").value = "";
  document.getElementById("overallQty").value = "";
  bcContainer.innerHTML = "";
  expenseContainer.innerHTML = "";
  editingId = null;
  addBCEntry();
  addExpenseRow();
}

// ---------- EDIT / DELETE ----------
window.editJob = function(id) {
  const job = jobs.find(j => j._id === id);
  if (!job) return;

  editingId = id;
  document.getElementById("jobNo").value = job.jobNo;
  document.getElementById("overallQty").value = job.overallQty;

  bcContainer.innerHTML = "";
  job.bcData.forEach(bc => addBCEntry(bc));

  expenseContainer.innerHTML = "";
  job.expenseData.forEach(e => addExpenseRow(e));
};

window.deleteJob = async function(id) {
  if (!confirm("Delete this job?")) return;
  try {
    await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    fetchJobs();
  } catch (err) {
    console.error(err);
    alert("Error deleting job.");
  }
};

// ---------- PDF EXPORT ----------
window.exportPdf = function (id) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  const job = jobs.find(j => j._id === id);
  if (!job) {
    alert("Job not found for PDF export.");
    return;
  }

  const currentDate = new Date().toLocaleDateString();

  // === HEADER ===
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("HEMRAJ GROUP", pageWidth / 2, 12, { align: "center" });

  y += 20;
  doc.setTextColor(44, 62, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Trading Expense Report - ${job.jobNo}`, margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(52, 73, 94);
  doc.setFillColor(236, 240, 241);
  doc.roundedRect(margin - 4, y, pageWidth - margin * 2 + 8, 16, 3, 3, "F");
  doc.text(`Overall Quantity: ${job.overallQty} MT`, margin, y + 6);
  y += 20;

  // BUSINESS CONFIRMATIONS
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185);
  doc.text("Business Confirmations", margin, y);
  y += 4;

  const bcRows = job.bcData.map((bc, i) => [
    i + 1,
    bc.bcNo,
    `${bc.qty}`,
    `${bc.rate}`,
    `${bc.amount}`,
  ]);

  doc.autoTable({
    startY: y + 2,
    head: [["SI No.", "BC No", "Quantity (MT)", "Rate", "Amount"]],
    body: bcRows,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 10;

  // EXPENSE HEADS WITH DATE
  doc.setFont("helvetica", "bold");
  doc.setTextColor(39, 174, 96);
  doc.text("Expense Heads (INR)", margin, y);
  y += 4;

  const expenseRows = job.expenseData.map((e, i) => [
    i + 1,
    e.head,
    e.amount,
    e.date || "-",
    e.note || "-",
  ]);

  doc.autoTable({
    startY: y + 2,
    head: [["SI No.", "Expense Head", "Amount (INR)", "Date"]],
    body: expenseRows,
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [39, 174, 96], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 10;

  // SUMMARY
  doc.setFillColor(243, 156, 18);
  doc.roundedRect(margin - 4, y, pageWidth - margin * 2 + 8, 26, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Average Rate/MT: ${job.avgRate.toFixed(2)}`, margin, y + 9);
  doc.text(`Average Expense/MT: ${job.avgExpense.toFixed(2)}`, margin, y + 19);

  // FOOTER
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(149, 165, 166);
  doc.text(`Generated on: ${currentDate}`, pageWidth - margin, 285, { align: "right" });

  doc.save(`Expense_Report_${job.jobNo}.pdf`);
};

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  addBCEntry();
  addExpenseRow();
  fetchJobs();
});

filterInput.addEventListener("input", fetchJobs);
addBCBtn.addEventListener("click", () => addBCEntry());
addExpenseBtn.addEventListener("click", () => addExpenseRow());
