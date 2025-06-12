import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initializeErrorTracking() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [new BrowserTracing()],
      tracesSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
  console.error(error);
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
    });
  }
  console.log(message);
} 