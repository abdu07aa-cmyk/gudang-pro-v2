import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("kirim-produksi.html", profile);
  wireMobileMenu();

  let allRows = [];

  async function loadList() {
    const { data, error } = await supabase.from("kirim_produksi").select("*").order("created_at", { ascending: false });
    if (error) {
      toast("Gagal memuat data: " + error.message, "error");
      return;
    }
    allRows = data || [];
    render(allRows);
  }

  function render(rows) {
    const body = document.getElementById("kp-body");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada pengiriman ke produksi.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td style="font-size:11.5px;" class="num">${formatDate(r.created_at)}</td>
          <td>${r.material_name}</td>
          <td class="num">${r.batch_no || "-"}</td>
          <td class="num">${r.qty}</td>
          <td>${r.line_tujuan || "-"}</td>
          <td>${r.note || "-"}</td>
        </tr>`
      )
      .join("");
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allRows.filter((r) => r.material_name.toLowerCase().includes(q) || (r.line_tujuan || "").toLowerCase().includes(q)));
  });

  document.getElementById("kp-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit");
    btn.disabled = true;

    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      material_name: document.getElementById("material_name").value.trim(),
      batch_no: document.getElementById("batch_no").value.trim() || null,
      qty: Number(document.getElementById("qty").value),
      line_tujuan: document.getElementById("line_tujuan").value.trim() || null,
      note: document.getElementById("note").value.trim() || null,
      created_by: session.user.id,
    };

    const { error } = await supabase.from("kirim_produksi").insert(payload);
    btn.disabled = false;

    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }

    if (payload.batch_no) {
      await supabase
        .from("material_tracking")
        .update({ status: "terpakai", updated_at: new Date().toISOString() })
        .eq("batch_no", payload.batch_no);
    }

    toast("Pengiriman ke produksi dicatat", "success");
    await logActivity("kirim produksi", `${payload.material_name} sebanyak ${payload.qty} ke ${payload.line_tujuan || "-"}`);
    e.target.reset();
    loadList();
  });

  await loadList();
}
