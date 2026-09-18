# Pendaftaran TOBK TKA SD Kelas 6 Se-Kab. Sumenep 2026

Paket ini berisi 2 cara deploy formulir pendaftaran, keduanya memakai **Google Sheets** yang sama sebagai database (dibuat otomatis):

```
tobk/
├── Code.gs              # Backend Apps Script (WAJIB — dipakai di kedua cara)
├── Index.html            # Frontend versi Apps Script (google.script.run)
└── vercel/
    ├── index.html         # Frontend statis untuk Vercel (fetch API)
    ├── config.js          # Tempat isi URL Web App Apps Script
    └── vercel.json
```

---

## CARA 1 — Full Google Apps Script (paling simpel, gratis, tanpa Vercel)

1. Buka https://script.google.com → **New project**.
2. Hapus isi `Code.gs` bawaan, tempel isi file `Code.gs` dari paket ini.
3. Klik **+** di samping "Files" → **HTML** → beri nama **Index** (huruf besar di awal, tanpa `.html`) → tempel isi file `Index.html`.
4. Klik **Deploy → New deployment**:
   - Select type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Klik **Deploy**, izinkan akses (Authorize access) saat diminta.
6. Salin **Web app URL** yang muncul — ini link yang dibagikan ke pendaftar/orang tua.
7. Spreadsheet **"Database Pendaftaran TOBK TKA SD 6 - Sumenep 2026"** akan otomatis terbuat di Google Drive akun kamu saat pendaftaran pertama masuk (atau jalankan fungsi `setupSpreadsheet` sekali dari editor untuk membuatnya lebih awal).

Selesai — tidak perlu Vercel sama sekali untuk cara ini.

---

## CARA 2 — Frontend di Vercel + Backend Apps Script (custom domain, tampilan lebih cepat/CDN)

Gunakan cara ini jika ingin form diakses lewat domain sendiri (misal `daftar-tobk.vercel.app` atau domain custom).

### Langkah A — Deploy backend (tetap di Apps Script)
Sama seperti **Cara 1 langkah 1–6**, tapi khusus untuk endpoint API, **`Index.html` versi Apps Script tidak wajib dipakai** (opsional, boleh tetap ditambahkan sebagai cadangan). Yang penting `Code.gs` sudah ter-deploy sebagai Web App dan kamu punya **Web app URL**-nya (contoh: `https://script.google.com/macros/s/AKfycbx.../exec`).

### Langkah B — Deploy frontend ke Vercel
1. Buka folder `vercel/`.
2. Edit `config.js`, ganti:
   ```js
   window.APPS_SCRIPT_URL = "GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT";
   ```
   dengan URL Web App dari Langkah A, contoh:
   ```js
   window.APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
   ```
3. Deploy ke Vercel (pilih salah satu):
   - **Vercel CLI**:
     ```bash
     npm i -g vercel
     cd vercel
     vercel --prod
     ```
   - **Vercel Dashboard**: buat repo Git berisi isi folder `vercel/`, lalu **Import Project** di https://vercel.com/new (Framework preset: **Other**, tidak perlu build command — murni static site).
4. Selesai. Halaman akan tampil di `https://<nama-project>.vercel.app`.

> Catatan CORS: `vercel/index.html` mengirim `fetch()` dengan header `Content-Type: text/plain` (bukan `application/json`) agar browser **tidak** melakukan CORS preflight (`OPTIONS`), karena Apps Script Web App tidak menangani preflight. Endpoint `doPost` di `Code.gs` tetap mem-parsing body sebagai JSON secara manual, dan Apps Script otomatis mengizinkan akses cross-origin untuk deployment "Anyone".

---

## Struktur data di Google Sheets

Sheet **"Pendaftaran"** akan berisi kolom:

| Timestamp | No. Pendaftaran | Nama Lengkap Siswa | Tanggal Lahir | Asal Sekolah | No. HP Siswa | No. HP Orang Tua | Pekerjaan Orang Tua | Persetujuan Data |
|---|---|---|---|---|---|---|---|---|

- **No. Pendaftaran** otomatis berformat `TOBK2026-0001`, `TOBK2026-0002`, dst.
- Header sheet otomatis diberi warna merah (#C62828) dengan teks putih.

## Validasi yang diterapkan (client + server)

1. Nama Lengkap — wajib, hanya huruf & spasi.
2. Tanggal Lahir — wajib, **tahun kelahiran maksimal 2014**.
3. Asal Sekolah — wajib dipilih dari 11 sekolah yang sudah ditentukan.
4. No. HP Siswa — wajib diawali `0`, hanya angka, tanpa spasi/karakter lain.
5. No. HP Orang Tua — sama seperti di atas.
6. Pekerjaan Orang Tua — wajib diisi.
7. Checkbox pernyataan kebenaran data — wajib dicentang.
8. Link grup WA orang tua ditampilkan di form maupun di layar sukses setelah submit.

Validasi juga dijalankan ulang di server (`Code.gs`) agar tidak bisa dilewati meski JavaScript di browser dimatikan/dimanipulasi.
