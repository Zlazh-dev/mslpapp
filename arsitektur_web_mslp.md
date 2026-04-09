# Rangkuman Arsitektur & Sistem Aplikasi Web MSLP

Dokumen ini berisi gambaran komprehensif terkait arsitektur sistem, stack teknologi, modul fitur database, dan penjelasan spesifik mengenai *Engine Cetak PDF* dengan layout yang dapat dikustomisasi (Custom PDF Printing Engine).

---

## 1. Stack Teknologi Utama

Aplikasi MSLP merupakan sistem manajemen data pesantren / sekolah modern (Fullstack Web Application) yang dibagi menjadi Backend API dan Frontend SPA (Single Page Application).

### **Backend**
*   **Framework:** NestJS (Node.js)
*   **Bahasa Pemrograman:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Prisma ORM
*   **Security & Auth:** Passport JWT, Bcrypt, Helmet, Throttler (Rate Limiting)
*   **Fitur Extra Backend:** `adm-zip` untuk backup data utuh (Database dump + file uploads), `multer` untuk file upload, `exceljs` dan `xlsx` untuk pengolahan spreadsheet.

### **Frontend**
*   **Framework:** React 18
*   **Build Tool:** Vite
*   **Bahasa Pemrograman:** TypeScript
*   **Styling:** Tailwind CSS, PostCSS, Autoprefixer
*   **State Management:** Zustand (untuk global state, AuthStore)
*   **Form Handling:** React Hook Form + Zod Resolvers
*   **Drag & Drop:** `@dnd-kit/core`
*   **Visualisasi & Ikon:** Recharts (untuk dashboard charts), Lucide React (Icons)
*   **PDF & File Generator:** `jspdf`, `jspdf-autotable`, `xlsx`, `qrcode.react` (untuk komponen rendering QR pada PDF).

---

## 2. Struktur Database (Prisma Schema Overview)

Sistem ini memiliki *relasi hirarki berantai* untuk entitas akademik dan asrama, serta sistem peran berlapis (Multi-Role System).

1.  **Sistem User & Autentikasi**
    *   **User:** Menyimpan kredensial (`username`, `password`) dan relasi ke `Santri` atau entitas pengajar/pembina. Tiap user memiliki fitur pencatatan *lastLoginAt*.
    *   **Role:** Multi-Role arsitektur. Satu user dapat memiliki lebih dari satu Role (Misal: *Admin*, *Wali Kelas*, dan *Pembimbing Kamar* secara bersamaan).
    *   **Setting:** Tabel *key-value* JSON dinamis secara server-side untuk pengaturan global web.

2.  **Sistem Akademik (Hierarki Kelas)**
    *   **Jenjang** -> memiliki banyak -> **Tingkat** -> memiliki banyak -> **Kelas**
    *   Tabel `Kelas` dihubungkan ke `User` (sebagai Wali Kelas).
    *   Tabel `Nilai`: Menampung nilai akademik santri secara transaksional (Ujian harian, UTS, UAS per semester, per mata pelajaran).
    *   Tabel `PresensiKelas` & `PresensiSiswa`: Sistem pencatatan absensi yang tersinkronasi (Hadir, Sakit, Izin, Alpa) dan diakses langsung oleh pengajar.

3.  **Sistem Asrama (Hierarki Kamar)**
    *   **Kompleks** -> memiliki banyak -> **Gedung** -> memiliki banyak -> **Kamar**
    *   Tabel `Kamar` memiliki konfigurasi batas kapasitas dan di-handle oleh fitur `PembimbingKamar` (merujuk ke `User`).

