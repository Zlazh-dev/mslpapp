import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

export class CreateKelasDto {
    @IsString() @IsNotEmpty() nama: string;
    @Type(() => Number) @IsInt() tingkatId: number;
    @IsOptional() @IsString() tahunAjaran?: string;
    @IsOptional() @IsString() waliKelasId?: string;
}
export class UpdateKelasDto extends PartialType(CreateKelasDto) { }
