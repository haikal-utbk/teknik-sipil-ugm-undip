# Rencana Studi — UTBK-SNBT Teknik Sipil (versi web mandiri)

Semua kode aplikasi sudah lengkap dan siap. Yang perlu Anda lakukan hanya
menyambungkannya ke dua layanan **gratis**: **Supabase** (tempat data
disimpan) dan **Vercel** (tempat website di-hosting). Tidak perlu install
apa pun di komputer — semua bisa lewat browser.

Total waktu: sekitar 10–15 menit.

---

## Langkah 1 — Buat database di Supabase (gratis)

1. Buka https://supabase.com → **Start your project** → daftar/masuk (bisa pakai akun Google).
2. Klik **New project**. Isi nama bebas (mis. `rencana-studi-utbk`), buat password database (simpan, tidak akan dipakai lagi setelah ini), pilih region terdekat (Singapore), lalu **Create new project**. Tunggu ± 1–2 menit sampai project siap.
3. Di sidebar kiri, klik ikon **SQL Editor** → **New query**.
4. Buka file **`supabase-setup.sql`** yang ada di folder ini, salin semua isinya, tempel ke editor, lalu klik **Run**. Ini membuat tempat penyimpanan data dan mengunci agar setiap akun hanya bisa melihat datanya sendiri.
5. Di sidebar kiri, klik ikon **Settings (gerigi)** → **API**. Catat dua hal ini (akan dipakai di Langkah 3):
   - **Project URL**
   - **anon public** key (kunci panjang di bagian "Project API keys")
6. *(Opsional tapi disarankan)* Di **Authentication → Settings**, Anda bisa nonaktifkan "Confirm email" kalau ingin akun langsung bisa dipakai tanpa klik link verifikasi email — cocok untuk pemakaian keluarga sendiri.

## Langkah 2 — Unggah kode ke GitHub

1. Buka https://github.com → daftar/masuk (gratis).
2. Klik tombol **+** di kanan atas → **New repository**. Isi nama (mis. `rencana-studi-utbk`), biarkan **Public** atau **Private** (keduanya boleh), lalu **Create repository**.
3. Di halaman repo yang baru dibuat, klik **uploading an existing file**.
4. Buka folder proyek ini di komputer Anda, **seret semua file dan foldernya** (termasuk folder `src`) ke area upload GitHub. Tunggu sampai semua terunggah, lalu klik **Commit changes**.

## Langkah 3 — Deploy ke Vercel (gratis, otomatis dapat alamat web)

1. Buka https://vercel.com → **Sign Up** → pilih **Continue with GitHub** (paling mudah, langsung tersambung).
2. Klik **Add New... → Project**. Pilih repo `rencana-studi-utbk` yang tadi dibuat → **Import**.
3. Di bagian **Environment Variables**, tambahkan dua baris:
   - `VITE_SUPABASE_URL` → isi dengan Project URL dari Langkah 1
   - `VITE_SUPABASE_ANON_KEY` → isi dengan anon public key dari Langkah 1
4. Klik **Deploy**. Tunggu 1–2 menit.
5. Setelah selesai, Vercel akan memberi Anda alamat web seperti
   `https://rencana-studi-utbk.vercel.app` — ini alamat aplikasi Anda,
   bisa dibuka dari HP atau laptop mana pun.

## Langkah 4 — Mulai pakai

1. Buka alamat web dari Langkah 3.
2. Klik **"Belum punya akun? Daftar"**, isi email + password → **Daftar**.
   (Kalau Anda tidak menonaktifkan "Confirm email" di Langkah 1, cek inbox
   untuk klik link konfirmasi dulu sebelum bisa masuk.)
3. Buat akun kedua untuk anak Anda dengan email berbeda (atau pakai satu
   akun saja berdua — terserah preferensi Anda).
4. Login di perangkat mana pun dengan email + password yang sama → data
   otomatis sinkron karena tersimpan di database, bukan di perangkat.

---

## Kalau nanti mau mengubah aplikasi

Edit file di folder `src/`, lalu unggah ulang file yang berubah ke GitHub
(halaman repo → **Add file → Upload files**). Vercel otomatis akan
mem-build dan mempublikasikan ulang setiap kali ada perubahan di GitHub —
tidak perlu deploy manual lagi.

## Biaya

Supabase dan Vercel gratis untuk pemakaian skala pribadi/keluarga seperti
ini (jauh di bawah batas free tier keduanya). Tidak perlu kartu kredit
untuk mendaftar di paket gratis kedua layanan ini.