4.  **Sistem Santri (Core Data)**
    *   Informasi biodata lengkap, KK, NIK, alamat lengkap, dan foto.
    *   Informasi orang tua / wali.
    *   Status Santri (`ACTIVE`, `INACTIVE`) serta jalur pendidikan (Formal, Ma'had Aly, Tahfidz).

5.  **Sistem Komunikasi (Chatting)**
    *   Model `ChatMessage` memfasilitasi pesan langsung (DM) antar `User` sistem. Mendukung fitur pesan terarsip (`isArchived`), flag penting (`isImportant`), dan status baca.

---

## 3. Modul & Fungsionalitas Utama (Sistem Web)

Berdasarkan direktori frontend (`/src/pages`), web ini mencakup fitur halaman/sistem sebagai berikut:

*   **Dashboard & Pelaporan:** Menampilkan agregat chart statistik data santri, kapasitas kamar, dan summary sistem.
*   **Manajemen Santri:** CRUD menyeluruh dari detail, impor/ekspor data berbasis `xlsx`, hingga public view santri.
*   **Manajemen Asrama & Kamar:** Navigasi Manajemen Kompleks, Gedung, dan Kamar. Mengatur siapa yang masuk kamar dan siapa pembimbingnya. Memiliki fitur filter khusus "Kamar Saya".
*   **Manajemen Akademik & Kelas:** Serupa dengan kamar namun berfokus di kelas pendidikan. Fitur "Kelas Saya", administrasi entry, dan rekapitulasi form nilai (`NilaiFormPage`, `NilaiListPage`).
*   **Modul Chat System:** In-app messaging realtime-ready (`ChatPage`).
*   **Backup & Restore:** Sistem manajemen file backup berwujud `.ZIP` lengkap, memaketkan *JSON row* dari Database Prisma dan file media/gambar dari folder `uploads/` (`BackupDataPage`).
*   **User & Role Management:** Mengatur pembuatan akun, multi-role (Wali Kelas, Admin, dll), dan mapping akun-santri.

---

## 4. Engine Cetak PDF Full Kustomisasi (Template Editor)

Titik kekuatan aplikasi ini selain pendataan struktural adalah fitur **"Pengaturan Cetak" (`PrintSettingsPage`)**, memampukan operator sistem merakit template dokumen dinamis (seperti Kartu Tanda Santri, Kartu Ujian, ID Card, Surat Laporan, dll) tanpa melalui koding.

Sistem ini diimplementasikan dengan editor visual free-form pada Frontend dengan cara kerja sebagai berikut:

### A. Tipe Elemen Penyusun Template (`CanvasElement`)
Engine ini menggunakan pendekatan layaknya program editor desain di mana setiap elemen diposisikan dalam canvas. Macam-macam tipe elemen:
1.  **`text`**: Label atau teks statis yang diketik manual.
2.  **`field`**: Variable Text. Teks placeholder (menunggu substitusi data referensi, misal otomatis diganti menjadi NIS, Nama Lengkap, atau Alamat dari data santri saat di-print).
3.  **`image`**: Menyematkan logo/gambar statis instansi atau image dinamis (URL profile photo santri).
4.  **`rect` / `circle`**: Bentuk geometri dinamis untuk membuat kotak border photo, pemisah, layouting, tau header dokumen.
5.  **`qrcode`**: Engine generate *QR-Code on-the-fly*. Menggunakan library `qrcode.react`, modul ini bisa mengubah nilai field data (Contoh: string NIS atau URL data diri) menjadi grafis QR-Code secara langsung untuk kebutuhan validasi/scan.
6.  **`group`**: Menampung elemen multi-komponen sehingga saling terikat dan dapat digerakkan ke dalam koordinat yang sama.

### B. Properti Spatial, Styling, & Posisi Absolut
Setiap elemen canvas direkam kedalam database JSON (`PrintTemplate` array) lengkap memuat metadata:
*   Posisi Tepat: Koordinat lokasi Absolut `X` dan `Y`.
*   Dimensi Element: Ukuran Lebar (`W`) dan Tinggi (`H`).
*   Object Styling Canggih: Setting inline CSS properties, meliputi `strokeWidth`, warna `strokeColor`, solid border/garis terputus (`strokeStyle`), warna text, hingga *background-color*.

### C. Drag & Drop beserta Pengurutan Layer
Mengandalkan library frontend reordering drag and drop yaitu `@dnd-kit`:
*   Pengguna dapat langsung menarik (drag) elemen di antarmuka layout untuk merapikan posisinya.
*   Engine mendukung **Reordering Layer Control** (pengaturan level z-index tumpukan layer) pada panel sidebar, sehingga jika ada gambar latar dan tulisan yang bertabrakan, urutan depannya bisa dipindah dengan mudah, mirip dengan panel layers Adobe Photoshop.

### D. Mekanisme Kompilasi ke Render PDF
Saat pencetakan berjalan, engine tidak melakukan trik screenshot halaman web (`window.print`), melainkan menggambar native PDF untuk ketajaman vektor (*lossless*/tanpa kabur):
1.  Template Visual JSON (*Blueprint*) di-download dari API.
2.  Data baris (data santri massal) siap dicetak dipilih.
3.  Program me-*looping* array data tersebut setiap halaman. Untuk semua elemen bertipe `field` disisipkan data text asli.
4.  Data *QR-Code* dikonversi oleh library menjadi format *base64 graphic image*.
5.  *Library*  `jspdf` kemudian ditrigger menggambar garis `rect`, merender string text, serta menge-draw kumpulan `image` berdasarkan presisi koordinat milimeter / point yang disimpan tadi.
6.  File Final terbuat dan diluncurkan ke browser otomatis untuk langsung dikirim ke mesin Printer fisik maupun disimpan PDF.
