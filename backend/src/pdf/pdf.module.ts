import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfDataService } from './pdf-data.service';
import { PdfController } from './pdf.controller';

@Module({
    providers: [PdfService, PdfDataService],
    controllers: [PdfController],
    exports: [PdfService, PdfDataService],
})
export class PdfModule {}
