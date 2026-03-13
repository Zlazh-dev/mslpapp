import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { KelasService } from './kelas.service';
import { CreateKelasDto, UpdateKelasDto } from './dto/kelas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('kelas') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kelas')
export class KelasController {
    constructor(private readonly svc: KelasService) { }

    @Get()
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    findAll(@Query('tingkatId') tingkatId?: string) {
        return this.svc.findAll(tingkatId ? parseInt(tingkatId) : undefined);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

    @Get(':id/santri')
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    findSantri(@Param('id', ParseIntPipe) id: number) { return this.svc.findSantriByKelas(id); }

    @Post()
    @Roles(Role.ADMIN, Role.STAF_MADRASAH)
    create(@Body() dto: CreateKelasDto) { return this.svc.create(dto); }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.STAF_MADRASAH)
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKelasDto) { return this.svc.update(id, dto); }

    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
