import { IsString, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateJenjangDto {
    @IsString() @IsNotEmpty() nama: string;
}
export class UpdateJenjangDto extends PartialType(CreateJenjangDto) { }
