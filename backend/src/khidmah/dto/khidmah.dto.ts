import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

// ─── Model Khidmah DTOs ────────────────────────────────────────────────────────

export class CreateModelKhidmahDto {
    @IsString() @IsNotEmpty()
    nama: string;

    @IsString() @IsOptional()
    deskripsi?: string;
}

export class UpdateModelKhidmahDto {
    @IsString() @IsOptional()
    nama?: string;

    @IsString() @IsOptional()
    deskripsi?: string;
}

// ─── Data Khidmah DTOs ─────────────────────────────────────────────────────────

export class CreateDataKhidmahDto {
    @IsString() @IsNotEmpty()
    nis: string;  // Assign by NIS, resolved to santriId in service

    @IsString() @IsNotEmpty()
    modelKhidmahId: string;

    @IsString() @IsOptional()
    keterangan?: string;
}

export class UpdateDataKhidmahDto {
    @IsString() @IsOptional()
    modelKhidmahId?: string;

    @IsString() @IsOptional()
    keterangan?: string;
}
