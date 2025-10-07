import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatusIndicator } from './components/ErrorNotification';
import { initializeGlobalErrorHandlers } from './lib/globalErrorHandler';
import { logSyncService } from './lib/logSyncService';
import './index.css';

initializeGlobalErrorHandlers();
logSyncService.initialize();

function Root() {
  useEffect(() => {
    return () => {
      logSyncService.cleanup();
    };
  }, []);

  return (
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <NetworkStatusIndicator />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
