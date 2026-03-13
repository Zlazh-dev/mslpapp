import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        // Universal middleware: auto-set status INACTIVE if tanggalKeluar is present
        this.$use(async (params, next) => {
            if (params.model === 'Santri') {
                const data = params.args?.data;
                if (data && 'tanggalKeluar' in data) {
                    if (data.tanggalKeluar) {
                        data.status = 'INACTIVE';
                    } else if (data.tanggalKeluar === null || data.tanggalKeluar === '') {
                        // tanggalKeluar explicitly cleared → revert to ACTIVE if not manually set
                        if (!('status' in data)) data.status = 'ACTIVE';
                    }
                }
            }
            return next(params);
        });

        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
