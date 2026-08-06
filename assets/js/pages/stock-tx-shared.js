import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, formatDate } from "../core.js";

export async function runStockTxPage({ pageHref, table, partyField, actionLabel }) {
  const auth = await requireAuth();
  if (!auth) return;
  const { profile, session } = auth;
  renderSidebar(pageHref, profile);
  wireMobileMenu();

  let items = [];
  let allRows = [];

  async function loadItems() {
    const { data } = await supabase.from("items").select("id, sku, name, unit").order("name");
    items = data || [];
    const select = document.getElementById("item_id");
    select.innerHTML =
      '<option value="">— Pilih item —</option>' +
      items.map((i) => `<option value="${i.id}">${i.sku} — ${i.name}</option>`).join("");
  }

  async function loadHistory() {
    const { data, error } = await supabase
      .from(table)
      .select(`id, qty, ${partyField}, note, created_at, items ( sku, name, unit )`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast("Gagal memuat riwayat: " + error.message, "error");
      return;
    }
    allRows = data || [];
    render(allRows);
  }

  function render(rows) {
    const body = document.getElementById("tx-body");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada transaksi.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td style="font-size:11.5px;" class="num">${formatDate(r.created_at)}</td>
          <td class="num">${r.items?.sku ?? "-"}</td>
          <td>${r.items?.name ?? "(item dihapus)"}</td>
          <td class="num">${r.qty} ${r.items?.unit ?? ""}</td>
          <td>${r[partyField] || "-"}</td>
          <td>${r.note || "-"}</td>
        </tr>`
      )
      .join("");
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allRows.filter((r) => (r.items?.name || "").toLowerCase().includes(q) || (r.items?.sku || "").toLowerCase().includes(q)));
  });

  document.getElementById("tx-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit");
    btn.disabled = true;

    const payload = {
      item_id: Number(document.getElementById("item_id").value),
      qty: Number(document.getElementById("qty").value),
      [partyField]: document.getElementById("party").value.trim() || null,
      note: document.getElementById("note").value.trim() || null,
      created_by: session.user.id,
    };

    if (!payload.item_id) {
      toast("Pilih item terlebih dahulu", "error");
      btn.disabled = false;
      return;
    }

    const { error } = await supabase.from(table).insert(payload);
    btn.disabled = false;

    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }
    const itemInfo = items.find((i) => i.id === payload.item_id);
    toast(`${actionLabel} berhasil dicatat`, "success");
    await logActivity(actionLabel.toLowerCase(), `${itemInfo?.sku ?? ""} sebanyak ${payload.qty}`);
    e.target.reset();
    loadHistory();
  });

  await loadItems();
  await loadHistory();
}
