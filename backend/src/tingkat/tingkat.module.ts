import { Module } from '@nestjs/common';
import { TingkatService } from './tingkat.service';
import { TingkatController } from './tingkat.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [TingkatController], providers: [TingkatService] })
export class TingkatModule { }
