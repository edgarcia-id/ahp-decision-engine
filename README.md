# ⚖️ AHP Decision Engine

**Kalkulator Analytic Hierarchy Process (AHP) gratis untuk mahasiswa, dosen, dan peneliti.** Susun hierarki bertingkat, isi perbandingan berpasangan dengan skala Saaty, gabungkan penilaian banyak responden, uji konsistensi dan sensitivitas, lalu unduh laporan PDF dan Excel yang siap dilampirkan di skripsi atau tesis. Semuanya berjalan di browser: tanpa akun, tanpa server, tanpa biaya.

*English: a free, browser-only AHP tool with multi-level hierarchies, group judgments (AIJ), consistency diagnostics, Expert Choice–style sensitivity analysis, and PDF/Excel reports.*

[![Buka aplikasi](https://img.shields.io/badge/Buka_aplikasi-AHP_Decision_Engine-0063b0?style=for-the-badge&logo=githubpages)](https://edgarcia-id.github.io/ahp-decision-engine/)
[![Metode](https://img.shields.io/badge/Metode-Eigenvector_Saaty-11703a?style=for-the-badge)](#metode-dan-rumus)
[![Arsitektur](https://img.shields.io/badge/Arsitektur-100%25_di_browser-e88d14?style=for-the-badge)](#privasi)
[![Lisensi](https://img.shields.io/badge/Lisensi-MIT-14213d?style=for-the-badge)](LICENSE)

👉 **[edgarcia-id.github.io/ahp-decision-engine](https://edgarcia-id.github.io/ahp-decision-engine/)**

---

## Fitur

Fitur disusun mengikuti alur kerja Expert Choice, sehingga mahasiswa yang diajari memakai Expert Choice bisa langsung berpindah.

| Kebutuhan | Expert Choice | AHP Decision Engine |
|---|---|---|
| Hierarki tujuan → kriteria → sub-kriteria → alternatif | ✓ | ✓ hingga 4 level, maksimal 15 anak per node |
| Perbandingan berpasangan skala 1–9 (numerik/verbal) | ✓ | ✓ slider 9–1–9 dengan teks verbal, plus mode matriks |
| Input desimal/pecahan (mis. hasil rata-rata geometrik) | ✓ | ✓ `3`, `1/3`, `2,47` |
| Rasio inkonsistensi + saran perbaikan | ✓ | ✓ 3 penilaian paling tidak konsisten, saran *best-fit*, CR setelah perbaikan |
| Penilaian tidak lengkap | ✓ | ✓ metode Harker |
| Penilaian kelompok | ✓ (Comparion, berbayar) | ✓ rata-rata geometrik berbobot (AIJ), peserta bisa dikecualikan |
| Kuesioner untuk responden jarak jauh | ✓ (Comparion, berbayar) | ✓ tautan + berkas/kode jawaban, tanpa server |
| Data nyata sebagai pengganti perbandingan | ✓ (*ratings/direct*) | ✓ kriteria benefit/cost |
| Sintesis distributive dan ideal | ✓ | ✓ |
| Grafik objektif & alternatif | ✓ | ✓ sunburst bobot, kontribusi bertumpuk, peringkat, bobot global |
| Sensitivitas dinamis, performa, gradien, head-to-head, 2D | ✓ | ✓ semua lima, plus tabel interval stabilitas eksak |
| Laporan | ✓ | ✓ PDF lengkap dengan langkah perhitungan; Excel dengan rumus hidup |
| Harga | lisensi berbayar | gratis, MIT |

### Unduhan

- **Laporan PDF**: ringkasan & kesimpulan, struktur hierarki, prioritas alternatif, bobot kriteria, uji konsistensi, analisis kelompok, sensitivitas, dan lampiran langkah perhitungan setiap matriks (matriks awal, jumlah kolom, normalisasi, bobot, A·w, λ maks, CI, RI, CR).
- **Excel (.xlsx)**: satu sheet per matriks dengan **rumus Excel** untuk jumlah kolom, normalisasi, rata-rata baris, λ maks, CI, dan CR, sehingga dosen penguji bisa menelusuri perhitungannya.
- **CSV penilaian**: semua penilaian semua peserta dalam format panjang, bisa diedit dan diimpor kembali.
- **Proyek (.json)**: simpan/buka ulang di perangkat lain.
- **PNG/SVG** untuk setiap diagram, siap ditempel ke naskah.

## Cara memakai

1. **Model**: tulis tujuan, tambah kriteria dan sub-kriteria, daftarkan alternatif. Alternatif boleh kosong bila Anda hanya butuh bobot kriteria (misalnya untuk dilanjutkan dengan SAW/TOPSIS).
2. **Penilaian**: bandingkan setiap pasangan. Panel kanan menampilkan bobot dan CR secara langsung.
3. **Hasil**: prioritas akhir, kontribusi tiap kriteria, bobot lokal/global.
4. **Sensitivitas**: geser bobot kriteria dan lihat apakah peringkat berubah.
5. **Laporan & unduh**: PDF, Excel, CSV, JSON.

Tiga contoh siap pakai tersedia di menu **Contoh & baru**: pemilihan laptop (individu, campuran data nyata), pemilihan supplier (kelompok tiga ahli), dan bobot kriteria lokasi perumahan (matriks dengan CR 0,29 untuk latihan perbaikan konsistensi).

### Kuesioner untuk banyak responden

1. Di **Laporan & unduh**, klik **Buat tautan kuesioner** dan kirim tautannya.
2. Responden mengisi di browser masing-masing (ponsel pun bisa), lalu mengirim balik **berkas jawaban** atau **kode jawaban**.
3. Peneliti menempel kode atau memilih berkas; setiap jawaban menjadi peserta baru dan otomatis digabung.

Tautan hanya memuat struktur model, tidak memuat penilaian Anda. Tidak ada data yang disimpan di server mana pun.

## Metode dan rumus

- **Bobot prioritas**: vektor eigen utama (metode pangkat, toleransi 10⁻¹⁴), seperti Saaty dan Expert Choice. Alternatif: normalisasi kolom + rata-rata baris (metode manual buku teks) dan rata-rata geometrik baris. Laporan menampilkan bobot eigen dan rata-rata baris berdampingan agar hitungan manual bisa dicocokkan.
- **Konsistensi**: λ maks = rata-rata (A·w)ᵢ/wᵢ; CI = (λ maks − n)/(n − 1); CR = CI/RI. RI Saaty: n=3: 0,58; 4: 0,90; 5: 1,12; 6: 1,24; 7: 1,32; 8: 1,41; 9: 1,45; 10: 1,49; 11: 1,51; 12: 1,48; 13: 1,56; 14: 1,57; 15: 1,59. Batas bawaan 0,10 (bisa diubah).
- **Saran perbaikan**: deviasi eᵢⱼ = aᵢⱼ·wⱼ/wᵢ; penilaian dengan |ln eᵢⱼ| terbesar disarankan diganti dengan wᵢ/wⱼ yang dibulatkan ke skala Saaty.
- **Penilaian tidak lengkap**: matriks Harker (1987); sel kosong dilengkapi dengan wᵢ/wⱼ untuk menghitung CR.
- **Kelompok**: rata-rata geometrik berbobot per sel (AIJ, Forman & Peniwati 1998).
- **Data nyata**: benefit = x/Σx; cost = (1/x)/Σ(1/x). Pada mode ideal, setara dengan normalisasi SAW (x/maks atau min/x).
- **Sintesis**: distributive (prioritas lokal berjumlah 1) atau ideal (dibagi nilai maksimum, mencegah *rank reversal*).
- **Sensitivitas**: bobot satu kriteria diubah, kriteria lain diskalakan proporsional. Skor alternatif linear terhadap bobot itu, sehingga titik silang dan interval stabilitas dihitung **eksak**, bukan dengan sampling.

### Validasi

- 25 unit test (`node --test tests/*.test.js`), termasuk pembanding terhadap `numpy.linalg.eig`.
- **Paritas Expert Choice 11**: matriks contoh lokasi perumahan menghasilkan CR 0,2897, sama dengan nilai `Incon: 0.29` yang dilaporkan Expert Choice.
- Rumus di berkas Excel dihitung ulang di LibreOffice dan cocok dengan hasil aplikasi hingga 6 desimal.
- Uji end-to-end di Chromium (desktop & ponsel) untuk seluruh alur, termasuk unduhan dan kuesioner.

## Privasi

Semua perhitungan berjalan di browser Anda. Proyek tersimpan otomatis di penyimpanan lokal browser; unduh berkas `.json` untuk cadangan. Tidak ada analitik, tidak ada pelacak, tidak ada data yang dikirim ke server. Font dan pustaka PDF disertakan di repositori sehingga aplikasi tetap berjalan tanpa CDN.

## Untuk pengembang

```text
index.html                 kerangka halaman
assets/js/ahp-core.js      mesin hitung murni (eigen, CR, Harker, AIJ, sintesis, sensitivitas)
assets/js/model.js         model proyek, contoh, kuesioner (encode/decode tautan)
assets/js/charts.js        diagram SVG tanpa pustaka
assets/js/export.js        XLSX (penulis ZIP sendiri), CSV, PNG/SVG, PDF (jsPDF)
assets/js/app.js           antarmuka
assets/vendor/             jsPDF 3.0.4 + jsPDF-AutoTable 5.0.9 (MIT), dimuat saat PDF diminta
assets/fonts/              Plus Jakarta Sans (SIL OFL)
tests/                     unit test Node
```

Jalankan lokal tanpa build:

```bash
python3 -m http.server 8000      # lalu buka http://localhost:8000
node --test tests/*.test.js      # unit test
```

## Cara mengutip

Bila Anda memakai alat ini dalam skripsi, tesis, atau publikasi:

> Tarigan, A. G. E. (2026). *AHP Decision Engine* (Versi 2.0) [Perangkat lunak]. NusaIT. https://edgarcia-id.github.io/ahp-decision-engine/

Metadata kutipan juga tersedia di [`CITATION.cff`](CITATION.cff) (tombol **Cite this repository** di GitHub).

Rujukan metode: Saaty, T. L. (1980). *The Analytic Hierarchy Process*. McGraw-Hill. · Harker, P. T. (1987). Incomplete pairwise comparisons in the analytic hierarchy process. *Mathematical Modelling, 9*(11), 837–848. · Forman, E., & Peniwati, K. (1998). Aggregating individual judgments and priorities with the analytic hierarchy process. *European Journal of Operational Research, 108*(1), 165–169.

---

## Tentang pengembang

**Alfredo (Ed) Garcia** adalah ERP Architect, IT Infrastructure Lead, dan Principal Consultant di **[PT Nusa Industri Teknologi (NusaIT)](https://nusait.com)**.

Perhitungan AHP hanyalah sebagian kecil dari keputusan yang baik. Bila organisasi Anda membutuhkan pendampingan penyusunan kuesioner AHP, olah data kelompok, audit vendor TI, atau sistem pendukung keputusan untuk instansi:

* 👔 **LinkedIn:** [Alfredo (Ed) Garcia](https://www.linkedin.com/in/alfredo-garcia-elbarta-tarigan/)
* 🏢 **Konsultan:** [PT Nusa Industri Teknologi (NusaIT)](https://nusait.com)
* 📧 **Konsultasi:** [NusaIT Contact & Advisory](https://nusait.com/contact)

---
*© 2026 Alfredo Garcia / NusaIT. Dirilis dengan lisensi MIT.*
