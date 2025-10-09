import { Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Analytics } from './pages/Analytics';
import { Templates } from './pages/Templates';
import { UserManagement } from './pages/UserManagement';
import { TestApiKeys } from './pages/TestApiKeys';
import { Admin } from './pages/Admin';
import { OCRSpaceDiagnostics } from './pages/OCRSpaceDiagnostics';
import { DocETLPipelines } from './pages/DocETLPipelines';
import { HelpPage } from './pages/HelpPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user } = useAuth();

  return (
    <>
      {user && <Navigation />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <Templates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/test-api-keys"
          element={
            <ProtectedRoute requireAdmin>
              <TestApiKeys />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ocr-space-diagnostics"
          element={
            <ProtectedRoute requireAdmin>
              <OCRSpaceDiagnostics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doc-etl"
          element={
            <ProtectedRoute>
              <DocETLPipelines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
