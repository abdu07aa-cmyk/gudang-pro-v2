-- =========================================================
-- TRACKFLOW — Order, QC & Supply Tracking
-- Supabase schema: run this whole file in Supabase SQL Editor
-- (Project → SQL Editor → New query → paste → Run)
-- =========================================================

-- ---------- 1. PROFILES (links auth user -> role) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null check (role in ('gudang','qc','supply')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- profile row is created automatically on signup (see trigger below),
-- so no insert/update policy is needed for normal users.

-- Auto-create a profile row whenever a new auth user signs up.
-- Expects role & full_name to be passed as user metadata at signup:
--   supabase.auth.signUp({ email, password, options: { data: { role, full_name }}})
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'gudang')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------- 2. ORDERS (the single master table) ----------
create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id),

  -- === WAREHOUSE / GUDANG — PI DATA ===
  pi_no                 text,
  pi_date               date,
  pi_qty                numeric,
  brand                 text,
  pi_specification      text,
  sj_do_no              text,
  sj_do_date            date,
  sj_do_qty             numeric,
  sj_do_unit            text,
  delivery_date_to_qc   date,
  status_material       text,      -- e.g. Menunggu QC / Terkirim ke QC

  -- === QUALITY CONTROL — INCOMING QC ===
  inspection_date       date,      -- "INFECTION DATE" in the brief -> inspection date
  good_material         numeric,
  ng_material           numeric,
  qc_status             text,      -- e.g. Pending / Good / NG / Partial

  -- === SUPPLY MATERIAL ===
  delivery_date_supply  date,      -- "DELIVERY SUPLAY MATERIAL"
  supply_date           date,
  supply_qty            numeric,
  total_material        numeric,
  final_status          text       -- e.g. Pending / Proses / Selesai
);

create index if not exists orders_pi_no_idx on public.orders (pi_no);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

-- Anyone signed in (any of the 3 roles) can read every row —
-- they all need visibility into the full pipeline.
create policy "orders_select_authenticated"
  on public.orders for select
  to authenticated
  using (true);

-- Only Gudang starts a new order (PI data is the entry point).
create policy "orders_insert_gudang_only"
  on public.orders for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gudang')
  );

-- Any authenticated role may update a row — WHICH columns they may
-- change is enforced by the trigger below, not by this policy.
create policy "orders_update_authenticated"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

-- Only Gudang can delete an order record.
create policy "orders_delete_gudang_only"
  on public.orders for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'gudang')
  );


-- ---------- 3. ENFORCE COLUMN-LEVEL PERMISSIONS PER ROLE ----------
-- RLS can restrict which ROWS a role touches, but not which COLUMNS.
-- This trigger blocks a role from editing another role's section,
-- so Gudang cannot edit QC fields, QC cannot edit Supply fields, etc.
create or replace function public.enforce_role_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();

  if user_role = 'gudang' then
    if new.inspection_date      is distinct from old.inspection_date
    or new.good_material        is distinct from old.good_material
    or new.ng_material          is distinct from old.ng_material
    or new.qc_status            is distinct from old.qc_status
    or new.delivery_date_supply is distinct from old.delivery_date_supply
    or new.supply_date          is distinct from old.supply_date
    or new.supply_qty           is distinct from old.supply_qty
    or new.total_material       is distinct from old.total_material
    or new.final_status         is distinct from old.final_status
    then
      raise exception 'Role gudang hanya boleh mengubah data PI / Warehouse';
    end if;

  elsif user_role = 'qc' then
    if new.pi_no               is distinct from old.pi_no
    or new.pi_date              is distinct from old.pi_date
    or new.pi_qty                is distinct from old.pi_qty
    or new.brand                 is distinct from old.brand
    or new.pi_specification      is distinct from old.pi_specification
    or new.sj_do_no               is distinct from old.sj_do_no
    or new.sj_do_date              is distinct from old.sj_do_date
    or new.sj_do_qty                is distinct from old.sj_do_qty
    or new.sj_do_unit                is distinct from old.sj_do_unit
    or new.delivery_date_to_qc        is distinct from old.delivery_date_to_qc
    or new.status_material             is distinct from old.status_material
    or new.delivery_date_supply is distinct from old.delivery_date_supply
    or new.supply_date          is distinct from old.supply_date
    or new.supply_qty           is distinct from old.supply_qty
    or new.total_material       is distinct from old.total_material
    or new.final_status         is distinct from old.final_status
    then
      raise exception 'Role qc hanya boleh mengubah data Quality Control';
    end if;

  elsif user_role = 'supply' then
    if new.pi_no               is distinct from old.pi_no
    or new.pi_date              is distinct from old.pi_date
    or new.pi_qty                is distinct from old.pi_qty
    or new.brand                 is distinct from old.brand
    or new.pi_specification      is distinct from old.pi_specification
    or new.sj_do_no               is distinct from old.sj_do_no
    or new.sj_do_date              is distinct from old.sj_do_date
    or new.sj_do_qty                is distinct from old.sj_do_qty
    or new.sj_do_unit                is distinct from old.sj_do_unit
    or new.delivery_date_to_qc        is distinct from old.delivery_date_to_qc
    or new.status_material             is distinct from old.status_material
    or new.inspection_date      is distinct from old.inspection_date
    or new.good_material        is distinct from old.good_material
    or new.ng_material          is distinct from old.ng_material
    or new.qc_status            is distinct from old.qc_status
    then
      raise exception 'Role supply hanya boleh mengubah data Supply Material';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_role_columns on public.orders;
create trigger trg_enforce_role_columns
  before update on public.orders
  for each row execute function public.enforce_role_columns();


-- ---------- 4. REALTIME ----------
-- After running this file, go to Database → Replication in the
-- Supabase dashboard and enable Realtime on the "orders" table
-- so all 3 roles see updates live without refreshing.

-- ---------- 5. DONE ----------
-- Next: create your 3 users in Authentication → Users (or via the
-- app's sign-up screen) with user_metadata { "role": "gudang" | "qc" | "supply", "full_name": "..." }
