import { Module } from '@nestjs/common';
import { KamarService } from './kamar.service';
import { KamarController } from './kamar.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [KamarController], providers: [KamarService] })
export class KamarModule { }
