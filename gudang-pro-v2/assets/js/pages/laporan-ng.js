import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("laporan-ng.html", profile);
  wireMobileMenu();

  const monthLabels = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }));
  }
  const sinceDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: qcRows, error: qcErr } = await supabase
    .from("qc_inspection")
    .select("qty_inspected, qty_ng, ng_reason, material_name, batch_no, created_at")
    .gte("created_at", sinceDate.toISOString())
    .order("created_at", { ascending: false });

  const { data: dcRows, error: dcErr } = await supabase
    .from("diecut_process")
    .select("qty_reject, material_name, batch_no, created_at")
    .gte("created_at", sinceDate.toISOString())
    .order("created_at", { ascending: false });

  if (qcErr || dcErr) {
    toast("Gagal memuat data: " + (qcErr?.message || dcErr?.message), "error");
  }

  const totalInspected = (qcRows || []).reduce((s, r) => s + Number(r.qty_inspected), 0);
  const totalNg = (qcRows || []).reduce((s, r) => s + Number(r.qty_ng), 0);
  const totalReject = (dcRows || []).reduce((s, r) => s + Number(r.qty_reject), 0);

  document.getElementById("stat-inspected").textContent = totalInspected.toLocaleString("id-ID");
  document.getElementById("stat-ng").textContent = totalNg.toLocaleString("id-ID");
  document.getElementById("stat-reject").textContent = totalReject.toLocaleString("id-ID");
  document.getElementById("stat-rate").textContent = totalInspected > 0 ? ((totalNg / totalInspected) * 100).toFixed(1) + "%" : "0%";

  function bucketByMonth(rows, field) {
    const buckets = new Array(6).fill(0);
    (rows || []).forEach((r) => {
      const d = new Date(r.created_at);
      const idx = (d.getFullYear() - sinceDate.getFullYear()) * 12 + (d.getMonth() - sinceDate.getMonth());
      if (idx >= 0 && idx < 6) buckets[idx] += Number(r[field]);
    });
    return buckets;
  }

  const ngData = bucketByMonth(qcRows, "qty_ng");
  const rejectData = bucketByMonth(dcRows, "qty_reject");

  new Chart(document.getElementById("ng-chart"), {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        { label: "NG (QC)", data: ngData, backgroundColor: "#c2432a" },
        { label: "Reject (Diecut)", data: rejectData, backgroundColor: "#e3a53d" },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // Top alasan NG
  const reasonMap = {};
  (qcRows || []).forEach((r) => {
    const reason = r.ng_reason || "Tidak disebutkan";
    if (!reasonMap[reason]) reasonMap[reason] = { count: 0, qty: 0 };
    if (Number(r.qty_ng) > 0) {
      reasonMap[reason].count += 1;
      reasonMap[reason].qty += Number(r.qty_ng);
    }
  });
  const reasonRows = Object.entries(reasonMap)
    .filter(([, v]) => v.qty > 0)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 8);

  const reasonBody = document.getElementById("reason-body");
  reasonBody.innerHTML = reasonRows.length
    ? reasonRows.map(([reason, v]) => `<tr><td>${reason}</td><td class="num">${v.count}</td><td class="num">${v.qty}</td></tr>`).join("")
    : '<tr><td colspan="3" class="empty-state">Belum ada data NG.</td></tr>';

  // Detail terbaru: gabung qc (dengan ng>0) dan diecut reject
  const detailRows = [
    ...(qcRows || []).filter((r) => Number(r.qty_ng) > 0).map((r) => ({
      created_at: r.created_at, sumber: "QC Inspection", material: r.material_name, batch: r.batch_no, qty: r.qty_ng, ket: r.ng_reason || "-",
    })),
    ...(dcRows || []).filter((r) => Number(r.qty_reject) > 0).map((r) => ({
      created_at: r.created_at, sumber: "Proses Diecut", material: r.material_name, batch: r.batch_no, qty: r.qty_reject, ket: "Reject produksi",
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  function renderDetail(rows) {
    const body = document.getElementById("ng-body");
    body.innerHTML = rows.length
      ? rows
          .map(
            (r) => `<tr>
              <td style="font-size:11.5px;" class="num">${new Date(r.created_at).toLocaleDateString("id-ID")}</td>
              <td><span class="badge ${r.sumber === "QC Inspection" ? "badge-warn" : "badge-danger"}">${r.sumber}</span></td>
              <td>${r.material}</td>
              <td class="num">${r.batch || "-"}</td>
              <td class="num">${r.qty}</td>
              <td>${r.ket}</td>
            </tr>`
          )
          .join("")
      : '<tr><td colspan="6" class="empty-state">Belum ada kejadian NG.</td></tr>';
  }
  renderDetail(detailRows);

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    renderDetail(detailRows.filter((r) => r.material.toLowerCase().includes(q) || r.ket.toLowerCase().includes(q)));
  });
}
