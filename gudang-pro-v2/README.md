# 📦 Gudang Pro V2

Aplikasi manajemen inventory gudang — Login, Stok Gudang/Pendukung, Barang Masuk/Keluar,
Input PI, Tracking Material, Laporan Eksekutif, Backup & Export, Kelola User, dan Log Aktivitas.
Dibangun sebagai **web app (PWA)** yang bisa di-install ke HP seperti aplikasi, dan bisa
dikonversi jadi file **.apk** lewat PWABuilder.

---

## 1. Setup Database (Supabase)

1. Buka [supabase.com](https://supabase.com) → project kamu → menu **SQL Editor** → **New query**.
2. Copy seluruh isi file `sql/schema.sql`, paste, lalu klik **Run**.
   Ini akan membuat semua tabel, trigger stok otomatis, dan aturan keamanan (RLS).
3. Buka menu **Authentication → Providers**, pastikan **Email** provider aktif.
   (Opsional) Di **Authentication → Settings**, kamu bisa matikan "Confirm email" dulu
   supaya lebih cepat waktu testing.

## 2. Hubungkan App ke Supabase

1. Buka **Project Settings → API** di Supabase, salin `Project URL` dan `anon public key`.
2. Edit file `assets/js/supabase-config.js`:
   ```js
   export const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "isi-anon-key-kamu-di-sini";
   ```

## 3. Buat Akun Admin Pertama

1. Deploy dulu (lihat langkah 4) atau buka file secara lokal.
2. Buka halaman **register.html**, daftar dengan email & password kamu.
3. Buka Supabase → **Table Editor → profiles**, cari baris dengan email kamu,
   ubah kolom `role` jadi `admin` dan `status` jadi `active`.
4. Sekarang kamu bisa login sebagai admin. User yang daftar setelah ini akan
   berstatus `pending` sampai di-approve lewat menu **Kelola User**.

## 4. Deploy ke GitHub Pages

1. Buat repository baru di GitHub, upload semua file & folder ini (jangan lupa
   folder `assets/`).
2. Buka repo → **Settings → Pages** → Source: pilih branch `main`, folder `/ (root)`.
3. Tunggu 1-2 menit, situs akan aktif di `https://username.github.io/nama-repo/`.

## 5. Jadikan APK (Opsional)

App ini sudah PWA (punya `manifest.json` + `service-worker.js`), jadi bisa langsung:
- **Install ke HP**: buka link GitHub Pages di Chrome Android → menu (⋮) → "Add to Home screen" / "Install app".
- **Jadi file .apk asli**: buka [pwabuilder.com](https://www.pwabuilder.com), masukkan URL
  GitHub Pages kamu, klik **Start**, lalu pilih **Android** → download paket APK-nya.
  Ini gratis dan tidak perlu install Android Studio.

## Struktur Fitur

| Menu | Keterangan |
|---|---|
| Dashboard | Ringkasan stok, item menipis, aktivitas terbaru |
| Input PI | Rencana produksi/kebutuhan material per item |
| Barang Masuk / Keluar | Transaksi stok, otomatis update `current_stock` |
| Stok Gudang / Pendukung | Master data item, dipisah berdasarkan `item_type` |
| QR Code | Generate & cetak label QR per item (untuk ditempel di rak/barang) |
| Scan QR | Scan QR via kamera HP → lookup item → catat masuk/keluar langsung |
| Tracking Material | Status material (diterima → di gudang → terpakai/retur) |
| Material Masuk | Penerimaan material mentah, bisa dikirim ke Tracking |
| QC Inspection | Catat hasil pemeriksaan kualitas (pass/NG + alasan) |
| Proses Diecut | Catat proses produksi: input, output, reject per mesin |
| Kirim Produksi | Catat pengiriman material/hasil ke line produksi |
| Laporan NG | Rekap reject dari QC & Diecut, tren bulanan, top alasan NG |
| Laporan Eksekutif | Grafik tren 6 bulan, top item keluar |
| Backup & Export | Backup JSON lengkap (admin), export CSV per tabel |
| Kelola User | Approve/blokir user, atur role (admin only) |
| Log Aktivitas | Riwayat semua aksi penting di sistem (admin only) |

## Catatan Fitur QR Code & Scan QR

- Halaman **QR Code** men-generate kode QR untuk tiap item (isi payload: SKU item),
  bisa dicetak langsung (tombol "Cetak Label") untuk ditempel di rak/kemasan.
- Halaman **Scan QR** membuka kamera HP, begitu QR terbaca langsung menampilkan
  info stok item tersebut + tombol cepat "Catat Masuk" / "Catat Keluar".
- Scan QR butuh izin kamera browser dan idealnya diakses lewat **HTTPS**
  (GitHub Pages otomatis HTTPS, jadi aman).

## Catatan Keamanan

- Semua tabel diproteksi **Row Level Security (RLS)** — user harus login & berstatus
  `active` untuk mengakses data. `activity_log` hanya bisa dibaca admin.
- Pembuatan akun user baru (Auth) tidak bisa dilakukan lewat menu Kelola User karena
  butuh service-role key yang tidak boleh ditaruh di kode front-end. Alur yang aman:
  user daftar sendiri lewat `register.html` → admin approve di **Kelola User**.
- Jangan commit `anon key` ke repo publik sebagai rahasia besar — anon key memang
  didesain untuk dipakai di sisi client, keamanan sebenarnya ada di RLS policy di database.
