import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("laporan-eksekutif.html", profile);
  wireMobileMenu();

  const monthLabels = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }));
  }
  const sinceDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { count: totalItems } = await supabase.from("items").select("*", { count: "exact", head: true });
  document.getElementById("stat-items").textContent = totalItems ?? 0;

  const { data: inRows } = await supabase
    .from("stock_in").select("qty, created_at").gte("created_at", sinceDate.toISOString());
  const { data: outRows } = await supabase
    .from("stock_out").select("qty, item_id, created_at").gte("created_at", sinceDate.toISOString());

  document.getElementById("stat-in").textContent = (inRows || []).reduce((s, r) => s + Number(r.qty), 0).toLocaleString("id-ID");
  document.getElementById("stat-out").textContent = (outRows || []).reduce((s, r) => s + Number(r.qty), 0).toLocaleString("id-ID");

  const { count: piActive } = await supabase
    .from("pi_input").select("*", { count: "exact", head: true }).in("status", ["draft", "proses"]);
  document.getElementById("stat-pi").textContent = piActive ?? 0;

  function bucketByMonth(rows) {
    const buckets = new Array(6).fill(0);
    (rows || []).forEach((r) => {
      const d = new Date(r.created_at);
      const idx = (d.getFullYear() - sinceDate.getFullYear()) * 12 + (d.getMonth() - sinceDate.getMonth());
      if (idx >= 0 && idx < 6) buckets[idx] += Number(r.qty);
    });
    return buckets;
  }

  const inData = bucketByMonth(inRows);
  const outData = bucketByMonth(outRows);

  new Chart(document.getElementById("trend-chart"), {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        { label: "Barang Masuk", data: inData, backgroundColor: "#0f766e" },
        { label: "Barang Keluar", data: outData, backgroundColor: "#e3a53d" },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // Top 5 item keluar
  const itemTotals = {};
  (outRows || []).forEach((r) => {
    itemTotals[r.item_id] = (itemTotals[r.item_id] || 0) + Number(r.qty);
  });
  const topIds = Object.entries(itemTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => Number(id));

  const body = document.getElementById("top-out-body");
  if (!topIds.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty-state">Belum ada data barang keluar.</td></tr>';
  } else {
    const { data: itemDetails } = await supabase.from("items").select("id, sku, name").in("id", topIds);
    const map = Object.fromEntries((itemDetails || []).map((i) => [i.id, i]));
    body.innerHTML = topIds
      .map((id) => {
        const item = map[id];
        return `<tr><td class="num">${item?.sku ?? "-"}</td><td>${item?.name ?? "(dihapus)"}</td><td class="num">${itemTotals[id]}</td></tr>`;
      })
      .join("");
  }
}
