import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    // Solo cachear GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Intentar obtener del caché
    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return of(cachedResponse);
    }

    console.log(`❌ Cache MISS: ${cacheKey}`);
    
    // Si no está en caché, ejecutar y guardar
    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheManager.set(cacheKey, response);
      }),
    );
  }

  private generateCacheKey(request: any): string {
    const { url, query } = request;
    return `${url}:${JSON.stringify(query)}`;
  }
}
