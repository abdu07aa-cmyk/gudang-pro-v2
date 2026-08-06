import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("kelola-user.html", profile);
  wireMobileMenu();

  if (profile.role !== "admin") {
    document.getElementById("page-content").innerHTML =
      '<div class="card empty-state"><div class="ic">🔒</div>Halaman ini khusus untuk Admin.</div>';
  } else {
    let allRows = [];

    async function loadList() {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) {
        toast("Gagal memuat data: " + error.message, "error");
        return;
      }
      allRows = data || [];
      render(allRows);
    }

    function statusBadge(s) {
      if (s === "active") return '<span class="badge badge-ok">Aktif</span>';
      if (s === "blocked") return '<span class="badge badge-danger">Diblokir</span>';
      return '<span class="badge badge-warn">Pending</span>';
    }

    function render(rows) {
      const body = document.getElementById("user-body");
      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="5" class="empty-state">Belum ada user.</td></tr>`;
        return;
      }
      body.innerHTML = rows
        .map(
          (u) => `<tr>
            <td>${u.full_name || "-"}${u.id === profile.id ? " <span class=\"badge badge-muted\">Kamu</span>" : ""}</td>
            <td>
              <select data-id="${u.id}" class="role-select" ${u.id === profile.id ? "disabled" : ""} style="padding:4px 6px;font-size:12px;border:1px solid var(--line);border-radius:4px;">
                <option value="staff" ${u.role === "staff" ? "selected" : ""}>Staff</option>
                <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
              </select>
            </td>
            <td>${statusBadge(u.status)}</td>
            <td style="font-size:11.5px;">${formatDate(u.created_at)}</td>
            <td style="display:flex;gap:6px;">
              ${u.status !== "active" ? `<button class="btn btn-outline btn-approve" data-id="${u.id}" style="padding:5px 10px;font-size:11.5px;">✓ Aktifkan</button>` : ""}
              ${u.status !== "blocked" && u.id !== profile.id ? `<button class="btn btn-danger btn-block" data-id="${u.id}" style="padding:5px 10px;font-size:11.5px;">Blokir</button>` : ""}
            </td>
          </tr>`
        )
        .join("");

      body.querySelectorAll(".role-select").forEach((sel) => {
        sel.addEventListener("change", async (e) => {
          const id = e.target.dataset.id;
          const { error } = await supabase.from("profiles").update({ role: e.target.value }).eq("id", id);
          if (error) toast("Gagal update role: " + error.message, "error");
          else {
            toast("Role user diperbarui", "success");
            await logActivity("update role user", `${id} -> ${e.target.value}`);
            loadList();
          }
        });
      });

      body.querySelectorAll(".btn-approve").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", id);
          if (error) toast("Gagal mengaktifkan: " + error.message, "error");
          else {
            toast("User diaktifkan", "success");
            await logActivity("aktifkan user", id);
            loadList();
          }
        });
      });

      body.querySelectorAll(".btn-block").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          if (!confirm("Blokir user ini? Mereka tidak akan bisa login.")) return;
          const { error } = await supabase.from("profiles").update({ status: "blocked" }).eq("id", id);
          if (error) toast("Gagal memblokir: " + error.message, "error");
          else {
            toast("User diblokir", "success");
            await logActivity("blokir user", id);
            loadList();
          }
        });
      });
    }

    document.getElementById("search-box").addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      render(allRows.filter((u) => (u.full_name || "").toLowerCase().includes(q) || u.status.includes(q) || u.role.includes(q)));
    });

    await loadList();
  }
}
