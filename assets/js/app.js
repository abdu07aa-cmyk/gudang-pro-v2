// =====================================================================
// TrackFlow — app.js
// =====================================================================

let currentUser = null;
let currentProfile = null; // { id, full_name, role }
let orders = [];
let searchTerm = "";

const $ = (id) => document.getElementById(id);

function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

// ---------------- AUTH GUARD ----------------
async function init(){
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(!session){
    window.location.href = "index.html";
    return;
  }
  currentUser = session.user;

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if(error || !profile){
    toast("Profil tidak ditemukan. Hubungi admin.");
    return;
  }
  currentProfile = profile;

  $("userName").textContent = profile.full_name || currentUser.email;
  const chip = $("roleChip");
  chip.textContent = labelForRole(profile.role);
  chip.classList.add(profile.role);

  if(profile.role === "gudang"){
    $("newOrderBtn").style.display = "inline-flex";
    $("fabBtn").style.display = "flex";
  }

  applyRoleLocksToForm();
  await loadOrders();
  subscribeRealtime();
}

function labelForRole(role){
  return { gudang: "Gudang", qc: "Quality Control", supply: "Supply Material" }[role] || role;
}

$("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// ---------------- LOAD & RENDER ----------------
async function loadOrders(){
  const { data, error } = await supabaseClient
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if(error){
    $("listWrap").innerHTML = `<div class="empty-state"><h3>Gagal memuat data</h3><p>${error.message}</p></div>`;
    return;
  }
  orders = data || [];
  renderStats();
  renderList();
}

function renderStats(){
  $("statTotal").textContent = orders.length;
  $("statQc").textContent = orders.filter(o => o.status_material === "Terkirim ke QC" && !o.qc_status).length;
  $("statNg").textContent = orders.filter(o => (o.ng_material || 0) > 0).length;
  $("statDone").textContent = orders.filter(o => o.final_status === "Selesai").length;
}

function fmtDate(d){
  if(!d) return null;
  const dt = new Date(d + "T00:00:00");
  if(isNaN(dt)) return d;
  return dt.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
}
function fmtNum(n){
  if(n === null || n === undefined || n === "") return null;
  return Number(n).toLocaleString("id-ID");
}

function statusChipClass(status){
  if(!status) return "";
  const s = status.toLowerCase();
  if(["good","selesai"].includes(s)) return "good";
  if(["ng"].includes(s)) return "bad";
  if(["pending","proses","menunggu kirim","partial"].includes(s)) return "warn";
  return "";
}

function pipelineHTML(o){
  const gudangDone = !!o.status_material;
  const qcDone = !!o.qc_status;
  const qcIsNg = o.qc_status === "NG";
  const supplyDone = !!o.final_status;
  return `
    <div class="pipeline">
      <div class="seg ${gudangDone ? "fill-gudang" : ""}"></div>
      <div class="seg ${qcDone ? (qcIsNg ? "fill-ng" : "fill-qc") : ""}"></div>
      <div class="seg ${supplyDone ? "fill-supply" : ""}"></div>
    </div>`;
}

function kv(label, value, mono){
  if(value === null || value === undefined || value === "") return "";
  return `<div class="kv"><dt>${label}</dt><dd${mono ? ' class="mono"' : ""}>${value}</dd></div>`;
}

function renderList(){
  const term = searchTerm.trim().toLowerCase();
  const filtered = orders.filter(o => {
    if(!term) return true;
    return [o.pi_no, o.brand, o.sj_do_no].some(v => (v || "").toLowerCase().includes(term));
  });

  if(filtered.length === 0){
    $("listWrap").innerHTML = `
      <div class="empty-state">
        <h3>Belum ada order</h3>
        <p>${currentProfile.role === "gudang" ? "Tambahkan order baru untuk memulai alur." : "Menunggu Gudang menambahkan data PI baru."}</p>
      </div>`;
    return;
  }

  $("listWrap").innerHTML = `<div class="order-list">${filtered.map(orderCardHTML).join("")}</div>`;

  filtered.forEach(o => {
    const card = document.querySelector(`[data-order-id="${o.id}"]`);
    if(card){
      card.querySelector(".js-edit").addEventListener("click", () => openModal(o));
    }
  });
}

function orderCardHTML(o){
  return `
  <div class="order-card" data-order-id="${o.id}">
    <div class="order-card-head">
      <div class="order-title">
        <span class="pi-no">${o.pi_no || "(Belum ada PI No)"}</span>
        <span class="brand-line">${[o.brand, o.pi_specification].filter(Boolean).join(" · ") || "&nbsp;"}</span>
      </div>
      <button class="btn btn-ghost btn-sm js-edit">Buka</button>
    </div>
    ${pipelineHTML(o)}
    <div class="order-sections">
      <div class="section-block">
        <div class="section-head">
          <span class="section-label gudang"><span class="dot"></span>Gudang</span>
        </div>
        ${kv("PI Date", fmtDate(o.pi_date))}
        ${kv("PI Qty", fmtNum(o.pi_qty))}
        ${kv("SJ/DO No", o.sj_do_no, true)}
        ${kv("SJ/DO Qty", o.sj_do_qty ? `${fmtNum(o.sj_do_qty)} ${o.sj_do_unit || ""}` : null)}
        ${o.status_material ? `<span class="status-chip ${statusChipClass(o.status_material)}">${o.status_material}</span>` : `<span class="empty-note">Belum diisi</span>`}
      </div>
      <div class="section-block">
        <div class="section-head">
          <span class="section-label qc"><span class="dot"></span>QC</span>
        </div>
        ${kv("Inspection", fmtDate(o.inspection_date))}
        ${kv("Good", fmtNum(o.good_material))}
        ${kv("N.G", fmtNum(o.ng_material))}
        ${o.qc_status ? `<span class="status-chip ${statusChipClass(o.qc_status)}">${o.qc_status}</span>` : `<span class="empty-note">Menunggu QC</span>`}
      </div>
      <div class="section-block">
        <div class="section-head">
          <span class="section-label supply"><span class="dot"></span>Supply</span>
        </div>
        ${kv("Supply Date", fmtDate(o.supply_date))}
        ${kv("Supply Qty", fmtNum(o.supply_qty))}
        ${kv("Total Material", fmtNum(o.total_material))}
        ${o.final_status ? `<span class="status-chip ${statusChipClass(o.final_status)}">${o.final_status}</span>` : `<span class="empty-note">Belum diproses</span>`}
      </div>
    </div>
  </div>`;
}

$("searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  renderList();
});

