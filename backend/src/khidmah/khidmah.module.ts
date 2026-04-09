import { Module } from '@nestjs/common';
import { KhidmahService } from './khidmah.service';
import { KhidmahController } from './khidmah.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [KhidmahController], providers: [KhidmahService] })
export class KhidmahModule { }
