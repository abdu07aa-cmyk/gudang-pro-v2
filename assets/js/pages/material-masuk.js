import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity, formatDate } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile } = auth;
  renderSidebar("material-masuk.html", profile);
  wireMobileMenu();

  let allRows = [];

  async function loadList() {
    const { data, error } = await supabase
      .from("material_masuk")
      .select("*")
      .order("received_at", { ascending: false });

    if (error) {
      toast("Gagal memuat data: " + error.message, "error");
      return;
    }
    allRows = data || [];
    render(allRows);
  }

  function render(rows) {
    const body = document.getElementById("mm-body");
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada penerimaan material.</td></tr>`;
      return;
    }
    body.innerHTML = rows
      .map(
        (r) => `<tr>
          <td style="font-size:11.5px;" class="num">${formatDate(r.received_at)}</td>
          <td>${r.material_name}</td>
          <td class="num">${r.batch_no || "-"}</td>
          <td class="num">${r.qty}</td>
          <td>${r.supplier || "-"}</td>
          <td><button class="btn btn-outline btn-send-tracking" data-id="${r.id}" style="padding:5px 10px;font-size:11.5px;">→ Kirim ke Tracking</button></td>
        </tr>`
      )
      .join("");

    body.querySelectorAll(".btn-send-tracking").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = allRows.find((r) => r.id == btn.dataset.id);
        btn.disabled = true;
        btn.textContent = "Mengirim...";
        const { error } = await supabase.from("material_tracking").insert({
          material_name: row.material_name,
          batch_no: row.batch_no,
          qty: row.qty,
          status: "di gudang",
          location: "Gudang Utama",
        });
        if (error) {
          toast("Gagal mengirim ke tracking: " + error.message, "error");
          btn.disabled = false;
          btn.textContent = "→ Kirim ke Tracking";
          return;
        }
        toast("Material dikirim ke Tracking Material", "success");
        await logActivity("kirim ke tracking", `${row.material_name} (${row.batch_no || "-"})`);
        btn.textContent = "✓ Terkirim";
      });
    });
  }

  document.getElementById("search-box").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    render(allRows.filter((r) => r.material_name.toLowerCase().includes(q) || (r.batch_no || "").toLowerCase().includes(q)));
  });

  document.getElementById("mm-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btn-submit");
    btn.disabled = true;

    const { data: { session } } = await supabase.auth.getSession();
    const payload = {
      material_name: document.getElementById("material_name").value.trim(),
      batch_no: document.getElementById("batch_no").value.trim() || null,
      qty: Number(document.getElementById("qty").value),
      supplier: document.getElementById("supplier").value.trim() || null,
      created_by: session.user.id,
    };

    const { error } = await supabase.from("material_masuk").insert(payload);
    btn.disabled = false;

    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }
    toast("Penerimaan material dicatat", "success");
    await logActivity("material masuk", `${payload.material_name} sebanyak ${payload.qty}`);
    e.target.reset();
    loadList();
  });

  await loadList();
}
