import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  // 🛡️ Seguridad con Helmet
  app.use(helmet());

  // 📦 Compresión de respuestas
  app.use(compression());

  // Configurar CORS dinámicamente según el entorno
  const allowedOrigins = [
    'http://localhost:3001', // Frontend web (si se usa)
    'http://localhost:3000', // Backend mismo
    'http://10.0.2.2:3000',  // Emulador Android
    'https://backend-tecplin.onrender.com', // Producción Render
    'https://api.tecplin.com', // Dominio personalizado si se configura
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // En producción, ser más estricto
        if (process.env.NODE_ENV === 'production') {
          callback(new Error('Not allowed by CORS'), false);
        } else {
          callback(null, true); // Permitir todos en desarrollo
        }
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 📁 Servir archivos estáticos (evidencias)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // 📚 Configurar Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('TecPlin API')
    .setDescription('API REST para sistema de gestión de órdenes de servicio técnico')
    .setVersion('2.1.0')
    .addTag('auth', 'Autenticación y autorización')
    .addTag('ordenes', 'Gestión de órdenes de servicio')
    .addTag('usuarios', 'Gestión de usuarios')
    .addTag('tecnicos', 'Gestión de técnicos')
    .addTag('chat', 'Sistema de chat en tiempo real')
    .addTag('iot', 'Sensores IoT')
    .addTag('health', 'Health checks')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Usar variable de entorno para el puerto
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // Escuchar en todas las interfaces
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Backend TecPlin v2.1.0 corriendo en:`);
  console.log(`   Local:  http://localhost:${port}`);
  console.log(`   Red:    http://192.168.1.8:${port}`);
  console.log(`${'='.repeat(60)}\n`);
  
  console.log(`📚 Documentación API (Swagger):`);
  console.log(`   👉 http://192.168.1.8:${port}/api/docs\n`);
  
  console.log(`💬 Chat WebSocket:`);
  console.log(`   👉 ws://192.168.1.8:${port}/chat\n`);
  
  console.log(`📊 Endpoints principales:`);
  console.log(`   - http://localhost:${port}/health (Health check)`);
  console.log(`   - http://localhost:${port}/ordenes`);
  console.log(`   - http://localhost:${port}/usuarios`);
  console.log(`   - http://localhost:${port}/chat/staff\n`);
  
  console.log(`🛡️ Seguridad: Helmet + Compression activados`);
  console.log(`📝 Logging: Winston con archivos rotativos`);
  console.log(`${'='.repeat(60)}\n`);
}
bootstrap();