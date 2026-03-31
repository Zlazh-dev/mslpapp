export type Gender = 'L' | 'P';
export type StatusSantri = 'ACTIVE' | 'INACTIVE';
export type JalurPendidikan = 'FORMAL' | 'MAHAD_ALY' | 'TAHFIDZ';

export interface User {
    id: string;
    name: string;
    username: string;
    roles: string[];
    createdAt?: string;
    kelasWali?: { id: number; nama: string }[] | null;
    kamarBimbing?: { id: number; nama: string } | null;
}

// ── Kamar cascade ─────────────────────────────────────────────────────────────

export interface Kompleks {
    id: number;
    nama: string;
    gedungs?: Gedung[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Gedung {
    id: number;
    nama: string;
    kompleksId: number;
    kompleks?: Pick<Kompleks, 'id' | 'nama'>;
    kamars?: Kamar[];
    _count?: { kamars: number };
    createdAt?: string;
    updatedAt?: string;
}

export interface Kamar {
    id: number;
    nama: string;
    kapasitas?: number | null;
    gedungId: number;
    gedung?: Gedung;
    pembimbings?: Pick<User, 'id' | 'name'>[] | null;
    santris?: Santri[];
    _count?: { santris: number };
    createdAt?: string;
    updatedAt?: string;
}

// ── Kelas cascade ─────────────────────────────────────────────────────────────

export interface Jenjang {
    id: number;
    nama: string;
    tingkats?: Tingkat[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Tingkat {
    id: number;
    nama: string;
    jenjangId: number;
    jenjang?: Pick<Jenjang, 'id' | 'nama'>;
    kelas?: Kelas[];
    _count?: { kelas: number };
    createdAt?: string;
    updatedAt?: string;
}

export interface Kelas {
    id: number;
    nama: string;
    tahunAjaran?: string | null;
    tingkatId: number;
    tingkat?: Tingkat & { jenjang?: Pick<Jenjang, 'id' | 'nama'> };
    waliKelasId?: string | null;
    waliKelas?: Pick<User, 'id' | 'name'> | null;
    _count?: { santris: number };
    createdAt?: string;
    updatedAt?: string;
}

// ── Santri ────────────────────────────────────────────────────────────────────

export interface Santri {
    id: string;
    nis: string;
    namaLengkap: string;
    gender: Gender;
    tanggalLahir: string;
    tempatLahir: string;
    noHp?: string | null;
    nik?: string | null;
    noKk?: string | null;
    tanggalMasuk?: string | null;
    tanggalKeluar?: string | null;
    jenjangPendidikan?: string | null;
    jalurPendidikan?: JalurPendidikan | null;

    // Orang Tua
    namaAyah?: string | null;
    namaIbu?: string | null;
    noHpAyah?: string | null;
    noHpIbu?: string | null;

    // Wali
    namaWali?: string | null;
    noHpWali?: string | null;
    deskripsiWali?: string | null;

    // Alamat
    provinsi?: string | null;
    kotaKabupaten?: string | null;
    kecamatan?: string | null;
    kelurahan?: string | null;
    jalan?: string | null;
    rtRw?: string | null;

    status: StatusSantri;
    kelasId?: number | null;
    kamarId?: number | null;
    kelas?: Kelas | null;
    kamar?: Kamar | null;
    foto?: string | null;
    kkFileUrl?: string | null;
    user?: { id: string; username?: string | null; roles: string[] } | null;
    createdAt: string;
    updatedAt: string;
}

// ── Nilai ─────────────────────────────────────────────────────────────────────

export interface Nilai {
    id: string;
    santriId: string;
    kelasId: number;
    mataPelajaran: string;
    semester: string;
    nilaiHarian?: number | null;
    nilaiUTS?: number | null;
    nilaiUAS?: number | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    santri?: Pick<Santri, 'id' | 'namaLengkap' | 'nis'>;
    kelas?: Pick<Kelas, 'id' | 'nama'>;
}

// ── Shared ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface DashboardStats {
    summary: {
        totalSantri: number;
        totalKelas: number;
        totalKamar: number;
        totalUsers: number;
        santriActive: number;
        santriInactive: number;
    };
    seriesData: {
        name: string;
        pendaftaran: number;
        mutasi: number;
    }[];
    kelasDistribution: { name: string; count: number }[];
    kamarDistribution: { name: string; count: number }[];
    userDistribution: { role: string; count: number }[];
    anomalies: {
        overcapacityRooms: number;
        unassignedSantri: number;
    };
    systemHealth: {
        version: string;
        serviceStatus: string;
        lastBackup: string;
    };
}
