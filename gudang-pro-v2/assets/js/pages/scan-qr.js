import { supabase, requireAuth, renderSidebar, wireMobileMenu, toast, logActivity } from "../core.js";

const auth = await requireAuth();
if (auth) {
  const { profile, session } = auth;
  renderSidebar("scan-qr.html", profile);
  wireMobileMenu();

  let currentItem = null;
  let scanner = null;

  function startScanner() {
    document.getElementById("result-card").classList.remove("show");
    document.getElementById("qr-reader").style.display = "block";
    scanner = new Html5Qrcode("qr-reader");
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        onScanSuccess,
        () => {} // ignore per-frame scan errors
      )
      .catch((err) => {
        toast("Tidak bisa akses kamera: " + err, "error");
      });
  }

  async function onScanSuccess(decodedText) {
    let payload;
    try {
      payload = JSON.parse(decodedText);
    } catch {
      payload = { t: "raw", sku: decodedText };
    }
    if (!payload.sku) {
      toast("QR tidak dikenali", "error");
      return;
    }

    await scanner.stop().catch(() => {});
    document.getElementById("qr-reader").style.display = "none";

    const { data: item, error } = await supabase.from("items").select("*").eq("sku", payload.sku).single();
    if (error || !item) {
      toast(`Item dengan SKU "${payload.sku}" tidak ditemukan`, "error");
      document.getElementById("btn-rescan").click();
      return;
    }

    currentItem = item;
    document.getElementById("result-name").textContent = item.name;
    document.getElementById("result-sku").textContent = item.sku;
    document.getElementById("result-stock").textContent = item.current_stock;
    document.getElementById("result-unit").textContent = item.unit;
    document.getElementById("result-card").classList.add("show");
  }

  async function recordTx(direction) {
    if (!currentItem) return;
    const qty = Number(document.getElementById("qty").value);
    if (!qty || qty <= 0) {
      toast("Isi jumlah terlebih dahulu", "error");
      return;
    }
    const note = document.getElementById("note").value.trim() || null;
    const table = direction === "in" ? "stock_in" : "stock_out";
    const partyField = direction === "in" ? "source" : "destination";

    const payload = { item_id: currentItem.id, qty, note, created_by: session.user.id, [partyField]: "Scan QR" };
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      toast("Gagal menyimpan: " + error.message, "error");
      return;
    }
    toast(`${direction === "in" ? "Barang masuk" : "Barang keluar"} tercatat via Scan QR`, "success");
    await logActivity(direction === "in" ? "barang masuk (scan qr)" : "barang keluar (scan qr)", `${currentItem.sku} sebanyak ${qty}`);

    // refresh current stock shown
    const { data: refreshed } = await supabase.from("items").select("current_stock").eq("id", currentItem.id).single();
    if (refreshed) document.getElementById("result-stock").textContent = refreshed.current_stock;
    document.getElementById("qty").value = "";
    document.getElementById("note").value = "";
  }

  document.getElementById("btn-in").addEventListener("click", () => recordTx("in"));
  document.getElementById("btn-out").addEventListener("click", () => recordTx("out"));
  document.getElementById("btn-rescan").addEventListener("click", () => {
    currentItem = null;
    startScanner();
  });

  startScanner();
}
