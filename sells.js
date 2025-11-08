const API_BASE = (window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':'+window.location.port : '')).replace(/:3000$/, ':5000');
const BACKEND = 'https://backend-service-2-pmrn.onrender.com';

const jobNoInput = document.getElementById('jobNoInput');
const overallQtyInput = document.getElementById('overallQtyInput');
const jobCommodityInput = document.getElementById('jobCommoditySelect');
const jobLocationInput = document.getElementById('stockLocationInput');
const jobOriginInput = document.getElementById('originInputJob');

const currentQtyDisplay = document.getElementById('currentQtyDisplay');
const saveJobBtn = document.getElementById('saveJobBtn');
const addBusinessBtn = document.getElementById('addBusinessBtn');
const exportJobCSVBtn = document.getElementById('exportJobCSVBtn');

const bcFormSection = document.getElementById('bcFormSection');
const bcForm = document.getElementById('bcForm');

const bcNo = document.getElementById('bcNo');
const bcDate = document.getElementById('bcDate');
const bcJobNo = document.getElementById('bcJobNo');

const sellerSelect = document.getElementById('sellerSelect');
const sellerOther = document.getElementById('sellerOther');

const commoditySelect = document.getElementById('commoditySelect');
const commodityOther = document.getElementById('commodityOther');

const qtyInput = document.getElementById('qtyInput');
const rateInput = document.getElementById('rateInput');
const nettAmountDisplay = document.getElementById('nettAmountDisplay');

const deliveryDate = document.getElementById('deliveryDate');
const deliveryLocation = document.getElementById('deliveryLocation');

const qualitySelect = document.getElementById('qualitySelect');
const qualityOther = document.getElementById('qualityOther');

const packagingSelect = document.getElementById('packagingSelect');
const packagingOther = document.getElementById('packagingOther');

const paymentSelect = document.getElementById('paymentSelect');
const paymentOther = document.getElementById('paymentOther');

const brokerageSelect = document.getElementById('brokerageSelect');
const brokerageOther = document.getElementById('brokerageOther');

const brokerName = document.getElementById('brokerName');
const kycInput = document.getElementById('kycInput');

const termsSelect = document.getElementById('termsSelect');
const termsOther = document.getElementById('termsOther');

const notesSelect = document.getElementById('notesSelect');
const notesOther = document.getElementById('notesOther');

const soudaSelect = document.getElementById('soudaSelect');
const soudaOther = document.getElementById('soudaOther');

const bankSelect = document.getElementById('bankSelect');
const bankOther = document.getElementById('bankOther');

const submitBcBtn = document.getElementById('submitBcBtn');
const cancelBcBtn = document.getElementById('cancelBcBtn');

const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const filterJobNo = document.getElementById('filterJobNo');
const filterBcNo = document.getElementById('filterBcNo');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const exportFilteredCSVBtn = document.getElementById('exportFilteredCSVBtn');

const bcTableBody = document.querySelector('#bcTable tbody');
const rowsCount = document.getElementById('rowsCount');
const exportAllCSVBtn = document.getElementById('exportAllCSVBtn');




jobCommodityInput.addEventListener('change', () => {
  toggleOtherInput(jobCommodityInput, document.getElementById('jobCommodityOther'));
});
 


// Jobs now store more info per job
// { jobNo: { overall, commodity, location, origin } }
let jobs = {}; 
let bcs = [];  
let editingBcId = null; 

console.log("Trading Sells Page Loaded (backend mode)");
init();

async function init() {
  await loadJobsFromServer();
  await loadBcsFromServer();
  renderJobsIfAny();
  attachListeners();
  renderTable();
}

/* ---------- Helper functions ---------- */

function formatNumber(n) {
  if (n === null || n === undefined || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function computeNett(qty, rate) {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  return q * r;
}

function recalcCurrentQty(jobNo) {
  const job = jobs[jobNo];
  if (!job) return { overall: 0, used: 0, current: 0 };
  const overall = Number(job.overall || 0);
  const used = bcs.reduce((acc, bc) => bc.jobNo === jobNo ? acc + (Number(bc.qty) || 0) : acc, 0);
  const current = overall - used;
  return { overall, used, current };
}

/* ---------- Backend API functions ---------- */

async function loadJobsFromServer() {
  try {
    const res = await fetch(`${BACKEND}/api/jobs`);
    if (!res.ok) throw new Error('Failed to load jobs');
    const data = await res.json();
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
    console.error('loadJobsFromServer error', e);
    alert('Could not load jobs from backend. Is backend running?');
  }
}

async function saveJobToServer(jobNo, overall, commodity, location, origin) {
  try {
    const res = await fetch(`${BACKEND}/api/jobs`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({jobNo, overall, commodity, location, origin})
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:'unknown'}));
      throw new Error(err.error || 'Failed to save job');
    }
    await loadJobsFromServer();
    renderJobsIfAny();
    return true;
  } catch (e) {
    console.error('saveJobToServer error', e);
    alert('Failed to save job: ' + e.message);
    return false;
  }
}

