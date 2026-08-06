import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity } from "../core.js";

export async function runItemsPage({ pageHref, itemType, actionLabel }) {
  const auth = await requireAuth();
  if (!auth) return;
  const { profile } = auth;
  renderSidebar(pageHref, profile);
  wireMobileMenu();

  let allRows = [];

  async function load() {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("item_type", itemType)
      .order("name", { ascending: true });

    if (error) {
      toast("Gagal memuat data: " + error.message, "error");
      return;
    }
    allRows = data || [];
    render(allRows);
  }

  function render(rows) {
    const body = document.getElementById("items-body");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state">Belum ada item. Tambahkan lewat form di atas.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map((i) => {
        const low = i.current_stock <= i.min_stock;
        return `<tr>
          <td class="num">${i.sku}</td>
          <td>${i.name}</td>
          <td>${i.category || "-"}</td>
          <td class="num">${i.current_stock}</td>
          <td class="num">${i.min_stock}</td>
          <td>${i.unit}</td>
          <td>${low ? '<span class="badge badge-danger">Menipis</span>' : '<span class="badge badge-ok">Aman</span>'}</td>
        </tr>`;
      })
      .join("");
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allRows.filter((i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)));
  });

  document.getElementById("item-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit");
    btn.disabled = true;

    const payload = {
      sku: document.getElementById("sku").value.trim(),
      name: document.getElementById("name").value.trim(),
      category: document.getElementById("category").value.trim() || null,
      unit: document.getElementById("unit").value.trim(),
      current_stock: Number(document.getElementById("current_stock").value) || 0,
      min_stock: Number(document.getElementById("min_stock").value) || 0,
      item_type: itemType,
    };

    const { error } = await supabase.from("items").insert(payload);
    btn.disabled = false;

    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }
    toast(`${actionLabel} berhasil ditambahkan`, "success");
    await logActivity("tambah item", `${actionLabel}: ${payload.sku} - ${payload.name}`);
    e.target.reset();
    document.getElementById("current_stock").value = 0;
    document.getElementById("min_stock").value = 0;
    load();
  });

  load();
}
