import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, deleteUser } from '../services/firestore';
import { User, UserRole } from '../types/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface AdminUserManagementProps {
  onBack: () => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ onBack }) => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'student' as UserRole,
    teamId: '',
  });
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Create user document in Firestore
      const userDocData: any = {
        uid: user.uid,
        email: user.email || '',
        displayName: formData.displayName,
        role: formData.role,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      };

      // Only add teamId if it's provided
      if (formData.teamId && formData.teamId.trim() !== '') {
        userDocData.teamId = formData.teamId.trim();
      }

      await setDoc(doc(db, 'users', user.uid), userDocData);

      // If student, create player document
      if (formData.role === 'student' && formData.teamId) {
        await setDoc(doc(db, 'players', user.uid), {
          userId: user.uid,
          teamId: formData.teamId.trim(),
          displayName: formData.displayName,
          gamesPlayed: 0,
          totalScore: 0,
          totalQuestions: 0,
          avgBuzzTime: 0,
          correctBySubject: {},
          createdAt: serverTimestamp(),
        });
      }

      alert('User created successfully!');
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: 'student',
        teamId: '',
      });
      setShowAddForm(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(`Failed to create user: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${displayName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser(userId);
      alert('User deleted successfully!');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const filteredUsers = filterRole === 'all' 
    ? users 
    : users.filter(u => u.role === filterRole);

  if (showAddForm) {
    return (
      <div
        className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/Environments/Coach%20Panel.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-auto">
          <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-2xl w-full">
            <h2 className="text-3xl font-black text-white mb-6">ADD NEW USER</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                  required
                />
              </div>
              <div>
                <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                  required
                />
              </div>
              <div>
                <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                  required
                >
                  <option value="student">Student</option>
                  <option value="coach">Coach</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-cyan-400 text-sm font-bold uppercase mb-2">Team ID (Optional)</label>
                <input
                  type="text"
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full bg-purple-950 text-white p-3 rounded-lg border-2 border-cyan-400/30"
                  placeholder="Leave empty if not applicable"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      email: '',
                      password: '',
                      displayName: '',
                      role: 'student',
                      teamId: '',
                    });
                  }}
                  className="flex-1 bg-purple-950 text-white font-bold py-3 rounded-xl border-2 border-white/20"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-black py-3 rounded-xl"
                >
                  CREATE USER
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/Environments/Coach%20Panel.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8 overflow-auto">
        <div className="bg-purple-900 border-4 border-purple-500 rounded-3xl p-12 max-w-6xl w-full">
          <div className="flex items-center justify-between mb-8 border-b border-purple-500/30 pb-6">
            <div className="flex items-center">
              <Users className="text-purple-400 mr-4" size={48} />
              <h1 className="text-4xl font-black text-white">USER MANAGEMENT</h1>
            </div>
            <button
              onClick={onBack}
              className="p-2 bg-yellow-500 hover:bg-orange-500 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <label className="text-white font-bold">Filter by Role:</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
                className="bg-purple-950 text-white p-2 rounded border border-purple-500/30"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="coach">Coach</option>
                <option value="admin">Admin</option>
              </select>
              <span className="text-white/70">
                Showing {filteredUsers.length} of {users.length} users
              </span>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-purple-500 hover:bg-purple-400 text-white font-black py-3 px-6 rounded-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              ADD USER
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-white">Loading users...</div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.uid}
                  className="bg-purple-950 rounded-xl p-6 border-2 border-purple-800 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-purple-600 text-white px-3 py-1 rounded font-bold text-sm">
                        {user.role.toUpperCase()}
                      </span>
                      {user.teamId && (
                        <span className="bg-cyan-600 text-white px-3 py-1 rounded font-bold text-sm">
                          Team: {user.teamId}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-lg">{user.displayName}</h3>
                    <p className="text-white/70 text-sm">{user.email}</p>
                    <p className="text-white/50 text-xs mt-1">
                      Created: {user.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  {user.uid !== userData?.uid && (
                    <button
                      onClick={() => handleDeleteUser(user.uid, user.displayName)}
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      DELETE
                    </button>
                  )}
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-white/70">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

