# Prompt Deploy — Generator Lampiran SK

Berkas ini berisi (1) prompt siap-tempel untuk agen deploy, dan (2) informasi Git.
Tidak ada rahasia di sini — repositori bersifat publik.

---

## BAGIAN 1 — PROMPT SIAP TEMPEL

> Salin seluruh blok di bawah ini ke agen deploy (Hermes atau lainnya).

```
TUGAS: Deploy aplikasi web statis "Generator Lampiran SK" ke hosting.

=== APA APLIKASI INI ===
Aplikasi web React + Vite yang membuat berkas Lampiran SK (Excel) dari data mentah
dan dokumen rekapitulasi periode. SELURUH proses berjalan di browser pengguna —
tidak ada backend, tidak ada database, tidak ada API, tidak ada variabel
lingkungan, tidak ada kunci rahasia. Data tidak pernah meninggalkan komputer
pengguna. Karena itu hosting yang dibutuhkan hanya penyaji berkas statis.

=== SUMBER KODE ===
  Repositori : https://github.com/Habibi0203/sk-web.git  (PUBLIK, klon tanpa kredensial)
  Branch     : main
  Commit     : c2ca6c6

=== LANGKAH DEPLOY ===
1. Klon repositori:
     git clone https://github.com/Habibi0203/sk-web.git
     cd sk-web
     git checkout main

2. Pasang dependensi:
     npm ci
   Syarat Node.js: Vite 5.4 mensyaratkan ^18.0.0 atau >=20.0.0.
   Build ini sudah diuji pada Node v22.22.2. Disarankan Node 20 atau lebih baru.
   Bila npm ci gagal, pakai: npm install

3. Build:
     npm run build
   Perintah ini menjalankan pemeriksaan tipe TypeScript lalu membangun dengan Vite.
   JIKA ADA ERROR TIPE, JANGAN DIPAKSA LANJUT — laporkan pesan error-nya.
   Hasil build ada di folder: dist/

4. Sajikan isi folder dist/ sebagai berkas statis.
   Tidak perlu proses Node yang berjalan terus-menerus — cukup penyaji statis
   apa pun (nginx, Caddy, S3, Cloudflare Pages, Vercel, GitHub Pages, dll).

=== SYARAT YANG WAJIB DIPENUHI (kalau tidak, aplikasi rusak) ===

(a) HARUS disajikan lewat HTTP/HTTPS, bukan dibuka sebagai berkas file://.
    Aplikasi memakai fetch() untuk mengambil asetnya sendiri. Pada file://
    semua permintaan itu diblokir browser.

(b) CSP: bila kamu memasang header Content-Security-Policy, maka
    connect-src HARUS 'self'. DILARANG 'none'.
    Alasan: fetch() diatur oleh connect-src, bukan default-src. Nilai 'none'
    memblokir SEMUA fetch — termasuk pengambilan aset milik aplikasi sendiri —
    sehingga aplikasi tampil dengan template kosong dan data periode 0 entri,
    TANPA pesan error apa pun di layar. Bug ini pernah terjadi dan susah dilacak.
    Susunan CSP yang sudah teruji (juga sudah tertanam di dist/index.html):
      default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data:; font-src 'self'; connect-src 'self';
      object-src 'none'; base-uri 'self'; form-action 'none'
    Catatan: dist/index.html SUDAH memuat CSP di dalam <meta>. Kalau hosting juga
    memasang header CSP, pastikan keduanya TIDAK saling bertentangan — yang paling
    ketat akan berlaku.

(c) Jenis konten (MIME) harus benar, terutama:
      .xlsx  -> application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
      .json  -> application/json
      .js    -> text/javascript
      .css   -> text/css
    Sebagian penyaji statis tidak mengenali .xlsx dan mengirim
    application/octet-stream. Itu masih dapat diterima. Yang MERUSAK adalah
    mengirim .xlsx sebagai text/html.

(d) Aplikasi memakai jalur relatif (base './'), jadi aman diletakkan di akar
    domain maupun di sub-folder. Tidak perlu konfigurasi rewrite.

(e) Tidak ada routing sisi klien, jadi TIDAK perlu aturan fallback SPA
    (semua permintaan ke berkas tak dikenal tidak akan terjadi).

=== BERKAS YANG DIHASILKAN BUILD (harus ada di dist/) ===
  dist/index.html
  dist/template-default.xlsx          <-- aset bawaan, WAJIB ikut
  dist/enddates-default.json          <-- aset bawaan, WAJIB ikut
  dist/assets/index-*.js
  dist/assets/index-*.css
  dist/assets/exceljs.min-*.js
Kalau template-default.xlsx atau enddates-default.json hilang dari dist/,
build tidak lengkap — laporkan, jangan deploy.

=== CACHE (disarankan) ===
  Berkas di dist/assets/ memakai nama ber-hash -> boleh cache lama (mis. 1 tahun, immutable).
  dist/index.html harus TANPA cache atau cache sangat pendek, supaya versi baru
  langsung terpakai.
  dist/template-default.xlsx dan dist/enddates-default.json: cache sedang
  (mis. 1 jam), karena pengguna bisa memperbaruinya dari menu Pengaturan.

=== VERIFIKASI SETELAH DEPLOY (wajib, laporkan hasilnya) ===
Jalankan pemeriksaan berikut dan laporkan angka apa adanya:
  1. GET {URL}/                -> harus 200
  2. GET {URL}/template-default.xlsx   -> harus 200 (ukuran sekitar 6.544 byte)
  3. GET {URL}/enddates-default.json   -> harus 200 (ukuran sekitar 69.681 byte)
  4. Ambil nama berkas JS/CSS dari index.html, lalu GET masing-masing -> harus 200
  5. Periksa header CSP: nilai connect-src harus 'self'
  6. Buka {URL}/ di browser sungguhan, lalu pastikan SEMUA ini benar:
       - Panel aset menampilkan: "Template: template-default.xlsx (bawaan)"
       - Panel aset menampilkan data periode dengan 409 entri, bukan 0
       - Tidak ada pesan gagal di layar
       - Konsol browser tidak memuat pesan apa pun
     Langkah ini WAJIB. Pemeriksaan lewat curl saja TIDAK cukup — dua bug besar
     pada proyek ini (CSP memblokir fetch, dan border tabel hilang) sama-sama
     lolos dari pemeriksaan command-line dan hanya ketahuan di browser.

=== YANG TIDAK BOLEH DILAKUKAN ===
  - Jangan menjalankan `npm test` sebagai syarat deploy (tes butuh berkas data
    pribadi lokal yang sengaja tidak ada di repositori; tes pemeriksaan-lokal itu
    akan dilewati sendiri, jadi hasilya tetap hijau).
  - Jangan commit folder dist/ ke repositori. dist/ sudah ada di .gitignore
    dan MEMANG tidak boleh masuk.
  - Jangan menambahkan berkas data (.xlsx, .docx, .csv, .pdf, .zip) ke repositori.
    Repositori ini publik dan berkas data berisi data pribadi.
  - Jangan mengubah .gitignore pada bagian DATA PRIBADI.
  - Jangan menyalin berkas data dari komputermu ke server.

=== LAPORKAN KEMBALI ===
Sertakan: URL hasil deploy, commit yang di-deploy, hasil 6 langkah verifikasi di atas,
dan setiap peringatan atau penyimpangan yang kamu temui.
```

