import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("tracking-material.html", profile);
  wireMobileMenu();

  let allRows = [];

  async function loadList() {
    const { data, error } = await supabase
      .from("material_tracking")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast("Gagal memuat data: " + error.message, "error");
      return;
    }
    allRows = data || [];
    render(allRows);
  }

  function statusBadge(s) {
    if (s === "terpakai") return '<span class="badge badge-muted">Terpakai</span>';
    if (s === "retur") return '<span class="badge badge-danger">Retur</span>';
    if (s === "diterima") return '<span class="badge badge-warn">Diterima</span>';
    return '<span class="badge badge-ok">Di Gudang</span>';
  }

  function render(rows) {
    const body = document.getElementById("tm-body");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada data tracking.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td>${r.material_name}</td>
          <td class="num">${r.batch_no || "-"}</td>
          <td class="num">${r.qty}</td>
          <td>${r.location || "-"}</td>
          <td>${statusBadge(r.status)}</td>
          <td>
            <select data-id="${r.id}" class="status-select" style="padding:4px 6px;font-size:12px;border:1px solid var(--line);border-radius:4px;">
              <option value="diterima" ${r.status === "diterima" ? "selected" : ""}>Diterima</option>
              <option value="di gudang" ${r.status === "di gudang" ? "selected" : ""}>Di Gudang</option>
              <option value="terpakai" ${r.status === "terpakai" ? "selected" : ""}>Terpakai</option>
              <option value="retur" ${r.status === "retur" ? "selected" : ""}>Retur</option>
            </select>
          </td>
        </tr>`
      )
      .join("");

    body.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        const id = e.target.dataset.id;
        const { error } = await supabase
          .from("material_tracking")
          .update({ status: e.target.value, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) toast("Gagal update: " + error.message, "error");
        else {
          toast("Status tracking diperbarui", "success");
          await logActivity("update tracking material", `id ${id} -> ${e.target.value}`);
          loadList();
        }
      });
    });
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allRows.filter((r) => r.material_name.toLowerCase().includes(q) || (r.batch_no || "").toLowerCase().includes(q)));
  });

  document.getElementById("tm-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit");
    btn.disabled = true;

    const payload = {
      material_name: document.getElementById("material_name").value.trim(),
      batch_no: document.getElementById("batch_no").value.trim() || null,
      qty: Number(document.getElementById("qty").value) || 0,
      location: document.getElementById("location").value.trim() || null,
      status: "di gudang",
    };

    const { error } = await supabase.from("material_tracking").insert(payload);
    btn.disabled = false;

    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }
    toast("Data tracking ditambahkan", "success");
    await logActivity("tambah tracking material", payload.material_name);
    e.target.reset();
    loadList();
  });

  await loadList();
}
