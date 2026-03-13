import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { KamarService } from './kamar.service';
import { CreateKamarDto, UpdateKamarDto } from './dto/kamar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('kamar') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kamar')
export class KamarController {
    constructor(private readonly svc: KamarService) { }

    @Get()
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    findAll(@Query('gedungId') gedungId?: string) {
        return this.svc.findAll(gedungId ? parseInt(gedungId) : undefined);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

    @Get(':id/santri')
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN, Role.STAF_MADRASAH, Role.PEMBIMBING_KAMAR, Role.WALI_KELAS)
    findSantri(@Param('id', ParseIntPipe) id: number) { return this.svc.findSantriByKamar(id); }

    @Post()
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN)
    create(@Body() dto: CreateKamarDto) { return this.svc.create(dto); }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.STAF_PENDATAAN)
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKamarDto) { return this.svc.update(id, dto); }

    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
