import { logger } from './logger';

export function initializeGlobalErrorHandlers() {
  window.addEventListener('error', (event: ErrorEvent) => {
    logger.critical('system', 'Uncaught JavaScript error', event.error, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      globalErrorHandler: true,
    });

    console.error('Global error caught:', event.error);
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    logger.critical('system', 'Unhandled promise rejection', event.reason, {
      promise: event.promise,
      reason: event.reason,
      globalErrorHandler: true,
    });

    console.error('Unhandled promise rejection:', event.reason);
  });

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    if (!message.includes('Failed to write log to database')) {
      logger.error('system', 'Console error captured', undefined, {
        consoleArgs: args,
        consoleErrorHandler: true,
      });
    }

    originalConsoleError.apply(console, args);
  };
}

export function captureError(error: Error | unknown, context?: Record<string, any>) {
  logger.error('system', 'Manual error capture', error, context);
}
