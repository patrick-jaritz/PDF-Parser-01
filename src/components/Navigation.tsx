import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Key, LogOut, Menu, X, Home, BarChart3, ScrollText, Activity, Search, GitBranch, BookOpen, User } from 'lucide-react';

export function Navigation() {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <FileText className="w-6 h-6 text-blue-600" />
              <span>DocProcessor</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {/* Main Navigation */}
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Home
                </span>
              </Link>

              <Link
                to="/doc-etl"
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive('/doc-etl')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Pipelines
                </span>
              </Link>

              {/* Admin Section */}
              {isAdmin && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                  <Link
                    to="/admin"
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Admin
                    </span>
                  </Link>
                </div>
              )}

              {/* Help Section */}
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                <Link
                  to="/help"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive('/help')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Help
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              <div className="text-sm">
                <div className="font-medium">{user.email}</div>
                {isAdmin && (
                  <span className="text-xs text-blue-600">Admin</span>
                )}
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive('/')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>

            <Link
              to="/doc-etl"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive('/doc-etl')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              DocETL
            </Link>

            <Link
              to="/help"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive('/help')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Help
            </Link>

            {/* Admin Section */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Activity className="w-4 h-4" />
                Admin
              </Link>
            )}

            <div className="pt-3 mt-3 border-t border-gray-200">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
              >
                <User className="w-4 h-4" />
                <div className="text-sm">
                  <div className="font-medium">{user.email}</div>
                  {isAdmin && (
                    <span className="text-xs text-blue-600">Admin</span>
                  )}
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
