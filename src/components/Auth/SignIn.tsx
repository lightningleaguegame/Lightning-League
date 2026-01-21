import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

export const SignIn: React.FC<{ onSuccess?: () => void; onBack?: () => void }> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen px-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: 'url(/Environments/Olympus%20Arena.png)',
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
      )}
      <div className="bg-purple-900 border-4 border-cyan-400 rounded-3xl p-12 max-w-md w-full">
        <h2 className="text-4xl font-black text-white mb-8 text-center">SIGN IN</h2>
        {error && <div className="bg-red-500 text-white p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-purple-950 text-white p-4 rounded-lg border-2 border-cyan-400/30 outline-none"
            />
          </div>
          <div>
            <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-purple-950 text-white p-4 rounded-lg border-2 border-cyan-400/30 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-orange-500 text-black font-black text-xl py-4 rounded-xl disabled:opacity-50"
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
};


