import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Mail, Save, AlertCircle, CheckCircle, Shield } from 'lucide-react';

export function Profile() {
  const { user, isAdmin, updatePassword, updateProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (newEmail === user?.email) {
      setError('New email is the same as current email');
      setLoading(false);
      return;
    }

    const { error } = await updateProfile({ email: newEmail });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Email update initiated! Please check your new email to confirm the change.');
    }

    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await updatePassword(newPassword);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Account Settings</h1>
                <p className="text-blue-100">{user?.email}</p>
                {isAdmin && (
                  <span className="inline-block mt-2 px-3 py-1 bg-yellow-500 text-yellow-900 text-xs font-semibold rounded-full">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-6 py-4 font-medium transition-colors ${
                  activeTab === 'security'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Lock className="w-4 h-4 inline mr-2" />
                Security
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">{success}</div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
                  
                  <form onSubmit={handleUpdateEmail} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Email
                      </label>
                      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                        {user?.email}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 mb-2">
                        New Email Address
                      </label>
                      <input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Enter new email"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || newEmail === user?.email}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Updating...' : 'Update Email'}
                    </button>
                  </form>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Account Details</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>User ID:</strong> {user?.id}</p>
                    <p><strong>Account Created:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Role:</strong> {isAdmin ? 'Administrator' : 'User'}</p>
                    <p><strong>Email Verified:</strong> {user?.email_confirmed_at ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
                  
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Confirm new password"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Lock className="w-4 h-4" />
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Password Requirements</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Minimum 6 characters</li>
                    <li>• Use a unique password for better security</li>
                    <li>• Consider using a password manager</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