async function loadBcsFromServer() {
  try {
    const res = await fetch(`${BACKEND}/api/bcs`);
    if (!res.ok) throw new Error('Failed to load bcs');
    bcs = await res.json();
  } catch (e) {
    console.error('loadBcsFromServer error', e);
    alert('Could not load BCs from backend. Is backend running?');
  }
}

async function createBcOnServer(bc) {
  try {
    const res = await fetch(`${BACKEND}/api/bcs`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(bc)
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:'unknown'}));
      throw new Error(err.error || 'Failed to create BC');
    }
    const doc = await res.json();
    bcs.push(doc);
    return doc;
  } catch (e) {
    console.error('createBcOnServer error', e);
    alert('Failed to save BC: ' + e.message);
    return null;
  }
}

async function updateBcOnServer(id, bc) {
  try {
    const res = await fetch(`${BACKEND}/api/bcs/${id}`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(bc)
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:'unknown'}));
      throw new Error(err.error || 'Failed to update BC');
    }
    const doc = await res.json();
    const idx = bcs.findIndex(x => x._id === id);
    if (idx !== -1) bcs[idx] = doc;
    return doc;
  } catch (e) {
    console.error('updateBcOnServer error', e);
    alert('Failed to update BC: ' + e.message);
    return null;
  }
}

async function deleteBcOnServer(id) {
  try {
    const res = await fetch(`${BACKEND}/api/bcs/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(()=>({error:'unknown'}));
      throw new Error(err.error || 'Failed to delete BC');
    }
    bcs = bcs.filter(x => x._id !== id);
    return true;
  } catch (e) {
    console.error('deleteBcOnServer error', e);
    alert('Failed to delete BC: ' + e.message);
    return false;
  }
}



// When Job No entered → fetch from backend if exists
jobNoInput.addEventListener('blur', async () => {
  const jobNo = jobNoInput.value.trim();
  if (!jobNo) return;

  if (jobs[jobNo]) {
    // Exists in frontend cache
    const job = jobs[jobNo];
    overallQtyInput.value = job.overall;
    jobCommodityInput.value = job.commodity || '';
    jobLocationInput.value = job.location || '';
    jobOriginInput.value = job.origin || '';
  } else {
    // Optional: fetch from backend if missing in frontend
    try {
      const res = await fetch(`${BACKEND}/api/jobs/${jobNo}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          jobs[jobNo] = {
            overall: data.job.overall,
            commodity: data.job.commodity,
            location: data.job.location,
            origin: data.job.origin
          };
          overallQtyInput.value = data.job.overall;
          jobCommodityInput.value = data.job.commodity || '';
          jobLocationInput.value = data.job.location || '';
          jobOriginInput.value = data.job.origin || '';
        } else {
          // New job
          overallQtyInput.value = '';
          jobCommodityInput.value = '';
          jobLocationInput.value = '';
          jobOriginInput.value = '';
        }
      }
    } catch (err) {
      console.error('Error fetching job from backend', err);
    }
  }

  updateCurrentQtyDisplay();
});






/* ---------- UI wiring ---------- */

