import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { GedungService } from './gedung.service';
import { CreateGedungDto, UpdateGedungDto } from './dto/gedung.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('gedung') @ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gedung')
export class GedungController {
    constructor(private readonly svc: GedungService) { }

    @Get()
    @Roles('ADMIN', 'STAF_PENDATAAN', 'STAF_MADRASAH', 'PEMBIMBING_KAMAR', 'WALI_KELAS')
    findAll(@Query('kompleksId') kompleksId?: string) {
        return this.svc.findAll(kompleksId ? parseInt(kompleksId) : undefined);
    }

    @Post()
    @Roles('ADMIN', 'STAF_PENDATAAN')
    create(@Body() dto: CreateGedungDto) { return this.svc.create(dto); }

    @Patch(':id')
    @Roles('ADMIN', 'STAF_PENDATAAN')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGedungDto) { return this.svc.update(id, dto); }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
