import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateKompleksDto {
    @IsString() @IsNotEmpty() nama: string;
}
export class UpdateKompleksDto extends PartialType(CreateKompleksDto) { }
