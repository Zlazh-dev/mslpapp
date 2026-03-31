import { IsString, IsOptional, MinLength, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    santriId?: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty()
    @IsArray()
    @IsString({ each: true })
    roles: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    kelasId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    kamarId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    santriNis?: string;
}

export class UpdateUserDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roles?: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    kelasId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    kamarId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    santriNis?: string;
}
