# Ruang Cerita

Aplikasi internal kelas X SIJA B untuk menyampaikan Keluh, Pesan, Kesan, dan Saran setiap bulan. Dibangun dengan Next.js, TypeScript, Tailwind CSS, dan PostgreSQL.

## Fitur

- Login siswa dan pengurus dengan kewajiban mengganti password awal.
- Satu laporan berisi empat kategori setiap bulan.
- Dashboard siswa, riwayat tanggapan, dan kotak masuk Pesan.
- Dashboard pengurus, rekap pengisian, filter antrean, dan laporan prioritas.
- Penerusan Pesan dengan pilihan menampilkan atau merahasiakan nama pengirim.
- Pengelolaan email siswa dan reset password.
- Session aman menggunakan cookie `httpOnly` dan password hash bcrypt.
- UI responsif glassmorphism bergaya iPhone dengan fallback reduced transparency.

## Menjalankan Lokal

Syarat: Node.js 20+ dan PostgreSQL.

```bash
npm install
cp .env.example .env.local
npm run db:setup
npm run dev
```

Buka `http://localhost:3000`.

Akun awal:

```text
Pengurus: pengurus1 / 123
Siswa contoh: amira / 123
```

Semua akun wajib membuat password baru minimal 8 karakter pada login pertama. Daftar username lengkap berada di `scripts/setup-db.mjs`.

## Environment Variables

| Variable | Keterangan |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL/Supabase. Gunakan pooler URL untuk Vercel. |
| `SESSION_SECRET` | Random string minimal 32 karakter dan berbeda antara lokal/production. |
| `APP_URL` | URL aplikasi, misalnya `https://ruang-cerita.vercel.app`. |
| `RESEND_API_KEY` | Disiapkan untuk notifikasi email setelah domain pengirim tersedia. |
| `EMAIL_FROM` | Alamat pengirim yang sudah diverifikasi di Resend. |

## Deploy Supabase dan Vercel

1. Buat project di Supabase.
2. Buka SQL Editor Supabase, jalankan isi `db/schema.sql`.
3. Salin pooler connection string Supabase sebagai `DATABASE_URL` lokal sementara.
4. Jalankan `npm run db:setup` satu kali untuk membuat 32 akun siswa dan satu pengurus.
5. Buat repository GitHub dan push folder ini.
6. Import repository tersebut ke Vercel.
7. Tambahkan `DATABASE_URL`, `SESSION_SECRET`, dan `APP_URL` di Project Settings > Environment Variables.
8. Deploy dan segera login sebagai `pengurus1` untuk mengganti password awal.
9. Masukkan email siswa melalui menu Siswa.

Jangan menyimpan `.env.local`, password baru, atau connection string di GitHub. File `.env.local` sudah diabaikan oleh Git.

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm run build
```

## Catatan Privasi

- GitHub dan Vercel tidak digunakan sebagai tempat penyimpanan isi laporan.
- Isi laporan tersimpan di PostgreSQL dan hanya dapat dibaca akun terkait.
- Notifikasi email nantinya hanya memuat pemberitahuan dan tautan, bukan isi curhat.
- Label prioritas hanya membantu pengurus menyortir laporan dan bukan pengganti guru BK atau layanan darurat.
