import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    NestCacheModule.register({
      ttl: 300, // 5 minutos por defecto
      max: 100, // Máximo 100 items en caché
      isGlobal: true, // Disponible en toda la app
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
