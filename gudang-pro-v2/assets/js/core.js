import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------
// MENU DEFINITION (dipakai untuk render sidebar di semua halaman)
// ---------------------------------------------------------
export const MENU = [
  {
    zone: "Zona A — Main Menu",
    items: [
      { href: "dashboard.html", icon: "📊", label: "Dashboard" },
      { href: "input-pi.html", icon: "📝", label: "Input PI" },
      { href: "barang-masuk.html", icon: "📥", label: "Barang Masuk" },
      { href: "barang-keluar.html", icon: "📤", label: "Barang Keluar" },
      { href: "stok-gudang.html", icon: "📋", label: "Stok Gudang" },
      { href: "stok-pendukung.html", icon: "📦", label: "Stok Pendukung" },
      { href: "qr-code.html", icon: "🏷️", label: "QR Code" },
      { href: "scan-qr.html", icon: "📷", label: "Scan QR" },
    ],
  },
  {
    zone: "Zona B — Backup & Export",
    items: [
      { href: "backup-export.html#backup", icon: "💾", label: "Backup Data" },
      { href: "backup-export.html#export", icon: "📎", label: "Export Data" },
    ],
  },
  {
    zone: "Zona C — Tracking Material",
    items: [
      { href: "tracking-material.html", icon: "📊", label: "Tracking Material" },
      { href: "material-masuk.html", icon: "📥", label: "Material Masuk" },
      { href: "qc-inspection.html", icon: "🔬", label: "QC Inspection" },
      { href: "proses-diecut.html", icon: "⚙️", label: "Proses Diecut" },
      { href: "kirim-produksi.html", icon: "🏭", label: "Kirim Produksi" },
      { href: "laporan-ng.html", icon: "📋", label: "Laporan NG" },
    ],
  },
  {
    zone: "Zona D — Laporan",
    items: [{ href: "laporan-eksekutif.html", icon: "📈", label: "Laporan Eksekutif" }],
  },
  {
    zone: "Zona E — Admin",
    adminOnly: true,
    items: [
      { href: "kelola-user.html", icon: "👥", label: "Kelola User" },
      { href: "log-aktivitas.html", icon: "📜", label: "Log Aktivitas" },
    ],
  },
];

// ---------------------------------------------------------
// AUTH GUARD — panggil di setiap halaman terproteksi
// Mengembalikan { session, profile }
// ---------------------------------------------------------
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return null;
  }
  if (profile.status !== "active") {
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;text-align:center;padding:20px;">' +
      '<div><h2 style="font-family:Oswald,sans-serif;">Akun belum aktif</h2>' +
      '<p style="color:#5b6469;max-width:360px;">Akun kamu berstatus <b>' + profile.status + '</b>. Hubungi admin untuk mengaktifkan akun ini.</p>' +
      '<button onclick="window.__signOut()" style="margin-top:10px;padding:8px 16px;border-radius:4px;border:1px solid #dedad0;background:#fff;cursor:pointer;">Keluar</button></div></div>';
    window.__signOut = async () => { await supabase.auth.signOut(); window.location.href = "login.html"; };
    return null;
  }
  return { session, profile };
}

// ---------------------------------------------------------
// SIDEBAR RENDER
// ---------------------------------------------------------
export function renderSidebar(activeHref, profile) {
  const mount = document.getElementById("sidebar-mount");
  if (!mount) return;

  const zones = MENU.filter((z) => !z.adminOnly || profile.role === "admin")
    .map((z) => {
      const links = z.items
        .map((item) => {
          const isActive = activeHref === item.href.split("#")[0];
          return `<a class="nav-link${isActive ? " active" : ""}" href="${item.href}">
            <span class="ic">${item.icon}</span><span>${item.label}</span></a>`;
        })
        .join("");
      return `<div class="zone"><div class="zone-label">${z.zone}</div>${links}</div>`;
    })
    .join("");

  mount.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="mark">GP</div>
        <div><div class="name">Gudang Pro</div><div class="sub">Manajemen Inventory</div></div>
      </div>
      ${zones}
      <div class="sidebar-footer">
        <div class="who">${profile.full_name || "User"}</div>
        <div>${profile.role === "admin" ? "Administrator" : "Staff Gudang"}</div>
        <button class="logout-btn" id="btn-logout">🚪 Keluar</button>
      </div>
    </aside>`;

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await logActivity("logout", "User keluar dari sistem");
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

export function wireMobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }
}

// ---------------------------------------------------------
// TOAST
// ---------------------------------------------------------
export function toast(message, type = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ---------------------------------------------------------
// ACTIVITY LOG
// ---------------------------------------------------------
export async function logActivity(action, detail) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from("activity_log").insert({
    user_id: session.user.id,
    action,
    detail,
  });
}

// ---------------------------------------------------------
// CSV EXPORT HELPER
// ---------------------------------------------------------
export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) {
    toast("Tidak ada data untuk diexport", "error");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