// ---------------- ROLE LOCKS ON FORM ----------------
const GUDANG_FIELD_IDS = ["f_pi_no","f_pi_date","f_pi_qty","f_brand","f_pi_specification","f_sj_do_no","f_sj_do_date","f_sj_do_qty","f_sj_do_unit","f_delivery_date_to_qc","f_status_material"];
const QC_FIELD_IDS = ["f_inspection_date","f_qc_status","f_good_material","f_ng_material"];
const SUPPLY_FIELD_IDS = ["f_delivery_date_supply","f_supply_date","f_supply_qty","f_total_material","f_final_status"];

function applyRoleLocksToForm(){
  const role = currentProfile.role;
  const setLocked = (ids, locked) => ids.forEach(id => { const el = $(id); if(el) el.disabled = locked; });

  setLocked(GUDANG_FIELD_IDS, role !== "gudang");
  setLocked(QC_FIELD_IDS, role !== "qc");
  setLocked(SUPPLY_FIELD_IDS, role !== "supply");

  $("gudangLocked").style.display = role === "gudang" ? "none" : "block";
  $("qcLocked").style.display = role === "qc" ? "none" : "block";
  $("supplyLocked").style.display = role === "supply" ? "none" : "block";
}

// ---------------- MODAL ----------------
function openModal(order){
  $("orderForm").reset();
  applyRoleLocksToForm();
  $("orderId").value = order ? order.id : "";
  $("modalTitle").textContent = order ? (order.pi_no || "Detail Order") : "Order Baru";
  $("deleteBtn").style.display = (order && currentProfile.role === "gudang") ? "inline-flex" : "none";

  const fields = {
    f_pi_no: order?.pi_no, f_pi_date: order?.pi_date, f_pi_qty: order?.pi_qty,
    f_brand: order?.brand, f_pi_specification: order?.pi_specification,
    f_sj_do_no: order?.sj_do_no, f_sj_do_date: order?.sj_do_date, f_sj_do_qty: order?.sj_do_qty,
    f_sj_do_unit: order?.sj_do_unit, f_delivery_date_to_qc: order?.delivery_date_to_qc,
    f_status_material: order?.status_material || "",
    f_inspection_date: order?.inspection_date, f_qc_status: order?.qc_status || "",
    f_good_material: order?.good_material, f_ng_material: order?.ng_material,
    f_delivery_date_supply: order?.delivery_date_supply, f_supply_date: order?.supply_date,
    f_supply_qty: order?.supply_qty, f_total_material: order?.total_material,
    f_final_status: order?.final_status || "",
  };
  Object.entries(fields).forEach(([id, val]) => { if(val !== undefined && val !== null) $(id).value = val; });

  $("modalBackdrop").classList.add("show");
}
function closeModal(){ $("modalBackdrop").classList.remove("show"); }

