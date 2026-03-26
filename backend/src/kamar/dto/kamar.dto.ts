import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

export class CreateKamarDto {
    @IsString() @IsNotEmpty() nama: string;
    @Type(() => Number) @IsInt() gedungId: number;
    @IsOptional() @Type(() => Number) @IsInt() kapasitas?: number;
    @IsOptional() @IsArray() @IsString({ each: true }) pembimbingIds?: string[];
}
export class UpdateKamarDto extends PartialType(CreateKamarDto) { }