---

## BAGIAN 2 — INFORMASI GIT

### Keadaan repositori saat ini

| | |
|---|---|
| Repositori | `https://github.com/Habibi0203/sk-web.git` (publik) |
| Branch | `main` |
| Commit terakhir | `c2ca6c6` — fix: border tabel hilang, ukuran kertas F4, dan TMT tanpa tanggal |
| Status kerja | bersih, sudah ter-push |
| `dist/` | **tidak** di-commit (di-`.gitignore`), dibuat saat build |

### Perintah Git yang relevan

Klon dan pilih commit yang tepat:

```bash
git clone https://github.com/Habibi0203/sk-web.git
cd sk-web
git checkout main
git log --oneline -1        # harus menampilkan c2ca6c6
```

Bila ingin men-deploy commit tertentu secara pasti (disarankan, supaya dapat diulang):

```bash
git fetch --all --tags
git checkout c2ca6c6        # commit yang sudah diverifikasi
```

Cek apakah ada pembaruan sebelum deploy:

```bash
git fetch origin main
git log --oneline HEAD..origin/main   # kosong = sudah paling baru
```

### Riwayat commit

```
c2ca6c6  fix: border tabel hilang, ukuran kertas F4, dan TMT tanpa tanggal
57e2869  fix: connect-src 'none' memblokir fetch aset bawaan aplikasi
b41f173  refactor(ui): pisahkan alur kerja dari utilitas, tambah tema manual
e5304d2  feat: edit sel manual + riwayat pemrosesan
bda43ae  feat: ekspor XLSX dengan tiga mode keluaran
ca9ea55  feat: aset bawaan + menu Pengaturan untuk pembaruan
d739eb7  feat: baca file mentah, docx, dan template + pratinjau per sheet
f59c716  chore: blokir .git-credentials dan .netrc di .gitignore
95108d5  feat: kerangka awal aplikasi web generator Lampiran SK
```

### Kalau perlu men-deploy versi baru nanti

```bash
cd sk-web
git pull origin main
npm ci
npm run build          # tancapkan dulu: JANGAN deploy bila ada error tipe
# lalu sajikan ulang isi dist/
```

### Peringatan Git

- Repositori **publik** — apa pun yang di-commit bisa dilihat siapa saja.
- `.gitignore` sengaja memblokir `*.xlsx`, `*.docx`, `*.csv`, `*.pdf`, `*.zip`
  **kecuali** `!public/template-default.xlsx` (aset layout aplikasi, tanpa data pribadi).
  Jangan hapus pengecualian itu, kalau tidak aset bawaan akan hilang dari repo.
- Jika `npm ci` gagal karena lockfile tidak sinkron, gunakan `npm install`
  lalu **jangan** commit perubahan `package-lock.json` tanpa sengaja diperiksa.
