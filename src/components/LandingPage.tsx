/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';
import { ChefHat, Utensils, Shield, TrendingUp, Key, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { showToast } from './Notification';

interface LandingPageProps {
  onNavigateToCustomer: () => void;
  onNavigateToDashboard: (role: Role) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onNavigateToCustomer, 
  onNavigateToDashboard 
}) => {
  const { currentRole, login, logout, requestPasswordReset, sandboxMode, toggleSandboxMode } = useApp();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleClick = (role: Role) => {
    setSelectedRole(role);
    setShowLoginModal(true);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    const result = login(username, password, selectedRole);
    if (result.success) {
      showToast(`Successfully authenticated as ${selectedRole.toUpperCase()}`, 'success');
      setShowLoginModal(false);
      onNavigateToDashboard(selectedRole);
      // Clear inputs
      setUsername('');
      setPassword('');
    } else {
      showToast(result.error || 'Authentication failed', 'error');
    }
  };

  const formatRoleTitle = (role: Role) => {
    if (role === 'superadmin') return 'Super Admin';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div id="landing-page" className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gold-600/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none"></div>

      {/* Decorative top-right corner border detail */}
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-gold-500/10 pointer-events-none hidden md:block"></div>
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-gold-500/10 pointer-events-none hidden md:block"></div>

      {/* Header / Brand Nav */}
      <header className="px-6 py-6 md:px-12 border-b border-gold-500/5 backdrop-blur-sm bg-zinc-950/20 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-gold-500/20 flex items-center justify-center bg-zinc-900 shadow-lg gold-border-glow">
            <span className="font-serif font-bold text-gold-400 text-lg">M</span>
          </div>
          <div>
            <span className="font-serif font-semibold text-lg tracking-wider bg-gradient-to-r from-gold-100 via-gold-300 to-gold-500 bg-clip-text text-transparent">L'AURA MIDAS</span>
            <span className="text-[10px] text-gold-400/50 block font-mono tracking-widest uppercase mt-0.5">SaaS Gastronomy</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSandboxMode}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition-all cursor-pointer ${
              sandboxMode 
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50' 
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40'
            }`}
            title="Toggle Developer Sandbox Mode to reveal default passwords and bypass portals."
          >
            <span className={`w-1.5 h-1.5 rounded-full ${sandboxMode ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span>{sandboxMode ? 'Sandbox Active' : 'Production Mode'}</span>
          </button>

          {currentRole && (
            <div className="flex items-center gap-4">
              <span className="text-xs bg-gold-500/10 border border-gold-500/30 text-gold-400 font-mono py-1 px-3 rounded-full">
                Active: {formatRoleTitle(currentRole)}
              </span>
              <button 
                onClick={() => {
                  logout();
                  showToast('Logged out successfully', 'info');
                }} 
                className="text-xs text-zinc-400 hover:text-gold-400 transition-colors py-1 cursor-pointer"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-24 z-10">
        
        {/* Brand Card Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gold-500/10 bg-gold-950/20 text-gold-400 text-xs font-mono uppercase tracking-widest mb-4">
            <Utensils className="w-3 h-3 animate-pulse" />
            Gastronomy & Lounge
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-zinc-50 leading-none">
            Meticulous Craft.<br />
            <span className="gold-gradient-text">Exceptional Flavor.</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto font-sans leading-relaxed pt-2">
            Experience L'Aura Midas. Order delicacies seamlessly from your table using live-voice commands or explore our gold-plated culinary creations.
          </p>
          
          <div className="pt-6">
            <button
              onClick={onNavigateToCustomer}
              className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-semibold font-sans py-4 px-8 rounded-full shadow-2xl hover:from-gold-400 hover:to-gold-500 cursor-pointer overflow-hidden transition-all duration-300 transform hover:-translate-y-0.5 shadow-gold-500/10 text-base"
            >
              <Utensils className="w-5 h-5 text-zinc-950 transition-transform group-hover:rotate-12" />
              Enter Customer Lounge
              <span className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-shine pointer-events-none"></span>
            </button>
          </div>
        </div>

        {/* Portals Grid */}
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="font-mono text-xs tracking-widest text-gold-400/60 uppercase">Administrative Portals</h3>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Admin Dashboard */}
            <div 
              onClick={() => handleRoleClick('admin')}
              className="glass-card hover:bg-zinc-900/90 hover:border-gold-500/30 p-6 rounded-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40 shadow-xl"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-500/15 flex items-center justify-center text-gold-400 group-hover:bg-gold-500 group-hover:text-zinc-950 transition-all duration-300">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-lg text-zinc-100 group-hover:text-gold-400 transition-colors">Admin Portal</h4>
                <p className="text-[11px] text-zinc-500 leading-tight mt-1">Manage, approve and track incoming guest orders.</p>
              </div>
            </div>

            {/* Kitchen Dashboard */}
            <div 
              onClick={() => handleRoleClick('kitchen')}
              className="glass-card hover:bg-zinc-900/90 hover:border-gold-500/30 p-6 rounded-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40 shadow-xl"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-500/15 flex items-center justify-center text-gold-400 group-hover:bg-gold-500 group-hover:text-zinc-950 transition-all duration-300">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-lg text-zinc-100 group-hover:text-gold-400 transition-colors">Kitchen Crew</h4>
                <p className="text-[11px] text-zinc-500 leading-tight mt-1">Real-time orders queue, special notes & statuses.</p>
              </div>
            </div>

            {/* Super Admin Dashboard */}
            <div 
              onClick={() => handleRoleClick('superadmin')}
              className="glass-card hover:bg-zinc-900/90 hover:border-gold-500/30 p-6 rounded-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40 shadow-xl"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-500/15 flex items-center justify-center text-gold-400 group-hover:bg-gold-500 group-hover:text-zinc-950 transition-all duration-300">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-lg text-zinc-100 group-hover:text-gold-400 transition-colors">Super Admin</h4>
                <p className="text-[11px] text-zinc-500 leading-tight mt-1">Gourmet menu control, pricing & availability details.</p>
              </div>
            </div>

            {/* Owner Dashboard */}
            <div 
              onClick={() => handleRoleClick('owner')}
              className="glass-card hover:bg-zinc-900/90 hover:border-gold-500/30 p-6 rounded-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40 shadow-xl"
            >
              <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-500/15 flex items-center justify-center text-gold-400 group-hover:bg-gold-500 group-hover:text-zinc-950 transition-all duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-lg text-zinc-100 group-hover:text-gold-400 transition-colors">Owner Console</h4>
                <p className="text-[11px] text-zinc-500 leading-tight mt-1">SaaS Sales analytics, table revenues & best-sellers.</p>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-gold-500/5 text-center text-xs text-zinc-500 z-10 font-mono">
        © 2026 L'Aura Midas Gastronomy Lounge. Powered by Antigravity SaaS Engine.
      </footer>

      {/* Modern Gold-Accented Login Modal */}
      {showLoginModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl border-gold-500/30">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full border border-gold-500/20 bg-zinc-900 flex items-center justify-center text-gold-400 mx-auto mb-3 shadow-lg">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-zinc-50 tracking-wide">
                Staff Authentication
              </h3>
              <p className="text-xs text-gold-400/60 font-mono mt-1 uppercase tracking-wider">
                {formatRoleTitle(selectedRole)} Dashboard
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-mono block">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${selectedRole} or superadmin`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2.5 px-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-zinc-400 font-mono block">Password</label>
                  {['admin', 'kitchen', 'owner'].includes(selectedRole || '') && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetUser = username || selectedRole || '';
                        const result = requestPasswordReset(targetUser, selectedRole as Role);
                        if (result.success) {
                          showToast('Password reset requested. Please ask Super Admin to approve it.', 'success');
                        } else {
                          showToast(result.error || 'Request failed.', 'error');
                        }
                      }}
                      className="text-[10px] text-gold-400/80 hover:text-gold-300 transition-colors font-mono cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter security key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2.5 px-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Help tip */}
              {sandboxMode && (
                <div className="text-[10px] text-zinc-500 leading-normal bg-zinc-900/50 border border-zinc-800 p-2.5 rounded-lg font-mono">
                  💡 <span className="text-gold-400/80">SaaS Access:</span> Log in with role name (e.g. <span className="text-zinc-300">"{selectedRole}"</span>) or superadmin credentials (<span className="text-zinc-300">"superadmin"</span>) and the master administrative security key. Default is <span className="text-zinc-300">"admin123"</span>.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-semibold py-2.5 rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all cursor-pointer text-sm shadow-lg shadow-gold-500/10"
                >
                  <LogIn className="w-4 h-4" />
                  Authenticate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setUsername('');
                    setPassword('');
                  }}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
