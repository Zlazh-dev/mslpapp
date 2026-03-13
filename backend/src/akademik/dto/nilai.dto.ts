import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNilaiDto {
    @ApiProperty() @IsString() santriId: string;
    @ApiProperty() @IsString() kelasId: string;
    @ApiProperty() @IsString() mataPelajaran: string;
    @ApiProperty() @IsString() semester: string;
    @ApiProperty({ required: false }) @IsOptional() @IsNumber() nilaiHarian?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsNumber() nilaiUTS?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsNumber() nilaiUAS?: number;
}

export class UpdateNilaiDto {
    @ApiProperty({ required: false }) @IsOptional() @IsNumber() nilaiHarian?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsNumber() nilaiUTS?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsNumber() nilaiUAS?: number;
}

export class QueryNilaiDto {
    @IsOptional() @IsString() santriId?: string;
    @IsOptional() @IsString() kelasId?: string;
    @IsOptional() @IsString() semester?: string;
}
