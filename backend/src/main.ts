import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
    // Ensure required environment variables are present
    if (!process.env.JWT_SECRET) {
        throw new Error('FATAL: JWT_SECRET environment variable is not set. Server will not start.');
    }

    const app = await NestFactory.create(AppModule);

    // ──────────────────────────────────────────────
    // HTTP Security Headers (Helmet)
    // ──────────────────────────────────────────────
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'blob:'],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    frameSrc: ["'none'"],
                },
            },
            crossOriginEmbedderPolicy: false, // allow image uploads
        }),
    );

    // ──────────────────────────────────────────────
    // CORS
    // ──────────────────────────────────────────────
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // ──────────────────────────────────────────────
    // Global Pipes & Filters
    // ──────────────────────────────────────────────
    app.useGlobalFilters(new GlobalExceptionFilter());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            disableErrorMessages: process.env.NODE_ENV === 'production',
        }),
    );

    // ──────────────────────────────────────────────
    // Swagger — ONLY in development
    // ──────────────────────────────────────────────
    const port = process.env.PORT || 3000;

    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('MSLPAPP API')
            .setDescription('Santri Data Management System API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
        console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
    }

    await app.listen(port);
    console.log(`🚀 Application running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
}
bootstrap();
