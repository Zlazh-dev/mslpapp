import { PrismaClient, Gender, StatusSantri, JalurPendidikan, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // ── Admin & Staff Users ────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash('Admin1234', 10);
    const staffPassword = await bcrypt.hash('Staff1234', 10);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: { name: 'Administrator', username: 'admin', password: adminPassword, role: Role.ADMIN },
    });
    console.log('Admin user created:', admin.username);

    const stafPendataan = await prisma.user.upsert({
        where: { username: 'stafPendataan' },
        update: {},
        create: { name: 'Staf Pendataan', username: 'stafPendataan', password: staffPassword, role: Role.STAF_PENDATAAN },
    });
    const stafMadrasah = await prisma.user.upsert({
        where: { username: 'stafMadrasah' },
        update: {},
        create: { name: 'Staf Madrasah', username: 'stafMadrasah', password: staffPassword, role: Role.STAF_MADRASAH },
    });
    const pembimbing = await prisma.user.upsert({
        where: { username: 'pembimbing' },
        update: {},
        create: { name: 'Pembimbing Kamar', username: 'pembimbing', password: staffPassword, role: Role.PEMBIMBING_KAMAR },
    });
    const waliKelas = await prisma.user.upsert({
        where: { username: 'waliKelas' },
        update: {},
        create: { name: 'Wali Kelas', username: 'waliKelas', password: staffPassword, role: Role.WALI_KELAS },
    });
    console.log('✅ Staff users created');

    // ── Kompleks → Gedung → Kamar ──────────────────────────────────────────────
    const kompleksA = await prisma.kompleks.create({ data: { nama: 'Kompleks Al-Farabi' } });
    const kompleksB = await prisma.kompleks.create({ data: { nama: 'Kompleks Al-Ghazali' } });

    const gedungA1 = await prisma.gedung.create({ data: { nama: 'Gedung A', kompleksId: kompleksA.id } });
    const gedungA2 = await prisma.gedung.create({ data: { nama: 'Gedung B', kompleksId: kompleksA.id } });
    const gedungB1 = await prisma.gedung.create({ data: { nama: 'Gedung C', kompleksId: kompleksB.id } });
    const gedungB2 = await prisma.gedung.create({ data: { nama: 'Gedung D', kompleksId: kompleksB.id } });

    const kamarA101 = await prisma.kamar.create({ data: { nama: 'Kamar 101', kapasitas: 6, gedungId: gedungA1.id } });
    const kamarA102 = await prisma.kamar.create({ data: { nama: 'Kamar 102', kapasitas: 6, gedungId: gedungA1.id, pembimbingId: pembimbing.id } });
    const kamarA103 = await prisma.kamar.create({ data: { nama: 'Kamar 103', kapasitas: 6, gedungId: gedungA1.id } });
    const kamarA201 = await prisma.kamar.create({ data: { nama: 'Kamar 201', kapasitas: 8, gedungId: gedungA2.id } });
    const kamarA202 = await prisma.kamar.create({ data: { nama: 'Kamar 202', kapasitas: 8, gedungId: gedungA2.id } });
    const kamarA203 = await prisma.kamar.create({ data: { nama: 'Kamar 203', kapasitas: 8, gedungId: gedungA2.id } });
    const kamarB101 = await prisma.kamar.create({ data: { nama: 'Kamar 101', kapasitas: 6, gedungId: gedungB1.id } });
    const kamarB102 = await prisma.kamar.create({ data: { nama: 'Kamar 102', kapasitas: 6, gedungId: gedungB1.id } });
    const kamarB103 = await prisma.kamar.create({ data: { nama: 'Kamar 103', kapasitas: 6, gedungId: gedungB1.id } });
    const kamarB201 = await prisma.kamar.create({ data: { nama: 'Kamar 201', kapasitas: 8, gedungId: gedungB2.id } });
    const kamarB202 = await prisma.kamar.create({ data: { nama: 'Kamar 202', kapasitas: 8, gedungId: gedungB2.id } });
    await prisma.kamar.create({ data: { nama: 'Kamar 203', kapasitas: 8, gedungId: gedungB2.id } });
    console.log('✅ Kompleks, Gedung, Kamar created');

    // ── Jenjang → Tingkat → Kelas ─────────────────────────────────────────────
    const jenjangMTs = await prisma.jenjang.create({ data: { nama: 'MTs' } });
    const jenjangMA = await prisma.jenjang.create({ data: { nama: 'MA' } });

    const tingkatVII = await prisma.tingkat.create({ data: { nama: 'Kelas VII', jenjangId: jenjangMTs.id } });
    const tingkatVIII = await prisma.tingkat.create({ data: { nama: 'Kelas VIII', jenjangId: jenjangMTs.id } });
    const tingkatIX = await prisma.tingkat.create({ data: { nama: 'Kelas IX', jenjangId: jenjangMTs.id } });
    const tingkatX = await prisma.tingkat.create({ data: { nama: 'Kelas X', jenjangId: jenjangMA.id } });
    const tingkatXI = await prisma.tingkat.create({ data: { nama: 'Kelas XI', jenjangId: jenjangMA.id } });
    const tingkatXII = await prisma.tingkat.create({ data: { nama: 'Kelas XII', jenjangId: jenjangMA.id } });

    const kelas7A = await prisma.kelas.create({ data: { nama: 'VII-A', tahunAjaran: '2024/2025', tingkatId: tingkatVII.id, waliKelasId: waliKelas.id } });
    const kelas7B = await prisma.kelas.create({ data: { nama: 'VII-B', tahunAjaran: '2024/2025', tingkatId: tingkatVII.id } });
    const kelas8A = await prisma.kelas.create({ data: { nama: 'VIII-A', tahunAjaran: '2024/2025', tingkatId: tingkatVIII.id } });
    const kelas8B = await prisma.kelas.create({ data: { nama: 'VIII-B', tahunAjaran: '2024/2025', tingkatId: tingkatVIII.id } });
    const kelas9A = await prisma.kelas.create({ data: { nama: 'IX-A', tahunAjaran: '2024/2025', tingkatId: tingkatIX.id } });
    await prisma.kelas.create({ data: { nama: 'IX-B', tahunAjaran: '2024/2025', tingkatId: tingkatIX.id } });
    const kelas10A = await prisma.kelas.create({ data: { nama: 'X-A', tahunAjaran: '2024/2025', tingkatId: tingkatX.id } });
    await prisma.kelas.create({ data: { nama: 'X-B', tahunAjaran: '2024/2025', tingkatId: tingkatX.id } });
    await prisma.kelas.create({ data: { nama: 'XI-A', tahunAjaran: '2024/2025', tingkatId: tingkatXI.id } });
    await prisma.kelas.create({ data: { nama: 'XI-B', tahunAjaran: '2024/2025', tingkatId: tingkatXI.id } });
    await prisma.kelas.create({ data: { nama: 'XII-A', tahunAjaran: '2024/2025', tingkatId: tingkatXII.id } });
    await prisma.kelas.create({ data: { nama: 'XII-B', tahunAjaran: '2024/2025', tingkatId: tingkatXII.id } });
    console.log('✅ Jenjang, Tingkat, Kelas created');

    // ── Santri ─────────────────────────────────────────────────────────────────
    const santriData = [
        {
            nis: '24001', namaLengkap: 'Ahmad Fauzi', gender: Gender.L,
            tanggalLahir: new Date('2010-05-15'), tempatLahir: 'Jakarta', noHp: '081234567890',
            namaAyah: 'Fauzi Sr', namaIbu: 'Siti Aminah', noHpAyah: '081234567891',
            namaWali: 'Fauzi Sr', noHpWali: '081234567891', deskripsiWali: 'Ayah',
            provinsi: 'DKI Jakarta', kotaKabupaten: 'Jakarta Pusat', jalan: 'Jl. Merdeka No. 1',
            tanggalMasuk: new Date('2024-07-15'), jenjangPendidikan: 'MTs',
            jalurPendidikan: JalurPendidikan.FORMAL,
            kamarId: kamarA101.id, kelasId: kelas7A.id,
        },
        {
            nis: '24002', namaLengkap: 'Muhammad Rizki', gender: Gender.L,
            tanggalLahir: new Date('2010-07-20'), tempatLahir: 'Bandung', noHp: '081234567892',
            namaWali: 'Bapak Rizki Sr', noHpWali: '081234567893', deskripsiWali: 'Ayah',
            provinsi: 'Jawa Barat', kotaKabupaten: 'Bandung', tanggalMasuk: new Date('2024-07-15'),
            jenjangPendidikan: 'MTs', jalurPendidikan: JalurPendidikan.FORMAL,
            kamarId: kamarA101.id, kelasId: kelas7A.id,
        },
        {
            nis: '23001', namaLengkap: 'Abdullah Hasan', gender: Gender.L,
            tanggalLahir: new Date('2009-03-10'), tempatLahir: 'Surabaya', noHp: '081234567894',
            namaWali: 'Bapak Hasan', noHpWali: '081234567895', deskripsiWali: 'Ayah',
            provinsi: 'Jawa Timur', kotaKabupaten: 'Surabaya', tanggalMasuk: new Date('2023-07-15'),
            jenjangPendidikan: 'MTs', jalurPendidikan: JalurPendidikan.TAHFIDZ,
            kamarId: kamarA201.id, kelasId: kelas8A.id,
        },
        {
            nis: '22001', namaLengkap: 'Umar Farouq', gender: Gender.L,
            tanggalLahir: new Date('2008-11-25'), tempatLahir: 'Yogyakarta', noHp: '081234567896',
            namaWali: 'Bapak Farouq', noHpWali: '081234567897', deskripsiWali: 'Ayah',
            provinsi: 'DI Yogyakarta', kotaKabupaten: 'Yogyakarta', tanggalMasuk: new Date('2022-07-15'),
            jenjangPendidikan: 'MA', jalurPendidikan: JalurPendidikan.MAHAD_ALY,
            kamarId: kamarB101.id, kelasId: kelas9A.id,
        },
        {
            nis: '23002', namaLengkap: 'Zainal Arifin', gender: Gender.L,
            tanggalLahir: new Date('2009-08-14'), tempatLahir: 'Semarang', noHp: '081234567898',
            namaWali: 'Bapak Arifin', noHpWali: '081234567899', deskripsiWali: 'Paman',
            provinsi: 'Jawa Tengah', kotaKabupaten: 'Semarang', tanggalMasuk: new Date('2023-07-15'),
            tanggalKeluar: new Date('2024-12-01'), jenjangPendidikan: 'MTs',
            jalurPendidikan: JalurPendidikan.FORMAL, status: StatusSantri.INACTIVE,
            kamarId: kamarA101.id, kelasId: kelas8A.id,
        },
    ];

    for (const santri of santriData) {
        await prisma.santri.upsert({
            where: { nis: santri.nis }, update: {}, create: santri,
        });
    }
    console.log('✅ Santri created');

    console.log('🎉 Database seed completed successfully!');
    console.log('\n🔑 Default credentials (username / password):');
    console.log('   Admin     : admin / Admin1234');
    console.log('   Staf      : stafPendataan / Staff1234');
    console.log('   Madrasah  : stafMadrasah / Staff1234');
    console.log('   Pembimbing: pembimbing / Staff1234');
    console.log('   Wali Kelas: waliKelas / Staff1234');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
