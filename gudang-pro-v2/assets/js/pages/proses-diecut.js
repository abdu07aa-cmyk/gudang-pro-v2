import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("proses-diecut.html", profile);
  wireMobileMenu();

  let allRows = [];

  async function loadList() {
    const { data, error } = await supabase.from("diecut_process").select("*").order("created_at", { ascending: false });
    if (error) {
      toast("Gagal memuat data: " + error.message, "error");
      return;
    }
    allRows = data || [];
    render(allRows);
  }

  function render(rows) {
    const body = document.getElementById("dc-body");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state">Belum ada data proses diecut.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td style="font-size:11.5px;" class="num">${formatDate(r.created_at)}</td>
          <td>${r.material_name}</td>
          <td class="num">${r.batch_no || "-"}</td>
          <td>${r.machine || "-"}</td>
          <td class="num">${r.qty_input}</td>
          <td class="num">${r.qty_output}</td>
          <td class="num">${r.qty_reject > 0 ? `<span class="badge badge-danger">${r.qty_reject}</span>` : "0"}</td>
        </tr>`
      )
      .join("");
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allRows.filter((r) => r.material_name.toLowerCase().includes(q) || (r.machine || "").toLowerCase().includes(q)));
  });

  document.getElementById("dc-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit");
    btn.disabled = true;

    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      material_name: document.getElementById("material_name").value.trim(),
      batch_no: document.getElementById("batch_no").value.trim() || null,
      qty_input: Number(document.getElementById("qty_input").value),
      qty_output: Number(document.getElementById("qty_output").value) || 0,
      qty_reject: Number(document.getElementById("qty_reject").value) || 0,
      machine: document.getElementById("machine").value.trim() || null,
      note: document.getElementById("note").value.trim() || null,
      created_by: session.user.id,
    };

    const { error } = await supabase.from("diecut_process").insert(payload);
    btn.disabled = false;

    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }
    toast("Proses diecut dicatat", "success");
    await logActivity("proses diecut", `${payload.material_name} — output ${payload.qty_output}, reject ${payload.qty_reject}`);
    e.target.reset();
    loadList();
  });

  await loadList();
}
