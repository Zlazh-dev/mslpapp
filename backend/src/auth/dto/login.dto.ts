import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
    @ApiProperty({ example: 'admin' })
    @IsString()
    @Transform(({ value }) => value?.trim())
    @MaxLength(50)
    username: string;

    @ApiProperty({ example: 'Admin1234' })
    @IsString()
    @MinLength(6)
    @MaxLength(100)
    password: string;
}
