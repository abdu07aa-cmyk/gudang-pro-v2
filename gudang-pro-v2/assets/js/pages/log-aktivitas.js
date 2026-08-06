import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("log-aktivitas.html", profile);
  wireMobileMenu();

  if (profile.role !== "admin") {
    document.getElementById("page-content").innerHTML =
      '<div class="card empty-state"><div class="ic">🔒</div>Halaman ini khusus untuk Admin.</div>';
  } else {
    let allRows = [];

    async function loadList() {
      const { data, error } = await supabase
        .from("activity_log")
        .select("id, action, detail, created_at, profiles ( full_name )")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        toast("Gagal memuat data: " + error.message, "error");
        return;
      }
      allRows = data || [];
      render(allRows);
    }

    function render(rows) {
      const body = document.getElementById("log-body");
      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada aktivitas tercatat.</td></tr>`;
        return;
      }
      body.innerHTML = rows
        .map(
          (r) => `<tr>
            <td style="font-size:11.5px;" class="num">${formatDate(r.created_at)}</td>
            <td>${r.profiles?.full_name || "-"}</td>
            <td>${r.action}</td>
            <td>${r.detail || "-"}</td>
          </tr>`
        )
        .join("");
    }

    document.getElementById("search-box").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      render(allRows.filter((r) => r.action.toLowerCase().includes(q) || (r.detail || "").toLowerCase().includes(q)));
    });

    await loadList();
  }
}