$("newOrderBtn").addEventListener("click", () => openModal(null));
$("fabBtn").addEventListener("click", () => openModal(null));
$("modalClose").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
$("modalBackdrop").addEventListener("click", (e) => { if(e.target.id === "modalBackdrop") closeModal(); });

$("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("orderId").value;
  const role = currentProfile.role;

  const numOrNull = (v) => (v === "" || v === null || v === undefined) ? null : Number(v);
  const strOrNull = (v) => (v === "" ? null : v);

  let payload = {};
  if(role === "gudang"){
    payload = {
      pi_no: strOrNull($("f_pi_no").value), pi_date: strOrNull($("f_pi_date").value),
      pi_qty: numOrNull($("f_pi_qty").value), brand: strOrNull($("f_brand").value),
      pi_specification: strOrNull($("f_pi_specification").value), sj_do_no: strOrNull($("f_sj_do_no").value),
      sj_do_date: strOrNull($("f_sj_do_date").value), sj_do_qty: numOrNull($("f_sj_do_qty").value),
      sj_do_unit: strOrNull($("f_sj_do_unit").value), delivery_date_to_qc: strOrNull($("f_delivery_date_to_qc").value),
      status_material: strOrNull($("f_status_material").value),
    };
  } else if(role === "qc"){
    payload = {
      inspection_date: strOrNull($("f_inspection_date").value), qc_status: strOrNull($("f_qc_status").value),
      good_material: numOrNull($("f_good_material").value), ng_material: numOrNull($("f_ng_material").value),
    };
  } else if(role === "supply"){
    payload = {
      delivery_date_supply: strOrNull($("f_delivery_date_supply").value), supply_date: strOrNull($("f_supply_date").value),
      supply_qty: numOrNull($("f_supply_qty").value), total_material: numOrNull($("f_total_material").value),
      final_status: strOrNull($("f_final_status").value),
    };
  }

  try{
    if(id){
      const { error } = await supabaseClient.from("orders").update(payload).eq("id", id);
      if(error) throw error;
      toast("Perubahan disimpan");
    } else {
      if(role !== "gudang"){ toast("Hanya Gudang yang bisa membuat order baru"); return; }
      payload.created_by = currentUser.id;
      const { error } = await supabaseClient.from("orders").insert(payload);
      if(error) throw error;
      toast("Order baru ditambahkan");
    }
    closeModal();
    await loadOrders();
  } catch(err){
    toast(err.message || "Gagal menyimpan data");
  }
});

$("deleteBtn").addEventListener("click", async () => {
  const id = $("orderId").value;
  if(!id) return;
  if(!confirm("Hapus order ini? Tindakan tidak bisa dibatalkan.")) return;
  const { error } = await supabaseClient.from("orders").delete().eq("id", id);
  if(error){ toast(error.message); return; }
  toast("Order dihapus");
  closeModal();
  await loadOrders();
});

// ---------------- REALTIME ----------------
function subscribeRealtime(){
  supabaseClient
    .channel("orders-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      loadOrders();
    })
    .subscribe();
}

init();
