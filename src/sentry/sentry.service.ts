import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Injectable()
export class SentryService {
  constructor() {
    // Solo inicializar en producción
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        integrations: [
          nodeProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0, // 100% en desarrollo, reducir en producción
        // Profiling
        profilesSampleRate: 1.0,
      });

      console.log('✅ Sentry inicializado');
    } else {
      console.log('ℹ️ Sentry no configurado (desarrollo)');
    }
  }

  captureException(error: Error, context?: any) {
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, { extra: context });
    } else {
      console.error('Error capturado:', error, context);
    }
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(message, level);
    } else {
      console.log(`[${level}] ${message}`);
    }
  }

  setUser(user: { id: number; email?: string; username?: string }) {
    Sentry.setUser(user);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}
