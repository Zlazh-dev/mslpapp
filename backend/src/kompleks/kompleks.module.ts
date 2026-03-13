import { Module } from '@nestjs/common';
import { KompleksService } from './kompleks.service';
import { KompleksController } from './kompleks.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [KompleksController], providers: [KompleksService] })
export class KompleksModule { }
