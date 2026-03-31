import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { KompleksService } from './kompleks.service';
import { CreateKompleksDto, UpdateKompleksDto } from './dto/kompleks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('kompleks') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kompleks')
export class KompleksController {
    constructor(private readonly svc: KompleksService) { }

    @Get()
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    findAll() { return this.svc.findAll(); }

    @Get(':id')
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

    @Post()
    @Roles('ADMIN', 'STAF_PENDATAAN')
    create(@Body() dto: CreateKompleksDto) { return this.svc.create(dto); }

    @Patch(':id')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateKompleksDto) { return this.svc.update(id, dto); }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
