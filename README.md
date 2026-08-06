# TrackFlow — Order, QC & Supply Material Tracker

Aplikasi web mobile-friendly untuk 3 bagian: **Gudang**, **Quality Control**, dan **Supply Material**.
Semua data masuk ke satu tabel `orders` di Supabase, tiap bagian hanya bisa mengisi kolom
bagiannya sendiri (dijaga di level database, bukan cuma di tampilan).

Stack: **HTML/CSS/JS murni (tanpa build tool)** + **Supabase** (database, auth, realtime).
Hosting: **GitHub Pages**. Tidak perlu server tambahan.

---

## 1. Setup Supabase (± 5 menit)

1. Buat akun/project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → New query → paste seluruh isi file [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Ini akan membuat tabel `profiles`, `orders`, semua aturan keamanan (RLS), dan trigger yang
   mengunci setiap bagian agar hanya bisa mengubah kolom miliknya.
3. Buka **Database → Replication** → aktifkan **Realtime** untuk tabel `orders`
   (supaya semua user melihat perubahan secara live tanpa refresh).
4. Buka **Project Settings → API** → salin:
   - `Project URL`
   - `anon public` key

## 2. Hubungkan aplikasi ke Supabase

Edit file `assets/js/config.js`:

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

> `anon key` ini memang publik/aman ditaruh di frontend — perlindungan data sesungguhnya
> dilakukan oleh RLS policy & trigger di database (sudah diatur oleh `schema.sql`).

## 3. Deploy ke GitHub Pages (± 3 menit)

1. Buat repository baru di GitHub, lalu push seluruh folder ini:
   ```bash
   git init
   git add .
   git commit -m "TrackFlow initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
2. Di GitHub repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → **Save**.
3. Tunggu 1–2 menit, aplikasi akan tersedia di:
   `https://USERNAME.github.io/NAMA-REPO/`

## 4. Buat 3 user (Gudang, QC, Supply Material)

Paling mudah: buka aplikasi kamu → klik **"Daftar di sini"** → isi email, password, nama,
dan pilih **Bagian** (Gudang / Quality Control / Supply Material) untuk masing-masing user.
Role otomatis tersimpan dan menentukan kolom apa saja yang boleh mereka ubah.

(Alternatif: buat user manual di Supabase → Authentication → Users, lalu isi
`user_metadata` dengan `{"role": "gudang", "full_name": "..."}`.)

---

## Cara kerja alur data

Satu baris di tabel `orders` mengalir lewat 3 tahap, persis seperti struktur tabel di brief:

| Tahap | Diisi oleh | Kolom |
|---|---|---|
| **PI Data** | Gudang | PI No/Date/Qty, Brand, Specification, SJ/DO No/Date/Qty/Unit, Delivery Date to QC, Status Material |
| **Incoming QC** | Quality Control | Inspection Date, Good Material, N.G Material, Status |
| **Supply Material** | Supply Material | Delivery Date, Supply Date, Supply Qty, Total Material, Status |

- **Gudang** membuat order baru (mengisi PI Data).
- **QC** & **Supply** hanya mengedit order yang sudah ada — melengkapi bagian mereka.
- Setiap kartu order menampilkan **rel progres 3-segmen** (Gudang → QC → Supply) yang terisi
  sesuai tahap mana yang sudah selesai — segmen QC berubah merah otomatis kalau statusnya **NG**.
- Semua perubahan tersinkron **realtime** ke semua user yang sedang membuka aplikasi.

## Struktur file

```
index.html              → halaman login / daftar
app.html                → dashboard utama (perlu login)
assets/css/style.css    → seluruh styling
assets/js/config.js     → ← isi URL & anon key Supabase kamu di sini
assets/js/supabaseClient.js
assets/js/app.js        → logika aplikasi (fetch, form, realtime, kunci per-role)
supabase/schema.sql     → skema database + keamanan (jalankan sekali di Supabase)
```

## Keamanan

- Row Level Security aktif di semua tabel.
- Trigger `enforce_role_columns` di database menolak `UPDATE` jika sebuah role mencoba
  mengubah kolom di luar bagiannya — jadi aturan ini berlaku walau seseorang mencoba
  memanggil API Supabase langsung dari luar aplikasi.
- Hanya Gudang yang bisa membuat & menghapus order.
