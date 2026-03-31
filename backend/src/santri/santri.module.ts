import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SantriController } from './santri.controller';
import { SantriPublicController } from './santri.controller';
import { SantriImportController } from './santri-import.controller';
import { SantriService } from './santri.service';
import { SantriRepository } from './santri.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }), // 10 MB
    ],
    controllers: [SantriImportController, SantriPublicController, SantriController],
    providers: [SantriService, SantriRepository],
    exports: [SantriRepository, SantriService],
})
export class SantriModule { }
