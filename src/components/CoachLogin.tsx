import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

interface CoachLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

export function CoachLogin({ onLogin, onBack }: CoachLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      onLogin();
    } else {
      setError('Incorrect password. Default password is "admin"');
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative bg-cover bg-center"
      style={{
        backgroundImage: 'url(/Environments/Temple of Zeus.png)',
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 border-4 border-yellow-600">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-3 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Coach Login</h2>
        </div>

        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            <img 
              src="/Decorative Assets/Greek Shield.png" 
              alt="Shield" 
              className="w-20 h-20 mx-auto opacity-80"
            />
            <Lock className="w-10 h-10 text-blue-500 absolute inset-0 flex items-center justify-center" />
          </div>
          <p className="text-gray-600 font-medium">Enter the coach password to access admin features</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter password"
              required
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Default password: <code className="bg-gray-100 px-2 py-1 rounded">admin</code></p>
        </div>
      </div>
    </div>
  );
}