function attachListeners() {
  saveJobBtn.addEventListener('click', async () => {
  const jobNo = jobNoInput.value.trim();
  const overall = parseFloat(overallQtyInput.value) || 0;
  const commodity = jobCommodityInput.value === 'Other' ? 
                    document.getElementById('jobCommodityOther').value.trim() : 
                    jobCommodityInput.value;
  const location = jobLocationInput.value.trim();
  const origin = jobOriginInput.value.trim();

  if (!jobNo) return alert('Please enter Job No.');
  const ok = await saveJobToServer(jobNo, overall, commodity, location, origin);
  if (ok) alert('Job saved.');
  updateCurrentQtyDisplay();
});


  addBusinessBtn.addEventListener('click', () => {
    const jobNo = jobNoInput.value.trim();
    if (!jobNo) return alert('Please enter Job No. and Save Job before adding Business.');
    if (!jobs[jobNo] && jobs[jobNo] !== 0) return alert('Please Save Job after entering Overall Job Quantity.');
    bcFormSection.classList.toggle('hidden');
    if (!bcFormSection.classList.contains('hidden')) {
      resetBcForm();
      bcJobNo.value = jobNo;
      bcDate.value = (new Date()).toISOString().slice(0,10);
      scrollIntoView(bcFormSection);
    }
  });

  exportJobCSVBtn.addEventListener('click', () => {
    const jobNo = jobNoInput.value.trim();
    if (!jobNo) return alert('Enter job number to export its CSV.');
    const rows = bcs.filter(b => b.jobNo === jobNo);
    if (!rows.length) return alert('No BCs for this job.');
    downloadCSV(rows, `${jobNo}_businesses.csv`);
  });

  // dynamic "Other" fields toggles
  sellerSelect.addEventListener('change', () => toggleOtherInput(sellerSelect, sellerOther));
  commoditySelect.addEventListener('change', () => toggleOtherInput(commoditySelect, commodityOther));
  qualitySelect.addEventListener('change', () => toggleOtherInput(qualitySelect, qualityOther));
  packagingSelect.addEventListener('change', () => toggleOtherInput(packagingSelect, packagingOther));
  paymentSelect.addEventListener('change', () => toggleOtherInput(paymentSelect, paymentOther));
  brokerageSelect.addEventListener('change', () => toggleOtherInput(brokerageSelect, brokerageOther));
  termsSelect.addEventListener('change', () => toggleOtherInput(termsSelect, termsOther));
  notesSelect.addEventListener('change', () => toggleOtherInput(notesSelect, notesOther));
  soudaSelect.addEventListener('change', () => toggleOtherInput(soudaSelect, soudaOther));
  bankSelect.addEventListener('change', () => toggleOtherInput(bankSelect, bankOther));

  // Nett calc
  qtyInput.addEventListener('input', updateNett);
  rateInput.addEventListener('input', updateNett);

  submitBcBtn.addEventListener('click', handleBcSubmit);
  cancelBcBtn.addEventListener('click', () => { bcFormSection.classList.add('hidden'); editingBcId = null; });

  // filters & exports
  applyFilterBtn.addEventListener('click', renderTable);
  resetFilterBtn.addEventListener('click', () => {
    filterFrom.value = ''; filterTo.value = ''; filterJobNo.value = ''; filterBcNo.value = '';
    renderTable();
  });
  exportFilteredCSVBtn.addEventListener('click', () => {
    const filtered = getFilteredBcs();
    if (!filtered.length) return alert('No rows to export for current filters.');
    downloadCSV(filtered, `filtered_businesses.csv`);
  });

  exportAllCSVBtn.addEventListener('click', () => {
    if (!bcs.length) return alert('No BC records.');
    downloadCSV(bcs, `all_businesses.csv`);
  });

  jobNoInput.addEventListener('input', () => {
    bcJobNo.value = jobNoInput.value.trim();
    updateCurrentQtyDisplay();
  });
  overallQtyInput.addEventListener('input', () => updateCurrentQtyDisplay());
  jobCommodityInput.addEventListener('input', () => updateCurrentQtyDisplay());
  jobLocationInput.addEventListener('input', () => updateCurrentQtyDisplay());
  jobOriginInput.addEventListener('input', () => updateCurrentQtyDisplay());
}


/* ---------- Form behaviours ---------- */

function toggleOtherInput(sel, otherEl) {
  if (sel.value === 'Other') otherEl.classList.remove('hidden');
  else {
    otherEl.classList.add('hidden');
    otherEl.value = '';
  }
}

function updateNett() {
  const qty = Number(qtyInput.value) || 0;
  const rate = Number(rateInput.value) || 0;
  const nett = computeNett(qty, rate);
  nettAmountDisplay.innerText = isNaN(nett) ? '—' : `Rs ${formatNumber(nett)}`;
}

