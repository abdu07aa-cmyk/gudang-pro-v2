import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("qr-code.html", profile);
  wireMobileMenu();

  let allItems = [];

  async function loadItems() {
    const { data, error } = await supabase.from("items").select("sku, name, unit").order("name");
    if (error) {
      toast("Gagal memuat item: " + error.message, "error");
      return;
    }
    allItems = data || [];
    render(allItems);
  }

  function render(items) {
    const grid = document.getElementById("qr-grid");
    if (!items.length) {
      grid.innerHTML = '<div class="empty-state">Belum ada item. Tambahkan lewat menu Stok Gudang / Stok Pendukung.</div>';
      return;
    }
    grid.innerHTML = items
      .map(
        (i, idx) => `<div class="qr-tile">
          <canvas id="qr-${idx}"></canvas>
          <div class="sku">${i.sku}</div>
          <div class="name">${i.name}</div>
        </div>`
      )
      .join("");

    items.forEach((i, idx) => {
      const canvas = document.getElementById(`qr-${idx}`);
      // QR berisi payload JSON sederhana: tipe:item, sku
      const payload = JSON.stringify({ t: "item", sku: i.sku });
      QRCode.toCanvas(canvas, payload, { width: 120, margin: 1, color: { dark: "#1b2226", light: "#ffffff" } });
    });
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allItems.filter((i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)));
  });

  document.getElementById("btn-print").addEventListener("click", () => window.print());

  await loadItems();
}
