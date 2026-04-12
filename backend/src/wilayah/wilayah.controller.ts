import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

const UPSTREAM = 'https://emsifa.github.io/api-wilayah-indonesia/api';

/**
 * Proxy controller for Indonesian region data.
 * Avoids CORS issues when fetching from emsifa GitHub Pages in production.
 */
@ApiTags('wilayah') @ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wilayah')
export class WilayahController {

    private async fetchUpstream(path: string): Promise<any> {
        const res = await fetch(`${UPSTREAM}/${path}`);
        if (!res.ok) return [];
        return res.json();
    }

    @Get('provinces')
    getProvinces() {
        return this.fetchUpstream('provinces.json');
    }

    @Get('regencies/:provId')
    getRegencies(@Param('provId') provId: string) {
        return this.fetchUpstream(`regencies/${provId}.json`);
    }

    @Get('districts/:regId')
    getDistricts(@Param('regId') regId: string) {
        return this.fetchUpstream(`districts/${regId}.json`);
    }

    @Get('villages/:distId')
    getVillages(@Param('distId') distId: string) {
        return this.fetchUpstream(`villages/${distId}.json`);
    }
}
