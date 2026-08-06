import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, exportToCsv } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("backup-export.html", profile);
  wireMobileMenu();

  const backupBtn = document.getElementById("btn-backup");
  if (profile.role !== "admin") {
    backupBtn.disabled = true;
    backupBtn.textContent = "Hanya Admin yang bisa backup";
  }

  backupBtn.addEventListener("click", async () => {
    if (profile.role !== "admin") return;
    backupBtn.disabled = true;
    backupBtn.textContent = "Menyiapkan backup...";

    const tables = ["items", "stock_in", "stock_out", "pi_input", "material_tracking", "material_masuk", "profiles"];
    const backup = { generated_at: new Date().toISOString() };

    for (const t of tables) {
      const { data, error } = await supabase.from(t).select("*");
      if (error) {
        toast(`Gagal backup tabel ${t}: ${error.message}`, "error");
        backupBtn.disabled = false;
        backupBtn.textContent = "Download Backup Lengkap (.json)";
        return;
      }
      backup[t] = data;
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gudang-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast("Backup berhasil didownload", "success");
    await logActivity("backup data", "Backup lengkap seluruh tabel");
    backupBtn.disabled = false;
    backupBtn.textContent = "Download Backup Lengkap (.json)";
  });

  document.querySelectorAll("[data-table]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const table = btn.dataset.table;
      const filename = btn.dataset.name;
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "Menyiapkan...";

      const { data, error } = await supabase.from(table).select("*");
      btn.disabled = false;
      btn.textContent = original;

      if (error) {
        toast("Gagal export: " + error.message, "error");
        return;
      }
      exportToCsv(filename, data);
      await logActivity("export data", `Export tabel ${table}`);
      toast(`${filename} berhasil didownload`, "success");
    });
  });
}
