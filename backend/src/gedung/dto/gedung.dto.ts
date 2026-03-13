import { IsString, IsNotEmpty, IsInt } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

export class CreateGedungDto {
    @IsString() @IsNotEmpty() nama: string;
    @Type(() => Number) @IsInt() kompleksId: number;
}
export class UpdateGedungDto extends PartialType(CreateGedungDto) { }