function resetBcForm() {
  bcForm.reset();
  sellerOther.classList.add('hidden');
  commodityOther.classList.add('hidden');
  qualityOther.classList.add('hidden');
  packagingOther.classList.add('hidden');
  paymentOther.classList.add('hidden');
  brokerageOther.classList.add('hidden');
  termsOther.classList.add('hidden');
  notesOther.classList.add('hidden');
  soudaOther.classList.add('hidden');
  bankOther.classList.add('hidden');
  nettAmountDisplay.innerText = '—';
  editingBcId = null;
}

/* ---------- Submit / Edit / Delete ---------- */

async function handleBcSubmit() {
  const bc = readBcForm();
  if (!bc) return; // validation failed or user canceled
  if (editingBcId) {
    // update on server
    const updated = await updateBcOnServer(editingBcId, bc);
    if (updated) {
      editingBcId = null;
      bcFormSection.classList.add('hidden');
      renderTable();
      updateCurrentQtyDisplay();
    }
  } else {
    const created = await createBcOnServer(bc);
    if (created) {
      bcFormSection.classList.add('hidden');
      renderTable();
      updateCurrentQtyDisplay();
    }
  }
}

function readBcForm() {
  const bcno = bcNo.value.trim();
  if (!bcno) return alert('Enter Business Confirmation No.');
  const date = bcDate.value || '';
  const jobNoVal = bcJobNo.value.trim();
  if (!jobNoVal) return alert('Missing Job No in form.');

  const seller = sellerSelect.value === 'Other' ? (sellerOther.value.trim() || sellerOther.placeholder) : sellerSelect.value;
  const buyer = document.getElementById('buyerInput').value.trim() || 'Name & Full Details with KYC required before lifting';
  const commodity = commoditySelect.value === 'Other' ? (commodityOther.value.trim() || commodityOther.placeholder) : commoditySelect.value;
  const origin = document.getElementById('originInput').value.trim();
  const qty = Number(qtyInput.value) || 0;
  const rate = Number(rateInput.value) || 0;
  const nett = computeNett(qty, rate);

  const delivery = deliveryDate.value || '';
  const deliveryLoc = deliveryLocation.value.trim();

  const quality = qualitySelect.value === 'Other' ? (qualityOther.value.trim() || qualityOther.placeholder) : qualitySelect.value;
  const packaging = packagingSelect.value === 'Other' ? (packagingOther.value.trim() || packagingOther.placeholder) : packagingSelect.value;
  const payment = paymentSelect.value === 'Other' ? (paymentOther.value.trim() || paymentOther.placeholder) : paymentSelect.value;
  const brokerage = brokerageSelect.value === 'Other' ? (brokerageOther.value.trim() || brokerageOther.placeholder) : brokerageSelect.value;
  const broker = brokerName.value.trim();
  const kyc = kycInput.value.trim();

  const terms = termsSelect.value === 'Other' ? (termsOther.value.trim() || termsOther.placeholder) : termsSelect.value;
  const notes = notesSelect.value === 'Other' ? (notesOther.value.trim() || notesOther.placeholder) : notesSelect.value;
  const souda = soudaSelect.value === 'Other' ? (soudaOther.value.trim() || soudaOther.placeholder) : soudaSelect.value;
  const bank = bankSelect.value === 'Other' ? (bankOther.value.trim() || bankOther.placeholder) : bankSelect.value;

  const overall = Number(jobs[jobNoVal] || 0);
  const usedBefore = bcs.reduce((acc, b) => (b.jobNo === jobNoVal ? acc + Number(b.qty || 0) : acc), 0);
  const willBeUsed = usedBefore + qty;
  if (overall > 0 && willBeUsed > overall + 1e-6) {
    if (!confirm(`Total assigned quantity (${willBeUsed} MT) exceeds Overall Job Quantity (${overall} MT). Continue?`)) return null;
  }

  const bc = {
    bcNo: bcno,
    date,
    jobNo: jobNoVal,
    seller,
    buyer,
    commodity,
    origin,
    qty: Number(qty.toFixed(2)),
    rate: Number(rate.toFixed(2)),
    nett: Number(nett.toFixed(2)),
    delivery,
    deliveryLoc,
    quality,
    packaging,
    payment,
    brokerage,
    broker,
    kyc,
    terms,
    notes,
    souda,
    bank,
    
  };
  return bc;
}

