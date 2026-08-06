-- =========================================================
-- GUDANG PRO V2 — Supabase Schema
-- Jalankan file ini di: Supabase Dashboard > SQL Editor > New query
-- =========================================================

-- 1. PROFILES (role & status setiap user, terhubung ke auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin','staff')),
  status text not null default 'pending' check (status in ('pending','active','blocked')),
  created_at timestamptz not null default now()
);

-- Auto-buat baris profile setiap ada user baru daftar
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff', 'pending');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. ITEMS (master barang — dipakai untuk Stok Gudang & Stok Pendukung)
create table if not exists items (
  id bigint generated always as identity primary key,
  sku text unique not null,
  name text not null,
  category text,
  unit text not null default 'pcs',
  item_type text not null default 'utama' check (item_type in ('utama','pendukung')),
  min_stock numeric not null default 0,
  current_stock numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. BARANG MASUK
create table if not exists stock_in (
  id bigint generated always as identity primary key,
  item_id bigint not null references items(id),
  qty numeric not null check (qty > 0),
  source text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 4. BARANG KELUAR
create table if not exists stock_out (
  id bigint generated always as identity primary key,
  item_id bigint not null references items(id),
  qty numeric not null check (qty > 0),
  destination text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 5. INPUT PI (Rencana Kebutuhan / Production Instruction)
create table if not exists pi_input (
  id bigint generated always as identity primary key,
  pi_number text unique not null,
  item_id bigint not null references items(id),
  qty_planned numeric not null,
  qty_realized numeric not null default 0,
  status text not null default 'draft' check (status in ('draft','proses','selesai')),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 6. TRACKING MATERIAL
create table if not exists material_tracking (
  id bigint generated always as identity primary key,
  material_name text not null,
  batch_no text,
  qty numeric not null default 0,
  status text not null default 'di gudang' check (status in ('diterima','di gudang','terpakai','retur')),
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. MATERIAL MASUK (penerimaan material mentah, feed ke tracking)
create table if not exists material_masuk (
  id bigint generated always as identity primary key,
  material_name text not null,
  batch_no text,
  qty numeric not null,
  supplier text,
  received_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- 8. LOG AKTIVITAS
create table if not exists activity_log (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- 9. PROSES DIECUT (produksi memotong/mencetak material dari batch)
create table if not exists diecut_process (
  id bigint generated always as identity primary key,
  batch_no text,
  material_name text not null,
  qty_input numeric not null,
  qty_output numeric not null default 0,
  qty_reject numeric not null default 0,
  machine text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 10. QC INSPECTION (pemeriksaan kualitas hasil diecut / material)
create table if not exists qc_inspection (
  id bigint generated always as identity primary key,
  batch_no text,
  material_name text not null,
  qty_inspected numeric not null,
  qty_pass numeric not null default 0,
  qty_ng numeric not null default 0,
  ng_reason text,
  inspector_note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 11. KIRIM PRODUKSI (pengiriman material/hasil yang lolos QC ke line produksi)
create table if not exists kirim_produksi (
  id bigint generated always as identity primary key,
  batch_no text,
  material_name text not null,
  qty numeric not null,
  line_tujuan text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table profiles enable row level security;
alter table items enable row level security;
alter table stock_in enable row level security;
alter table stock_out enable row level security;
alter table pi_input enable row level security;
alter table material_tracking enable row level security;
alter table material_masuk enable row level security;
alter table activity_log enable row level security;
alter table diecut_process enable row level security;
alter table qc_inspection enable row level security;
alter table kirim_produksi enable row level security;

-- Helper: cek apakah user login adalah admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$ language sql security definer stable;

-- Helper: cek apakah user aktif (bukan pending/blocked)
create or replace function is_active_user()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and status = 'active'
  );
$$ language sql security definer stable;

-- PROFILES: user boleh lihat profile sendiri; admin boleh lihat & update semua
create policy "profiles: self select" on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles: self update basic" on profiles for update using (auth.uid() = id or is_admin());

-- ITEMS: semua user aktif boleh lihat; hanya user aktif boleh insert/update
create policy "items: active read" on items for select using (is_active_user());
create policy "items: active write" on items for insert with check (is_active_user());
create policy "items: active update" on items for update using (is_active_user());

-- STOCK IN / OUT: user aktif boleh lihat & insert
create policy "stock_in: active read" on stock_in for select using (is_active_user());
create policy "stock_in: active insert" on stock_in for insert with check (is_active_user());
create policy "stock_out: active read" on stock_out for select using (is_active_user());
create policy "stock_out: active insert" on stock_out for insert with check (is_active_user());

-- PI INPUT
create policy "pi_input: active read" on pi_input for select using (is_active_user());
create policy "pi_input: active write" on pi_input for insert with check (is_active_user());
create policy "pi_input: active update" on pi_input for update using (is_active_user());

-- TRACKING MATERIAL & MATERIAL MASUK
create policy "material_tracking: active read" on material_tracking for select using (is_active_user());
create policy "material_tracking: active write" on material_tracking for insert with check (is_active_user());
create policy "material_tracking: active update" on material_tracking for update using (is_active_user());
create policy "material_masuk: active read" on material_masuk for select using (is_active_user());
create policy "material_masuk: active insert" on material_masuk for insert with check (is_active_user());

-- ACTIVITY LOG: hanya admin yang boleh lihat; user aktif boleh insert log miliknya sendiri
create policy "activity_log: admin read" on activity_log for select using (is_admin());
create policy "activity_log: self insert" on activity_log for insert with check (auth.uid() = user_id);

-- PROSES DIECUT / QC INSPECTION / KIRIM PRODUKSI
create policy "diecut_process: active read" on diecut_process for select using (is_active_user());
create policy "diecut_process: active insert" on diecut_process for insert with check (is_active_user());
create policy "qc_inspection: active read" on qc_inspection for select using (is_active_user());
create policy "qc_inspection: active insert" on qc_inspection for insert with check (is_active_user());
create policy "kirim_produksi: active read" on kirim_produksi for select using (is_active_user());
create policy "kirim_produksi: active insert" on kirim_produksi for insert with check (is_active_user());

-- =========================================================
-- STOK OTOMATIS: trigger update current_stock saat ada transaksi
-- =========================================================
create or replace function apply_stock_in()
returns trigger as $$
begin
  update items set current_stock = current_stock + new.qty, updated_at = now() where id = new.item_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_stock_in on stock_in;
create trigger trg_stock_in after insert on stock_in
  for each row execute procedure apply_stock_in();

create or replace function apply_stock_out()
returns trigger as $$
begin
  update items set current_stock = current_stock - new.qty, updated_at = now() where id = new.item_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_stock_out on stock_out;
create trigger trg_stock_out after insert on stock_out
  for each row execute procedure apply_stock_out();

-- =========================================================
-- SETELAH RUN SCRIPT INI:
-- 1. Daftar akun pertama lewat halaman register.html
-- 2. Buka Table Editor > profiles, ubah role akun pertama itu jadi 'admin'
--    dan status jadi 'active' secara manual (akun pertama = super admin).
-- 3. User berikutnya yang daftar akan berstatus 'pending' sampai
--    di-approve oleh admin lewat menu Kelola User.
-- =========================================================
