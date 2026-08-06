import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("qc-inspection.html", profile);
  wireMobileMenu();

  let allRows = [];

  async function loadList() {
    const { data, error } = await supabase.from("qc_inspection").select("*").order("created_at", { ascending: false });
    if (error) {
      toast("Gagal memuat data: " + error.message, "error");
      return;
    }
    allRows = data || [];
    render(allRows);
  }

  function render(rows) {
    const body = document.getElementById("qc-body");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state">Belum ada data inspeksi.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td style="font-size:11.5px;" class="num">${formatDate(r.created_at)}</td>
          <td>${r.material_name}</td>
          <td class="num">${r.batch_no || "-"}</td>
          <td class="num">${r.qty_inspected}</td>
          <td class="num"><span class="badge badge-ok">${r.qty_pass}</span></td>
          <td class="num">${r.qty_ng > 0 ? `<span class="badge badge-danger">${r.qty_ng}</span>` : "0"}</td>
          <td>${r.ng_reason || "-"}</td>
        </tr>`
      )
      .join("");
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allRows.filter((r) => r.material_name.toLowerCase().includes(q) || (r.batch_no || "").toLowerCase().includes(q)));
  });

  document.getElementById("qc-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit");

    const qty_inspected = Number(document.getElementById("qty_inspected").value);
    const qty_pass = Number(document.getElementById("qty_pass").value);
    const qty_ng = Number(document.getElementById("qty_ng").value);

    if (qty_pass + qty_ng !== qty_inspected) {
      toast("Jumlah Pass + NG harus sama dengan Jumlah Diperiksa", "error");
      return;
    }

    btn.disabled = true;
    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      material_name: document.getElementById("material_name").value.trim(),
      batch_no: document.getElementById("batch_no").value.trim() || null,
      qty_inspected,
      qty_pass,
      qty_ng,
      ng_reason: document.getElementById("ng_reason").value.trim() || null,
      inspector_note: document.getElementById("inspector_note").value.trim() || null,
      created_by: session.user.id,
    };

    const { error } = await supabase.from("qc_inspection").insert(payload);
    btn.disabled = false;

    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }

    // update status tracking material jika batch cocok
    if (payload.batch_no) {
      await supabase
        .from("material_tracking")
        .update({ status: qty_ng > payload.qty_pass ? "retur" : "di gudang", updated_at: new Date().toISOString() })
        .eq("batch_no", payload.batch_no);
    }

    toast("Hasil inspeksi disimpan", "success");
    await logActivity("QC inspection", `${payload.material_name} — Pass ${qty_pass}, NG ${qty_ng}`);
    e.target.reset();
    loadList();
  });

  await loadList();
}
