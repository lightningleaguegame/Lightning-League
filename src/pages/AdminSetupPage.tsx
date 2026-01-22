import React, { useState } from 'react';
import { createAdminUser } from '../utils/createAdminUser';
import { Shield, CheckCircle, XCircle } from 'lucide-react';

export const AdminSetupPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreateAdmin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await createAdminUser();
      if (response.success) {
        setResult({
          success: true,
          message: 'Admin user created successfully! You can now sign in with:\nEmail: LightningLeagueGame@gmail.com\nPassword: Z@nd3490',
        });
      } else {
        setResult({
          success: false,
          message: response.error || 'User may already exist. Please check Firebase Console.',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to create admin user. Check console for details.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{
        backgroundImage: 'url(/Environments/Coach%20Panel.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-2xl w-full mx-4">
        <div className="flex items-center mb-8">
          <Shield className="text-purple-400 mr-4" size={48} />
          <h1 className="text-4xl font-black text-white">ADMIN SETUP</h1>
        </div>

        <div className="bg-purple-950 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Create Admin User</h2>
          <p className="text-white/70 mb-4">
            This will create an admin user with the following credentials:
          </p>
          <div className="bg-purple-900 rounded-lg p-4 space-y-2">
            <p className="text-cyan-400 font-bold">Email: <span className="text-white">LightningLeagueGame@gmail.com</span></p>
            <p className="text-cyan-400 font-bold">Password: <span className="text-white">Z@nd3490</span></p>
            <p className="text-cyan-400 font-bold">Role: <span className="text-white">Admin</span></p>
          </div>
        </div>

        {result && (
          <div
            className={`mb-6 p-4 rounded-lg border-2 ${
              result.success
                ? 'bg-green-900/30 border-green-500'
                : 'bg-red-900/30 border-red-500'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <p className="text-white whitespace-pre-line">{result.message}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleCreateAdmin}
          disabled={loading}
          className="w-full bg-purple-500 hover:bg-purple-400 disabled:bg-purple-700 disabled:cursor-not-allowed text-white font-black py-4 px-6 rounded-xl text-lg transition-colors"
        >
          {loading ? 'Creating Admin User...' : 'CREATE ADMIN USER'}
        </button>

        <p className="text-white/50 text-sm mt-6 text-center">
          ⚠️ This is a one-time setup. Remove this page after creating the admin user for security.
        </p>
      </div>
    </div>
  );
};

