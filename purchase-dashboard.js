/* purchase-summary.js
   Dashboard for Trading Purchases (uses Plotly)
   Expects purchases API: GET http://127.0.0.1:5000/api/purchases
   Accepts optional query params: businessNo, from, to (your existing API)
*/

(() => {
  const API_URL = "https://backend-service-1-f006.onrender.com/api/purchases";

  // DOM
  const cardsMonth = document.getElementById("cardsMonth");
  const applyCardsMonth = document.getElementById("applyCardsMonth");
  const clearCardsMonth = document.getElementById("clearCardsMonth");

  const graphFrom = document.getElementById("graphFrom");
  const graphTo = document.getElementById("graphTo");
  const commodityFilter = document.getElementById("commodityFilter");
  const applyGraphFilters = document.getElementById("applyGraphFilters");
  const clearGraphFilters = document.getElementById("clearGraphFilters");

  const lastUpdatedValue = document.getElementById("lastUpdatedValue");
  const totalPurchasesValue = document.getElementById("totalPurchasesValue");
  const totalUSDValue = document.getElementById("totalUSDValue");
  const totalINRValue = document.getElementById("totalINRValue");
  const totalQtyValue = document.getElementById("totalQtyValue");

  // Plot containers
  const chartPurchasesByDate = document.getElementById("chartPurchasesByDate");
  const chartCommodityPie = document.getElementById("chartCommodityPie");
  const chartAmountLine = document.getElementById("chartAmountLine");
  const chartQuantityByCommodity = document.getElementById("chartQuantityByCommodity");

  // Utilities
  function parseDateOnly(d) {
    // returns YYYY-MM-DD string for Date-compatible inputs
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date)) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatDDMMYYYY(d) {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date)) return d;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  // Fetch purchases with optional params
  async function fetchPurchases(params = {}) {
    const url = new URL(API_URL);
    Object.keys(params).forEach((k) => {
      if (params[k]) url.searchParams.append(k, params[k]);
    });
    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error("Purchases fetch failed", res.status);
        return [];
      }
      const data = await res.json();
      // ensure array
      return Array.isArray(data) ? data : (data.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      return [];
    }
  }

  // Build list of unique commodities for commodity filter
  function populateCommodityList(allData) {
    const set = new Set();
    allData.forEach((r) => {
      const c = (r.commodity || "").trim() || "Unknown";
      set.add(c);
    });
    // clear
    commodityFilter.innerHTML = `<option value="All">All</option>`;
    Array.from(set).sort().forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      commodityFilter.appendChild(opt);
    });
  }

  // Aggregate helpers
  function aggByDateCount(data) {
    // returns { dates: [], counts: [] } — dates sorted ascending
    const map = new Map();
    data.forEach((r) => {
      let d = r.date || r.createdAt || "";
      d = parseDateOnly(d) || "";
      if (!d) return;
      map.set(d, (map.get(d) || 0) + 1);
    });
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return { dates: entries.map(e => e[0]), counts: entries.map(e => e[1]) };
  }

  function aggByDateSumAmountUSD(data) {
    const map = new Map();
    data.forEach((r) => {
      let d = parseDateOnly(r.date) || "";
      if (!d) return;
      const amt = parseFloat(r.amountUSD) || 0;
      map.set(d, (map.get(d) || 0) + amt);
    });
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return { dates: entries.map(e => e[0]), amounts: entries.map(e => e[1]) };
  }

  function aggCommodityDistribution(data) {
    const map = new Map();
    data.forEach((r) => {
      const c = (r.commodity || "Unknown").trim();
      map.set(c, (map.get(c) || 0) + 1);
    });
    const entries = Array.from(map.entries()).sort((a,b) => b[1]-a[1]);
    return { labels: entries.map(e=>e[0]), values: entries.map(e=>e[1]) };
  }

  function aggQtyByDateAndCommodity(data, commodityFilterValue = "All") {
    // returns { dates: [..], series: {commodity: [qty per date ...] } }
    // Collect set of dates and commodities
    const datesSet = new Set();
    const commoditiesSet = new Set();

    const rows = data.map(r => {
      const d = parseDateOnly(r.date);
      const c = (r.commodity || "Unknown").trim();
      const q = parseFloat(r.buyingQty) || 0;
      if (!d) return null;
      datesSet.add(d);
      commoditiesSet.add(c);
      return { date:d, commodity:c, qty:q };
    }).filter(Boolean);

    const dates = Array.from(datesSet).sort((a,b) => a.localeCompare(b));
    const commodities = Array.from(commoditiesSet).sort();

    // initialize series
    const series = {};
    commodities.forEach(c => {
      series[c] = dates.map(() => 0);
    });

    rows.forEach(r => {
      if (commodityFilterValue !== "All" && r.commodity !== commodityFilterValue) return;
      const di = dates.indexOf(r.date);
      if (di >= 0) series[r.commodity][di] += r.qty;
    });

    // if commodityFilterValue is specific, include only that commodity in series
    const finalSeries = {};
    if (commodityFilterValue === "All") {
      Object.keys(series).forEach(k => finalSeries[k] = series[k]);
    } else {
      // if commodity doesn't exist in series, add empty series for it
      finalSeries[commodityFilterValue] = series[commodityFilterValue] || dates.map(()=>0);
    }

    return { dates, series: finalSeries };
  }

  // Cards aggregation for a selected month (YYYY-MM)
  function filterForMonth(data, month) {
    if (!month) return data;
    // month expected "YYYY-MM"
    return data.filter(r => {
      const d = parseDateOnly(r.date);
      if (!d) return false;
      return d.startsWith(month);
    });
  }

  function sumField(data, field) {
    return data.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);
  }

  // Rendering functions
  function renderCardsForMonth(allData, month) {
    const filtered = filterForMonth(allData, month);
    totalPurchasesValue.textContent = filtered.length;
    totalUSDValue.textContent = (sumField(filtered, "amountUSD") || 0).toFixed(2);
    totalINRValue.textContent = (sumField(filtered, "amountINR") || 0).toFixed(2);
    totalQtyValue.textContent = (sumField(filtered, "buyingQty") || 0).toFixed(2);
  }

  function renderLastUpdated(allData) {
    // Not affected by month filter: find latest date among all data and display
    const dates = allData
      .map(r => parseDateOnly(r.date))
      .filter(Boolean)
      .sort((a,b) => b.localeCompare(a));
    if (dates.length === 0) {
      lastUpdatedValue.textContent = "No data";
      return;
    }
    const latest = dates[0];
    lastUpdatedValue.textContent = formatDDMMYYYY(latest);
  }

  // Plotly renders
  function plotPurchasesByDate(data) {
    const agg = aggByDateCount(data);
    const x = agg.dates.map(d => d); // YYYY-MM-DD
    const y = agg.counts;

    const trace = {
      x, y, type: 'bar', marker: { line: { width: 0 } },
      hovertemplate: '%{x}<br>Purchases: %{y}<extra></extra>'
    };
    const layout = {
      margin: { t: 20, r: 20, l: 50, b: 50 },
      xaxis: { title: 'Date' },
      yaxis: { title: 'Number of Purchases' },
      responsive: true
    };
    Plotly.newPlot(chartPurchasesByDate, [trace], layout, {displayModeBar: false});
  }

  function plotCommodityPie(data) {
    const agg = aggCommodityDistribution(data);
    const trace = { labels: agg.labels, values: agg.values, type: 'pie', textinfo: 'label+percent', hoverinfo: 'label+value' };
    const layout = { margin: { t: 10, b: 10, l: 10, r: 10 }, responsive: true };
    Plotly.newPlot(chartCommodityPie, [trace], layout, {displayModeBar: false});
  }

  function plotAmountLine(data) {
    const agg = aggByDateSumAmountUSD(data);
    const x = agg.dates;
    const y = agg.amounts.map(a => parseFloat(a.toFixed(2)));

    const trace = { x, y, type:'scatter', mode:'lines+markers', hovertemplate: '%{x}<br>USD %{y:.2f}<extra></extra>' };
    const layout = { margin: { t: 20, r: 20, l: 50, b: 50 }, xaxis:{title:'Date'}, yaxis:{title:'Amount (USD)'}, responsive:true };
    Plotly.newPlot(chartAmountLine, [trace], layout, {displayModeBar: false});
  }

  function plotQuantityByCommodity(data, commoditySelected) {
    const agg = aggQtyByDateAndCommodity(data, commoditySelected);
    const dates = agg.dates;
    const traces = Object.keys(agg.series).map((commodity) => {
      return {
        x: dates,
        y: agg.series[commodity].map(v => parseFloat(v.toFixed(2))),
        name: commodity,
        type: 'bar',
        hovertemplate: '%{x}<br>%{y:.2f} MT<extra></extra>'
      };
    });

    // If only one commodity selected, keep single color and bar mode
    const layout = {
      barmode: 'stack', // stack makes sense to see totals; grouped if you'd prefer: 'group'
      margin: { t: 20, r: 20, l: 60, b: 60 },
      xaxis: { title: 'Date' },
      yaxis: { title: 'Quantity (MT)' },
      legend: { orientation: 'h', xanchor: 'center', x: 0.5, y: -0.15 },
      responsive: true
    };
    Plotly.newPlot(chartQuantityByCommodity, traces, layout, {displayModeBar: false});
  }

  // Controller: get all data, populate cards and charts using filters
  async function initializeDashboard() {
    // fetch all data (for commodity list and last updated)
    const allData = await fetchPurchases({});
    populateCommodityList(allData);
    renderLastUpdated(allData);

    // set default cardsMonth to current month
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    cardsMonth.value = defaultMonth;

    // initial card render
    renderCardsForMonth(allData, cardsMonth.value);

    // initial chart render: use graphFrom/To defaults = whole range
    // set graphFrom to earliest date and graphTo to latest date
    const allDates = allData.map(r => parseDateOnly(r.date)).filter(Boolean).sort();
    if (allDates.length) {
      graphFrom.value = allDates[0];
      graphTo.value = allDates[allDates.length - 1];
    } else {
      // fallback to today
      const dstr = parseDateOnly(new Date());
      graphFrom.value = dstr;
      graphTo.value = dstr;
    }

    // draw charts based on initial filters
    await renderCharts(); // uses fetch with date filter
  }

  // Render charts using graph date range and commodity filter
  async function renderCharts() {
    const from = parseDateOnly(graphFrom.value);
    const to = parseDateOnly(graphTo.value);
    const commoditySelected = commodityFilter.value || "All";

    // Fetch with from/to params if present
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const data = await fetchPurchases(params);

    // apply commodity filter client-side for pie and amount/qty when commodity is specific? We'll
    // keep pie showing distribution of the fetched set (which can be narrowed by date),
    // and the quantity chart will use commoditySelected to narrow series (or show all).

    // Charts
    plotPurchasesByDate(data);
    plotCommodityPie(data);
    plotAmountLine(data);
    plotQuantityByCommodity(data, commoditySelected);
  }

  // Event handlers
  applyCardsMonth.addEventListener("click", async () => {
    const month = cardsMonth.value || "";
    const allData = await fetchPurchases({});
    renderCardsForMonth(allData, month);
  });

  clearCardsMonth.addEventListener("click", async () => {
    cardsMonth.value = "";
    const allData = await fetchPurchases({});
    renderCardsForMonth(allData, ""); // all data
  });

  applyGraphFilters.addEventListener("click", async () => {
    await renderCharts();
  });

  clearGraphFilters.addEventListener("click", async () => {
    // clear date filters to wide range (all)
    const allData = await fetchPurchases({});
    const allDates = allData.map(r => parseDateOnly(r.date)).filter(Boolean).sort();
    if (allDates.length) {
      graphFrom.value = allDates[0];
      graphTo.value = allDates[allDates.length - 1];
    } else {
      const dstr = parseDateOnly(new Date());
      graphFrom.value = dstr;
      graphTo.value = dstr;
    }
    commodityFilter.value = "All";
    await renderCharts();
  });

  // When commodity filter changed, refresh quantity chart quickly
  commodityFilter.addEventListener("change", async () => {
    await renderCharts();
  });

  // initialize on load
  initializeDashboard();

  // Optional: refresh last-updated periodically (every 60s)
  setInterval(async () => {
    const allData = await fetchPurchases({});
    renderLastUpdated(allData);
  }, 60_000);

})();
