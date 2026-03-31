import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JenjangService } from './jenjang.service';
import { CreateJenjangDto, UpdateJenjangDto } from './dto/jenjang.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('jenjang') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jenjang')
export class JenjangController {
    constructor(private readonly svc: JenjangService) { }

    @Get()
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    findAll() { return this.svc.findAll(); }

    @Post()
    @Roles('ADMIN', 'STAF_MADRASAH')
    create(@Body() dto: CreateJenjangDto) { return this.svc.create(dto); }

    @Patch(':id')
    @Roles('ADMIN', 'STAF_MADRASAH')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJenjangDto) { return this.svc.update(id, dto); }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