function editBc(id) {
  const bc = bcs.find(x => x._id === id);
  if (!bc) return alert('Record not found (maybe reloaded).');
  editingBcId = id;
  // populate form
  bcNo.value = bc.bcNo;
  bcDate.value = bc.date || '';
  bcJobNo.value = bc.jobNo;
  sellerSelect.value = ['Hemraj Industries Pvt. Ltd.', 'Radheshyam Industries Pvt. Ltd.'].includes(bc.seller) ? bc.seller : 'Other';
  sellerOther.value = sellerSelect.value === 'Other' ? bc.seller : '';
  toggleOtherInput(sellerSelect, sellerOther);

  document.getElementById('buyerInput').value = bc.buyer || '';
  commoditySelect.value = ['Australian Mapte','Canadian Mapte','Canadian Yellow Peas','Russian/Ukrainian Yellow Peas','Australian Red Lentils-Nipper','Australian Red Lentils-Nugget','Canadian Red Lentils-Crimson','Australian Chickpeas','Tanzanian Chickpeas','Indian Desi Chickpeas','Black Matpe- FAQ','Black Matpe- SQ','Pigeon Peas-Lemon','Wheat Milling Quality','Maize','Sugar S-30/S-31','Sugar M-30/M-31','Sugar L-30/L-31','Cumin','Coriander','Turmeric','Rice','Oil'].includes(bc.commodity) ? bc.commodity : 'Other';
  commodityOther.value = commoditySelect.value === 'Other' ? bc.commodity : '';
  toggleOtherInput(commoditySelect, commodityOther);

  document.getElementById('originInput').value = bc.origin || '';
  qtyInput.value = bc.qty || '';
  rateInput.value = bc.rate || '';
  updateNett();

  deliveryDate.value = bc.delivery || '';
  deliveryLocation.value = bc.deliveryLoc || '';

  qualitySelect.value = bc.quality === 'As is Where is Basis. No claim.' ? bc.quality : 'Other';
  qualityOther.value = qualitySelect.value === 'Other' ? bc.quality : '';
  toggleOtherInput(qualitySelect, qualityOther);

  packagingSelect.value = bc.packaging === '50 Kg PP Bag Approx' ? bc.packaging : 'Other';
  packagingOther.value = packagingSelect.value === 'Other' ? bc.packaging : '';
  toggleOtherInput(packagingSelect, packagingOther);

  paymentSelect.value = bc.payment === 'Advance Before Lifting' ? bc.payment : 'Other';
  paymentOther.value = paymentSelect.value === 'Other' ? bc.payment : '';
  toggleOtherInput(paymentSelect, paymentOther);

  brokerageSelect.value = bc.brokerage === 'As Per Kolkata Market Terms' ? bc.brokerage : 'Other';
  brokerageOther.value = brokerageSelect.value === 'Other' ? bc.brokerage : '';
  toggleOtherInput(brokerageSelect, brokerageOther);

  brokerName.value = bc.broker || '';
  kycInput.value = bc.kyc || '';

  termsSelect.value = bc.terms === 'If the Buyer fails...' ? bc.terms : 'Other';
  termsOther.value = termsSelect.value === 'Other' ? bc.terms : '';
  toggleOtherInput(termsSelect, termsOther);

  notesSelect.value = bc.notes === 'Full Payment needs...' ? bc.notes : 'Other';
  notesOther.value = notesSelect.value === 'Other' ? bc.notes : '';
  toggleOtherInput(notesSelect, notesOther);

  soudaSelect.value = bc.souda === 'The above souda...' ? bc.souda : 'Other';
  soudaOther.value = soudaSelect.value === 'Other' ? bc.souda : '';
  toggleOtherInput(soudaSelect, soudaOther);

  bankSelect.value = bc.bank === 'Beneficiary Name: ....' ? bc.bank : 'Other';
  bankOther.value = bankSelect.value === 'Other' ? bc.bank : '';
  toggleOtherInput(bankSelect, bankOther);

  bcFormSection.classList.remove('hidden');
  scrollIntoView(bcFormSection);
}

async function deleteBc(id) {
  if (!confirm('Delete this Business Confirmation?')) return;
  const ok = await deleteBcOnServer(id);
  if (ok) {
    renderTable();
    updateCurrentQtyDisplay();
  }
}

/* ---------- Table rendering & filtering ---------- */

