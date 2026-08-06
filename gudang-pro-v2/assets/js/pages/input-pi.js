import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("input-pi.html", profile);
  wireMobileMenu();

  let allRows = [];
  let items = [];

  async function loadItems() {
    const { data } = await supabase.from("items").select("id, sku, name").order("name");
    items = data || [];
    document.getElementById("item_id").innerHTML =
      '<option value="">— Pilih item —</option>' +
      items.map((i) => `<option value="${i.id}">${i.sku} — ${i.name}</option>`).join("");
  }

  async function loadList() {
    const { data, error } = await supabase
      .from("pi_input")
      .select("id, pi_number, qty_planned, qty_realized, status, note, created_at, items ( sku, name )")
      .order("created_at", { ascending: false });

    if (error) {
      toast("Gagal memuat data: " + error.message, "error");
      return;
    }
    allRows = data || [];
    render(allRows);
  }

  function statusBadge(s) {
    if (s === "selesai") return '<span class="badge badge-ok">Selesai</span>';
    if (s === "proses") return '<span class="badge badge-warn">Proses</span>';
    return '<span class="badge badge-muted">Draft</span>';
  }

  function render(rows) {
    const body = document.getElementById("pi-body");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state">Belum ada PI.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td class="num">${r.pi_number}</td>
          <td>${r.items?.sku ?? "-"} — ${r.items?.name ?? "(dihapus)"}</td>
          <td class="num">${r.qty_planned}</td>
          <td class="num">${r.qty_realized}</td>
          <td>${statusBadge(r.status)}</td>
          <td style="font-size:11.5px;">${formatDate(r.created_at)}</td>
          <td>
            <select data-id="${r.id}" class="status-select" style="padding:4px 6px;font-size:12px;border:1px solid var(--line);border-radius:4px;">
              <option value="draft" ${r.status === "draft" ? "selected" : ""}>Draft</option>
              <option value="proses" ${r.status === "proses" ? "selected" : ""}>Proses</option>
              <option value="selesai" ${r.status === "selesai" ? "selected" : ""}>Selesai</option>
            </select>
          </td>
        </tr>`
      )
      .join("");

    body.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        const id = e.target.dataset.id;
        const { error } = await supabase.from("pi_input").update({ status: e.target.value }).eq("id", id);
        if (error) toast("Gagal update status: " + error.message, "error");
        else {
          toast("Status PI diperbarui", "success");
          await logActivity("update status PI", `PI id ${id} -> ${e.target.value}`);
          loadList();
        }
      });
    });
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allRows.filter((r) => r.pi_number.toLowerCase().includes(q) || (r.items?.name || "").toLowerCase().includes(q)));
  });

  document.getElementById("pi-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit");
    btn.disabled = true;

    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      pi_number: document.getElementById("pi_number").value.trim(),
      item_id: Number(document.getElementById("item_id").value),
      qty_planned: Number(document.getElementById("qty_planned").value),
      note: document.getElementById("note").value.trim() || null,
      created_by: session.user.id,
    };

    if (!payload.item_id) {
      toast("Pilih item terlebih dahulu", "error");
      btn.disabled = false;
      return;
    }

    const { error } = await supabase.from("pi_input").insert(payload);
    btn.disabled = false;

    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }
    toast("PI berhasil dibuat", "success");
    await logActivity("buat PI", payload.pi_number);
    e.target.reset();
    loadList();
  });

  await loadItems();
  await loadList();
}
