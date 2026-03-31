import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AkademikService } from './akademik.service';
import { CreateNilaiDto, UpdateNilaiDto, QueryNilaiDto } from './dto/nilai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('akademik')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nilai')
export class AkademikController {
    constructor(private readonly akademikService: AkademikService) { }

    @Get()
    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    findAll(@Query() query: QueryNilaiDto) { return this.akademikService.findAll(query); }

    @Get(':id')
    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    findOne(@Param('id') id: string) { return this.akademikService.findOne(id); }

    @Post()
    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    create(@Body() dto: CreateNilaiDto, @Request() req) {
        return this.akademikService.create(dto, req.user.id);
    }

    @Put(':id')
    @Roles('ADMIN', 'STAF_MADRASAH', 'WALI_KELAS')
    update(@Param('id') id: string, @Body() dto: UpdateNilaiDto) {
        return this.akademikService.update(id, dto);
    }

    @Delete(':id')
    @Roles('ADMIN', 'STAF_MADRASAH')
    remove(@Param('id') id: string) { return this.akademikService.remove(id); }
}