function getFilteredBcs() {
  const from = filterFrom.value ? new Date(filterFrom.value) : null;
  const to = filterTo.value ? new Date(filterTo.value) : null;
  const fJob = filterJobNo.value.trim().toLowerCase();
  const fBc = filterBcNo.value.trim().toLowerCase();

  return bcs.filter(bc => {
    if (from) {
      const d = bc.date ? new Date(bc.date) : null;
      if (!d || d < from) return false;
    }
    if (to) {
      const d = bc.date ? new Date(bc.date) : null;
      if (!d || d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23,59,59)) return false;
    }
    if (fJob && !bc.jobNo.toLowerCase().includes(fJob)) return false;
    if (fBc && !bc.bcNo.toLowerCase().includes(fBc)) return false;
    return true;
  });
}

function renderTable() {
const rows = getFilteredBcs().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  bcTableBody.innerHTML = '';
  rows.forEach((bc, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(bc.bcNo)}</td>
      <td>${bc.date ? new Date(bc.date).toLocaleDateString('en-GB').replace(/\//g, '-') : ''}</td>
      <td>${escapeHtml(bc.jobNo)}</td>
      <td>${escapeHtml(bc.seller)}</td>
      <td>${escapeHtml(bc.buyer)}</td>
      <td>${escapeHtml(bc.commodity)}</td>
      <td>${formatNumber(bc.qty)}</td>
      <td>Rs ${formatNumber(bc.rate)}</td>
      <td>Rs ${formatNumber(bc.nett)}</td>
      <td>${bc.delivery || ''}</td>
      <td>${escapeHtml(bc.deliveryLoc || '')}</td>
      <td>
        <button class="btn" data-action="edit" data-id="${bc._id}">Edit</button>
        <button class="btn" data-action="pdf" data-id="${bc._id}">PDF</button>
        <button class="btn" data-action="delete" data-id="${bc._id}">Delete</button>
      </td>
    `;
    bcTableBody.appendChild(tr);
  });
  rowsCount.innerText = `${rows.length} record(s)`;
  Array.from(bcTableBody.querySelectorAll('button')).forEach(btn => {
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    btn.addEventListener('click', () => {
      const bc = bcs.find(x => x._id === id);
      if (action === 'edit') editBc(id);
      if (action === 'delete') deleteBc(id);
      if (action === 'pdf') generatePdfForBc(bc);
    });
  });
}

/* ---------- CSV export ---------- */

function downloadCSV(rows, filename = 'export.csv') {
  if (!rows || !rows.length) { alert('No rows to export'); return; }
  const headers = [
    'BC No', 'Date', 'Job No', 'Seller', 'Buyer', 'Commodity', 'Origin', 'Quantity (MT)',
    'Rate/MT (Rs)', 'Nett Amount (Rs)', 'Delivery Date', 'Delivery Location', 'Quality',
    'Packaging', 'Payment Terms', 'Brokerage', 'Broker Name', 'KYC', 'Terms', 'Special Notes',
    'Souda Confirmation', 'Bank Details', 'Created At'
  ];
  const csvRows = [headers.join(',')];
  rows.forEach(r => {
    const row = [
      csvSafe(r.bcNo), csvSafe(r.date ? new Date(r.date).toLocaleDateString('en-GB').replace(/\//g, '-') : '')
      , csvSafe(r.jobNo), csvSafe(r.seller), csvSafe(r.buyer),
      csvSafe(r.commodity), csvSafe(r.origin), csvSafe(r.qty), csvSafe(r.rate), csvSafe(r.nett),
      csvSafe(r.delivery), csvSafe(r.deliveryLoc), csvSafe(r.quality), csvSafe(r.packaging),
      csvSafe(r.payment), csvSafe(r.brokerage), csvSafe(r.broker), csvSafe(r.kyc),
      csvSafe(r.terms), csvSafe(r.notes), csvSafe(r.souda), csvSafe(r.bank), csvSafe(r.createdAt)
    ];
    csvRows.push(row.join(','));
  });
  const blob = new Blob([csvRows.join('\n')], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function csvSafe(val) {
  if (val === undefined || val === null) return '';
  const s = String(val).replace(/"/g, '""');
  if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
  return s;
}

/* ---------- PDF export for a BC (Letterhead style) ---------- */

async function generatePdfForBc(bc) {
  if (!bc) return alert("BC data missing for PDF.");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });



  // --- TITLE ---
 
doc.setFontSize(11);
doc.setFont("helvetica", "bold");

// Title text
const titleText = "We are pleased to confirm your Souda As per Below Details";
const pageMargin = 40;          // left/right page margin
const tableWidth = 515;         // same as red header width
const boxTopY = 115;            // vertical start position
const boxHeight = 25;           // height of the title box

// Draw box (same width as table)
doc.rect(pageMargin, boxTopY, tableWidth, boxHeight);

// Center text inside the box
const textWidth = doc.getTextWidth(titleText);
const textX = pageMargin + (tableWidth - textWidth) / 2;
const textY = boxTopY + 17;  // vertically centered text
doc.text(titleText, textX, textY);

// Move table startY to attach to box bottom
const tableStartY = boxTopY + boxHeight;


  // --- MAIN TABLE ---
  const table = [
    ["1", "Business Confirmation No. & Date", 
 `${bc.bcNo || ""} Dated ${bc.date ? new Date(bc.date).toLocaleDateString('en-GB').replace(/\//g, '-') : ""}`],
    ["2", "Job No.", bc.jobNo || ""],
    ["3", "Seller", bc.seller || ""],
    ["4", "Buyer", bc.buyer || ""],
    ["5", "Commodity", bc.commodity || ""],
    ["6", "Origin", bc.origin || ""],
    ["7", "Quantity (MT)", bc.qty ? `${bc.qty} MT (+-10%) Sellers Option` : ""],
    ["8", "Rate/MT", bc.rate ? `Rs. ${bc.rate} Per MT` : ""],
    ["9", "Delivery/Lifting Period", bc.delivery ? `Max ${new Date(bc.delivery).toLocaleDateString('en-GB').replace(/\//g, '-')}` : ""],
    ["10", "Delivery Location", bc.deliveryLoc || ""],
    ["11", "Quality Specifications", bc.quality || ""],
    ["12", "Packing", bc.packaging || ""],
    ["13", "Nett Amount", bc.nett ? `Rs. ${bc.nett} /-(Final Amt as per Lifting Qty)` : ""],
    ["14", "Payment Terms", bc.payment || ""],
    ["15", "Brokerage", bc.brokerage || ""],
    ["16", "Broker Name", bc.broker || ""],
    ["17", "KYC's", bc.kyc || ""],
    ["18", "Terms & Conditions", bc.terms || ""],
    ["19", "Special Notes", bc.notes || ""],
    ["20", "Souda Confirmation", bc.souda || ""],
    ["21", "Bank Details for Payment", bc.bank || ""],
  ];

  doc.autoTable({
    startY: 145,
    head: [["Sl", "Particulars", "Remarks"]],
    body: table,
    styles: { fontSize: 9, cellPadding: 4, valign: "top" },
    headStyles: {
      fillColor: [220, 53, 69],
      textColor: 255,
      halign: "center",
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 25, halign: "center" },
      1: { cellWidth: 180 },
      2: { cellWidth: 310 },
    },
    theme: "grid",
  });

  const endY = doc.lastAutoTable.finalY + 5;

  // --- SIGNATURE ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("For Any Enquiry / Information Please Contact:", 50, endY + 20);

  doc.setFont("helvetica");
  doc.text("Name:", 50, endY + 40);
  doc.setFont("helvetica", "normal");
  doc.text("   Rajesh Mehta", 90, endY + 40);
  doc.text("Ph No:      9830054054", 50, endY + 55);
  doc.text("E-mail:      rajesh.mehta@hemrajgroup.co.in", 50, endY + 70);





  doc.save(`${bc.bcNo || "Business_Confirmation"}.pdf`);
}

/* ---------- Utilities ---------- */

function renderJobsIfAny() {
  const keys = Object.keys(jobs);
  if (!jobNoInput.value && keys.length === 1) {
    jobNoInput.value = keys[0];
    overallQtyInput.value = jobs[keys[0]];
    bcJobNo.value = keys[0];
  } else {
    // if present jobNo input corresponds to a known job, fill overall
    const curJob = jobNoInput.value.trim();
    if (curJob && jobs[curJob] !== undefined) overallQtyInput.value = jobs[curJob];
  }
  updateCurrentQtyDisplay();
}

function updateCurrentQtyDisplay() {
  const jobNo = jobNoInput.value.trim();
  if (!jobNo) {
    currentQtyDisplay.innerText = '— MT';
    return;
  }
  const res = recalcCurrentQty(jobNo);
  currentQtyDisplay.innerText = `${formatNumber(res.current)} MT (Used ${formatNumber(res.used)} / Overall ${formatNumber(res.overall)})`;
}

function scrollIntoView(el) {
  el.scrollIntoView({behavior: 'smooth', block: 'center'});
}

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, function(m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
  });
}