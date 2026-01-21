import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/firebase';
import { ArrowLeft } from 'lucide-react';
import { getTeam } from '../../services/firestore';

export const SignUp: React.FC<{ onSuccess?: () => void; onCancel?: () => void; onBack?: () => void }> = ({ onSuccess, onCancel, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState<string | null>(null);
  const [checkingTeam, setCheckingTeam] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  useEffect(() => {
    const checkTeamId = async () => {
      if (teamId.trim().length === 6 && role === 'student') {
        setCheckingTeam(true);
        setError(''); // Clear previous errors
        try {
          const team = await getTeam(teamId.trim().toUpperCase());
          if (team) {
            setTeamName(team.name);
            setError(''); // Clear any errors on success
          } else {
            setTeamName(null);
            setError('Team ID not found. Please check with your coach.');
          }
        } catch (error: any) {
          setTeamName(null);
          // Provide more specific error message
          const errorMessage = error?.message || 'Error checking Team ID. Please try again.';
          setError(errorMessage);
          console.error('Error checking Team ID:', error);
        } finally {
          setCheckingTeam(false);
        }
      } else {
        setTeamName(null);
        setError('');
      }
    };

    const timeoutId = setTimeout(checkTeamId, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [teamId, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (role === 'student' && !teamId.trim()) {
      setError('Team ID is required for students');
      return;
    }

    if (role === 'student' && teamId.trim().length !== 6) {
      setError('Team ID must be 6 characters');
      return;
    }

    if (role === 'student' && !teamName) {
      setError('Please enter a valid Team ID');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, displayName, role, teamId || undefined);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
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
      {(onBack || onCancel) && (
        <button
          onClick={onBack || onCancel}
          className="absolute top-4 left-4 p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors z-20 shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
      )}
      <div className="bg-purple-900 border-4 border-cyan-400 rounded-3xl p-12 max-w-md w-full">
        <h2 className="text-4xl font-black text-white mb-8 text-center">CREATE ACCOUNT</h2>
        {error && <div className="bg-red-500 text-white p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full bg-purple-950 text-white p-4 rounded-lg border-2 border-cyan-400/30 outline-none"
            />
          </div>
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
            <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-purple-950 text-white p-4 rounded-lg border-2 border-cyan-400/30 outline-none"
            >
              <option value="student">Student</option>
              <option value="coach">Coach</option>
            </select>
          </div>
          {role === 'student' && (
            <div>
              <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Team ID <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                placeholder="Enter 6-character Team ID"
                maxLength={6}
                required
                className="w-full bg-purple-950 text-white p-4 rounded-lg border-2 border-cyan-400/30 outline-none font-mono text-center text-xl tracking-widest"
              />
              {checkingTeam && (
                <p className="text-white/50 text-sm mt-2">Checking Team ID...</p>
              )}
              {teamName && !checkingTeam && (
                <div className="mt-3 p-3 bg-green-900/30 border-2 border-green-500 rounded-lg">
                  <p className="text-green-400 font-bold text-sm uppercase mb-1">Team Found:</p>
                  <p className="text-white font-bold text-lg">{teamName}</p>
                </div>
              )}
              {error && !checkingTeam && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </div>
          )}
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
          <div>
            <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-purple-950 text-white p-4 rounded-lg border-2 border-cyan-400/30 outline-none"
            />
          </div>
          <div className="flex gap-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-purple-950 text-white font-bold py-4 rounded-xl border-2 border-white/20"
              >
                CANCEL
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-yellow-500 hover:bg-orange-500 text-black font-black text-xl py-4 rounded-xl disabled:opacity-50"
            >
              {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};





