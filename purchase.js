console.log("✅ Trading Purchase Page Loaded — Manual Conversion Rate Enabled");

(() => {
  const API_URL = "https://backend-service-1-f006.onrender.com/api/purchases";

  // ------------------- Field Definitions -------------------
  const fields = [
    { key: "businessNo", label: "Business Confirmation No." },
    { key: "date", label: "Date" },
    { key: "seller", label: "Seller" },
    { key: "buyer", label: "Buyer" },
    { key: "kyc", label: "KYC Norms" },
    { key: "broker", label: "Broker Name / Direct" },
    { key: "commodity", label: "Commodity" },
    { key: "country", label: "Country of Origin" },
    { key: "qualitySpec", label: "Quality Specification / Standard" },
    { key: "packing", label: "Packing" },
    { key: "shipmentPeriod", label: "Shipment / Delivery Period" },
    { key: "brokerage", label: "Brokerage" },
    { key: "vessel", label: "Vessel Name" },
    { key: "loadingConditions", label: "Loading Conditions" },
    { key: "buyingQty", label: "Buying Quantity(In MT)" },
    { key: "priceIncoterms", label: "Price(Per MT)" },
    { key: "Incoterms", label: "Incoterms" },
    { key: "conversionRate", label: "Purchase Date Conversion Rate (USD→INR)" },
    { key: "amountUSD", label: "Total Amount (In USD)" },
    { key: "amountINR", label: "Total Amount (In INR)" },
    { key: "paymentTerms", label: "Payment Terms" },
    { key: "weightQuality", label: "Weight and Quality" },
    { key: "gafta", label: "GAFTA Contract No. 88" },
    { key: "fumigation", label: "Fumigation" },
    { key: "documents", label: "Documents" },
    { key: "freeDays", label: "Free Days" },
  ];

  // ------------------- DOM Elements -------------------
  const form = document.getElementById("bcForm");
  const editIndexEl = document.getElementById("editIndex");
  const submitBtn = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");
  const tableBody = document.getElementById("tableBody");
  const tableHeadRow = document.getElementById("tableHeadRow");

  const filterFrom = document.getElementById("filterFrom");
  const filterTo = document.getElementById("filterTo");
  const filterBc = document.getElementById("filterBc");
  const applyFiltersBtn = document.getElementById("applyFilters");
  const clearFiltersBtn = document.getElementById("clearFilters");

  const commoditySelect = document.getElementById("commoditySelect");
  const commodityOther = document.getElementById("commodityOther");

  const buyingQtyInput = form.elements["buyingQty"];
  const priceInput = form.elements["priceIncoterms"];
  const amountUSDInput = form.elements["amountUSD"];
  const amountINRInput = form.elements["amountINR"];
  const conversionRateInput = form.elements["conversionRate"];

  // ------------------- Commodity Toggle -------------------
  function toggleOtherInput() {
    if (commoditySelect.value === "Other") {
      commodityOther.classList.remove("hidden");
      commodityOther.required = true;
    } else {
      commodityOther.classList.add("hidden");
      commodityOther.required = false;
      commodityOther.value = "";
    }
  }
  commoditySelect.addEventListener("change", toggleOtherInput);
  toggleOtherInput();

  // ------------------- Amount Calculation -------------------
  function updateAmountUSD() {
    const qty = parseFloat(buyingQtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const usdAmount = qty * price;
    amountUSDInput.value = usdAmount ? usdAmount.toFixed(2) : "";
    recalcINR();
  }

  function recalcINR() {
    const usdAmount = parseFloat(amountUSDInput.value) || 0;
    const rate = parseFloat(conversionRateInput.value) || 0;
    if (!rate) {
      amountINRInput.value = "";
      return;
    }
    const inrAmount = usdAmount * rate;
    amountINRInput.value = inrAmount ? inrAmount.toFixed(2) : "";
  }

  buyingQtyInput.addEventListener("input", updateAmountUSD);
  priceInput.addEventListener("input", updateAmountUSD);
  conversionRateInput.addEventListener("input", recalcINR);

  // ------------------- API Utilities -------------------
  async function fetchPurchases() {
    const params = new URLSearchParams();
    if (filterBc.value.trim()) params.append("businessNo", filterBc.value.trim());
    if (filterFrom.value) params.append("from", filterFrom.value);
    if (filterTo.value) params.append("to", filterTo.value);

    const res = await fetch(`${API_URL}?${params.toString()}`);
    return await res.json();
  }

  async function addPurchase(data) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  }

  async function updatePurchase(id, data) {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  }

  async function deletePurchase(id) {
    if (!confirm("Delete this Business Confirmation?")) return;
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    renderTable();
  }

  // ------------------- Form Handling -------------------
  function clearForm() {
    form.reset();
    editIndexEl.value = "-1";
    submitBtn.textContent = "Submit";
    amountUSDInput.value = "";
    amountINRInput.value = "";
    toggleOtherInput();
  }

  function readForm() {
    const obj = {};
    fields.forEach((f) => {
      const el = form.elements[f.key];
      if (f.key === "commodity") {
        obj[f.key] =
          commoditySelect.value === "Other"
            ? commodityOther.value.trim()
            : commoditySelect.value.trim();
      } else {
        obj[f.key] = el ? el.value.trim() : "";
      }
    });
    return obj;
  }

  // ------------------- Date Formatting -------------------
  function formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // ------------------- Table Rendering -------------------
  async function renderTable() {
    const data = await fetchPurchases();
    tableBody.innerHTML = "";

    data.forEach((row) => {
      const tr = document.createElement("tr");
      fields.forEach((f) => {
        const td = document.createElement("td");
        let value = row[f.key] || "";
        if (f.key === "date") value = formatDateDDMMYYYY(value);
        td.textContent = value;
        td.title = value;
        tr.appendChild(td);
      });

      const tdActions = document.createElement("td");
      const wrap = document.createElement("div");
      wrap.className = "row-actions";

      const pdfBtn = document.createElement("button");
      pdfBtn.className = "pdf-btn";
      pdfBtn.textContent = "Export PDF";
      pdfBtn.onclick = () => exportPdfForRow(row);

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.onclick = () => startEdit(row);

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "Delete";
      delBtn.onclick = () => deletePurchase(row._id);

      wrap.append(pdfBtn, editBtn, delBtn);
      tdActions.appendChild(wrap);
      tr.appendChild(tdActions);
      tableBody.appendChild(tr);
    });
  }

  function buildTableHeader() {
    tableHeadRow.innerHTML = "";
    fields.forEach((f) => {
      const th = document.createElement("th");
      th.textContent = f.label;
      tableHeadRow.appendChild(th);
    });
    const thActions = document.createElement("th");
    thActions.textContent = "Actions";
    tableHeadRow.appendChild(thActions);
  }

  // ------------------- Edit / Submit -------------------
  async function startEdit(row) {
    fields.forEach((f) => {
      const el = form.elements[f.key];
      if (f.key === "commodity") {
        const options = Array.from(commoditySelect.options).map((o) => o.value);
        if (options.includes(row[f.key])) {
          commoditySelect.value = row[f.key];
          commodityOther.value = "";
        } else {
          commoditySelect.value = "Other";
          commodityOther.value = row[f.key];
        }
        toggleOtherInput();
      } else if (el) {
        el.value = row[f.key] || "";
      }
    });
    editIndexEl.value = row._id;
    submitBtn.textContent = "Save";
    updateAmountUSD();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = readForm();
    if (!data.businessNo) return alert("Business Confirmation No. is required.");
    if (!data.date) return alert("Date is required.");

    const id = editIndexEl.value;
    if (id && id !== "-1") {
      await updatePurchase(id, data);
    } else {
      await addPurchase(data);
    }

    clearForm();
    renderTable();
  });

  resetBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    if (confirm("Clear form?")) clearForm();
  });

  // ------------------- Filters -------------------
  applyFiltersBtn.addEventListener("click", () => renderTable());
  clearFiltersBtn.addEventListener("click", () => {
    filterFrom.value = "";
    filterTo.value = "";
    filterBc.value = "";
    renderTable();
  });

  // ------------------- PDF Export -------------------
  function exportPdfForRow(row) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - margin * 2;
    let y = 80;
    const lineHeight = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Business Confirmation Details", pageWidth / 2, y, { align: "center" });
    y += 15;

    const col1Width = 220;
    const col2Width = tableWidth - col1Width;
    const startX = margin;

    doc.setFontSize(11);
    doc.setLineWidth(0.8);
    doc.rect(startX, y, tableWidth, lineHeight);
    doc.text("Sl", startX + 10, y + 14);
    doc.text("Particulars", startX + 40, y + 14);
    doc.text("Remarks", startX + col1Width + 10, y + 14);
    y += lineHeight;

    let sl = 1;
    fields.forEach((f) => {
  const key = f.key;
  const label = f.label;
  let value = row[key] || "";
  if (key === "date") value = formatDateDDMMYYYY(value);

  const labelLines = doc.splitTextToSize(label, col1Width - 45); // Wrap label
  const valLines = doc.splitTextToSize(value, col2Width - 15);

  // Adjust height dynamically for multiline labels or values
  const rowHeight = Math.max(lineHeight, Math.max(labelLines.length, valLines.length) * 13 + 4);

  // Draw cells
  doc.rect(startX, y, 30, rowHeight);
  doc.rect(startX + 30, y, col1Width - 30, rowHeight);
  doc.rect(startX + col1Width, y, col2Width, rowHeight);

  // Add text with wrapping
  doc.setFont("helvetica", "normal");
  doc.text(String(sl), startX + 10, y + 14);
  doc.text(labelLines, startX + 40, y + 14); // Wrapped label text
  doc.text(valLines, startX + col1Width + 10, y + 14); // Wrapped value text

  y += rowHeight;
  sl++;

  if (y > 770) {
    doc.addPage();
    y = 60;
  }
});


    const safeBc = (row.businessNo || "BC").replace(/[^a-z0-9\-_]/gi, "_");
    doc.save(`${safeBc}_BusinessConfirmation.pdf`);
  }

  // ------------------- Initialize -------------------
  buildTableHeader();
  renderTable();
})();
