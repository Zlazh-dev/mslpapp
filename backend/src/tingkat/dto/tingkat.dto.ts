import { IsString, IsNotEmpty, IsInt } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

export class CreateTingkatDto {
    @IsString() @IsNotEmpty() nama: string;
    @Type(() => Number) @IsInt() jenjangId: number;
}
export class UpdateTingkatDto extends PartialType(CreateTingkatDto) { }
