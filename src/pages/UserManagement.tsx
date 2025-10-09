import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Shield, Mail, Calendar, Search, RefreshCw, Trash2, AlertCircle } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  raw_app_meta_data: any;
  raw_user_meta_data: any;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Note: This requires service_role access or a custom Edge Function
      // For now, we'll show a placeholder
      const { data, error: fetchError } = await supabase.auth.admin.listUsers();
      
      if (fetchError) {
        setError('Unable to fetch users. Admin API access required.');
        setUsers([]);
      } else {
        setUsers(data.users as any);
      }
    } catch (err) {
      setError('This feature requires admin API access. Please use Supabase Dashboard for user management.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isUserAdmin = (user: UserData) => {
    return user.raw_app_meta_data?.role === 'admin' || user.raw_user_meta_data?.role === 'admin';
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-7 h-7 text-blue-600" />
                User Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                View and manage system users
              </p>
            </div>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">{error}</p>
                  <p className="text-xs text-yellow-800 mt-2">
                    To manage users, go to: <a href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}/auth/users`} target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase Dashboard → Authentication → Users</a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">{success}</div>
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by email..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Sign In
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {isUserAdmin(user) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {user.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!error && users.length > 0 && (
            <div className="mt-6 text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Full User Management</h3>
              <p className="text-sm text-blue-800 mb-3">
                For advanced user management (delete users, reset passwords, change roles), use the Supabase Dashboard:
              </p>
              <a
                href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}/auth/users`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Open Supabase Dashboard
                <span className="text-xs">↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

