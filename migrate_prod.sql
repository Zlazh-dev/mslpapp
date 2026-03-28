-- ============================================================
-- MSLPAPP Comprehensive Production Migration v2
-- Menambah SEMUA kolom/tabel/enum yang mungkin hilang
-- Aman: IF NOT EXISTS / DO $$ checks
-- ============================================================

-- 1. Pastikan enum types ada
DO $$ BEGIN
    CREATE TYPE "Gender" AS ENUM ('L', 'P');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "StatusSantri" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "JalurPendidikan" AS ENUM ('FORMAL', 'MAHAD_ALY', 'TAHFIDZ');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. User table: kolom baru
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "santriId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kamarBimbingId" INTEGER;

-- Index unique
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_username_key') THEN
        CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_santriId_key') THEN
        CREATE UNIQUE INDEX "User_santriId_key" ON "User"("santriId");
    END IF;
END $$;

-- FK User -> Santri
DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_santriId_fkey"
        FOREIGN KEY ("santriId") REFERENCES "Santri"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK User -> Kamar (PembimbingKamar)
DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_kamarBimbingId_fkey"
        FOREIGN KEY ("kamarBimbingId") REFERENCES "Kamar"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Kelas table: waliKelasId & tahunAjaran
ALTER TABLE "Kelas" ADD COLUMN IF NOT EXISTS "waliKelasId" TEXT;
ALTER TABLE "Kelas" ADD COLUMN IF NOT EXISTS "tahunAjaran" TEXT;
ALTER TABLE "Kelas" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
    ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_waliKelasId_fkey"
        FOREIGN KEY ("waliKelasId") REFERENCES "User"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Santri table: kolom-kolom yang mungkin hilang
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "nik" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "noKk" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "tanggalKeluar" TIMESTAMP(3);
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "jalurPendidikan" "JalurPendidikan";
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "kkFileUrl" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "noHpAyah" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "noHpIbu" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "namaWali" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "noHpWali" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "deskripsiWali" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "jenjangPendidikan" TEXT;
ALTER TABLE "Santri" ADD COLUMN IF NOT EXISTS "rtRw" TEXT;

-- 5. Tabel Nilai: pastikan ada
CREATE TABLE IF NOT EXISTS "Nilai" (
    "id"            TEXT        NOT NULL,
    "santriId"      TEXT        NOT NULL,
    "kelasId"       INTEGER     NOT NULL,
    "mataPelajaran" TEXT        NOT NULL,
    "semester"      TEXT        NOT NULL,
    "nilaiHarian"   DOUBLE PRECISION,
    "nilaiUTS"      DOUBLE PRECISION,
    "nilaiUAS"      DOUBLE PRECISION,
    "createdBy"     TEXT        NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Nilai_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_santriId_fkey"
        FOREIGN KEY ("santriId") REFERENCES "Santri"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_kelasId_fkey"
        FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Nilai" ADD CONSTRAINT "Nilai_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "User"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Nilai_santriId_kelasId_mataPelajaran_semester_key') THEN
        CREATE UNIQUE INDEX "Nilai_santriId_kelasId_mataPelajaran_semester_key"
            ON "Nilai"("santriId", "kelasId", "mataPelajaran", "semester");
    END IF;
END $$;

-- 6. Tabel Setting (sudah ditambahkan, pastikan ada)
CREATE TABLE IF NOT EXISTS "Setting" (
    "id"        TEXT        NOT NULL,
    "key"       TEXT        NOT NULL,
    "value"     JSONB       NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Setting_key_key" UNIQUE ("key")
);

-- 7. Verifikasi
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('User', 'Santri', 'Kelas', 'Kamar', 'Nilai', 'Setting', 'Gedung', 'Kompleks', 'Jenjang', 'Tingkat', 'ChatMessage')
GROUP BY table_name
ORDER BY table_name;
