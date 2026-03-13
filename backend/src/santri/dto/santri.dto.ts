import { IsString, IsEnum, IsOptional, IsDateString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, JalurPendidikan } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateSantriDto {
    @ApiProperty() @IsString() nis: string;
    @ApiProperty() @IsString() namaLengkap: string;
    @ApiProperty({ enum: Gender }) @IsEnum(Gender) gender: Gender;
    @ApiProperty() @IsDateString() tanggalLahir: string;
    @ApiProperty() @IsString() tempatLahir: string;

    @ApiProperty({ required: false }) @IsOptional() @IsString() noHp?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() nik?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() noKk?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsDateString() tanggalMasuk?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsDateString() tanggalKeluar?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() jenjangPendidikan?: string;
    @ApiProperty({ enum: JalurPendidikan, required: false }) @IsOptional() @IsEnum(JalurPendidikan) jalurPendidikan?: JalurPendidikan;

    // Data Orang Tua
    @ApiProperty({ required: false }) @IsOptional() @IsString() namaAyah?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() namaIbu?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() noHpAyah?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() noHpIbu?: string;

    // Data Wali
    @ApiProperty({ required: false }) @IsOptional() @IsString() namaWali?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() noHpWali?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() deskripsiWali?: string;

    // Alamat
    @ApiProperty({ required: false }) @IsOptional() @IsString() provinsi?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() kotaKabupaten?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() kecamatan?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() kelurahan?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() jalan?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() rtRw?: string;

    // Penempatan (Int IDs)
    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() kelasId?: number;
    @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() kamarId?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsString() foto?: string;
}

export class UpdateSantriDto {
    @ApiProperty({ required: false }) @IsOptional() @IsString() nis?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() namaLengkap?: string;
    @ApiProperty({ enum: Gender, required: false }) @IsOptional() @IsEnum(Gender) gender?: Gender;
    @ApiProperty({ required: false }) @IsOptional() @IsDateString() tanggalLahir?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() tempatLahir?: string;

    @ApiProperty({ required: false }) @IsOptional() @IsString() noHp?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() nik?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() noKk?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsDateString() tanggalMasuk?: string;
    @ApiProperty({ required: false }) @IsOptional() tanggalKeluar?: string | null;
    @ApiProperty({ required: false }) @IsOptional() @IsString() jenjangPendidikan?: string;
    @ApiProperty({ enum: JalurPendidikan, required: false }) @IsOptional() @IsEnum(JalurPendidikan) jalurPendidikan?: JalurPendidikan;

    // Data Orang Tua
    @ApiProperty({ required: false }) @IsOptional() @IsString() namaAyah?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() namaIbu?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() noHpAyah?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() noHpIbu?: string;

    // Data Wali
    @ApiProperty({ required: false }) @IsOptional() @IsString() namaWali?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() noHpWali?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() deskripsiWali?: string;

    // Alamat
    @ApiProperty({ required: false }) @IsOptional() @IsString() provinsi?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() kotaKabupaten?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() kecamatan?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() kelurahan?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() jalan?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() rtRw?: string;

    // Penempatan (Int IDs, allow null to unassign)
    @ApiProperty({ required: false }) @IsOptional() kelasId?: number | null;
    @ApiProperty({ required: false }) @IsOptional() kamarId?: number | null;
    @ApiProperty({ required: false }) @IsOptional() @IsString() foto?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() kkFileUrl?: string;
}

export class QuerySantriDto {
    @IsOptional() @IsString() search?: string;
    @IsOptional() @IsString() kelasId?: string;
    @IsOptional() @IsString() kamarId?: string;
    @IsOptional() @IsString() status?: string;
    @IsOptional() @IsString() jenjangPendidikan?: string;
    @IsOptional() @IsString() nisYear?: string;
    @IsOptional() @IsString() page?: string;
    @IsOptional() @IsString() limit?: string;
}
