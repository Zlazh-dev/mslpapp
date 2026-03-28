-- Hapus NOT NULL constraint di username (karena di schema sekarang opsional)
ALTER TABLE "User" ALTER COLUMN "username" DROP NOT NULL;

-- Pastikan kolom lain yang opsional juga tidak punya NOT NULL berlebih
ALTER TABLE "User" ALTER COLUMN "santriId" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "kamarBimbingId" DROP NOT NULL;

-- Verifikasi
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
ORDER BY ordinal_position;
