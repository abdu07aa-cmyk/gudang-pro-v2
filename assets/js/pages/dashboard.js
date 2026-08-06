import { supabase, requireAuth, renderSidebar, wireMobileMenu, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("dashboard.html", profile);
  wireMobileMenu();
  document.getElementById("welcome-msg").textContent = `👋 Selamat datang, ${profile.full_name || "User"}`;

  await loadStats();
  await loadLowStock();
  if (profile.role === "admin") await loadRecentActivity();
  else document.getElementById("recent-activity-body").innerHTML =
    '<tr><td colspan="2" class="loading-row">Hanya admin yang bisa melihat log aktivitas</td></tr>';
}

async function loadStats() {
  const { count: totalItems } = await supabase.from("items").select("*", { count: "exact", head: true });
  document.getElementById("stat-total-items").textContent = totalItems ?? 0;

  const { data: allItems } = await supabase.from("items").select("current_stock, min_stock");
  const lowCount = (allItems || []).filter((i) => i.current_stock <= i.min_stock).length;
  document.getElementById("stat-low-stock").textContent = lowCount;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { count: inCount } = await supabase
    .from("stock_in").select("*", { count: "exact", head: true }).gte("created_at", since.toISOString());
  document.getElementById("stat-in-30d").textContent = inCount ?? 0;

  const { count: outCount } = await supabase
    .from("stock_out").select("*", { count: "exact", head: true }).gte("created_at", since.toISOString());
  document.getElementById("stat-out-30d").textContent = outCount ?? 0;
}

async function loadLowStock() {
  const { data } = await supabase
    .from("items")
    .select("sku, name, current_stock, min_stock")
    .order("current_stock", { ascending: true })
    .limit(50);

  const rows = (data || []).filter((i) => i.current_stock <= i.min_stock).slice(0, 8);
  const body = document.getElementById("low-stock-body");
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty-state">✅ Semua stok aman</td></tr>';
    return;
  }
  body.innerHTML = rows
    .map(
      (i) => `<tr>
        <td class="num">${i.sku}</td><td>${i.name}</td>
        <td class="num">${i.current_stock}</td><td class="num">${i.min_stock}</td>
      </tr>`
    )
    .join("");
}

async function loadRecentActivity() {
  const { data } = await supabase
    .from("activity_log")
    .select("action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const body = document.getElementById("recent-activity-body");
  if (!data || !data.length) {
    body.innerHTML = '<tr><td colspan="2" class="empty-state">Belum ada aktivitas</td></tr>';
    return;
  }
  body.innerHTML = data
    .map((a) => `<tr><td class="num" style="font-size:11.5px;">${formatDate(a.created_at)}</td><td>${a.action}${a.detail ? " — " + a.detail : ""}</td></tr>`)
    .join("");
}
