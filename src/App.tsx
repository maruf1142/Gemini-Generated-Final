/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/Notification';
import { LandingPage } from './components/LandingPage';
import { CustomerDashboard } from './components/CustomerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { KitchenDashboard } from './components/KitchenDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { Role } from './types';
import { Lock, ShieldAlert } from 'lucide-react';

function AppContent() {
  const { currentRole, setRole, verifyPasswordForRole } = useApp();
  const [screen, setScreen] = useState<'landing' | 'customer' | 'dashboard'>('landing');
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);

  // Navigate back to the home landing page
  const handleBackToLanding = () => {
    setScreen('landing');
  };

  const handleNavigateToCustomer = () => {
    setScreen('customer');
  };

  const handleNavigateToDashboard = (role: Role) => {
    if (currentRole && currentRole !== role) {
      setPendingRole(role);
      setPasswordInput('');
      setShowPasswordPrompt(true);
    } else {
      setRole(role);
      setScreen('dashboard');
    }
  };

  const handleConfirmSwitch = () => {
    if (!pendingRole) return;
    if (verifyPasswordForRole(pendingRole, passwordInput)) {
      setRole(pendingRole);
      setPendingRole(null);
      setShowPasswordPrompt(false);
      setPasswordInput('');
    } else {
      // WRONG PASSWORD - Terminate and shut down window
      setRole(null);
      setPendingRole(null);
      setShowPasswordPrompt(false);
      setPasswordInput('');
      
      // Attempt window close and force redirect to empty page to safely clear context
      window.close();
      window.location.href = 'about:blank';
    }
  };

  const handleDashboardLogout = () => {
    setRole(null);
    setScreen('landing');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-gold-500/30 selection:text-gold-200">
      
      {screen === 'landing' && (
        <LandingPage 
          onNavigateToCustomer={handleNavigateToCustomer}
          onNavigateToDashboard={handleNavigateToDashboard}
        />
      )}

      {screen === 'customer' && (
        <CustomerDashboard 
          onBackToLanding={handleBackToLanding}
        />
      )}

      {screen === 'dashboard' && currentRole === 'admin' && (
        <AdminDashboard 
          onNavigateToRole={handleNavigateToDashboard}
          onLogout={handleDashboardLogout}
        />
      )}

      {screen === 'dashboard' && currentRole === 'kitchen' && (
        <KitchenDashboard 
          onNavigateToRole={handleNavigateToDashboard}
          onLogout={handleDashboardLogout}
        />
      )}

      {screen === 'dashboard' && currentRole === 'superadmin' && (
        <SuperAdminDashboard 
          onNavigateToRole={handleNavigateToDashboard}
          onLogout={handleDashboardLogout}
        />
      )}

      {screen === 'dashboard' && currentRole === 'owner' && (
        <OwnerDashboard 
          onNavigateToRole={handleNavigateToDashboard}
          onLogout={handleDashboardLogout}
        />
      )}

      {showPasswordPrompt && pendingRole && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-gold-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-6">
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full border border-gold-500/20 bg-zinc-950 flex items-center justify-center text-gold-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-zinc-50">Cross-Dashboard Authentication</h3>
              <p className="text-xs text-zinc-400">
                You are currently logged in as <span className="text-gold-400 font-mono font-medium uppercase">{currentRole}</span>. 
                Entering the <span className="text-gold-400 font-mono font-medium uppercase">{pendingRole}</span> portal requires specific authorization.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 font-mono block uppercase tracking-wider">
                  Password for {pendingRole}
                </label>
                <input
                  type="password"
                  placeholder="Enter access key"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-gold-500/50 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-700 font-mono text-sm outline-none transition-colors"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmSwitch();
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPendingRole(null);
                    setPasswordInput('');
                  }}
                  className="flex-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 py-2.5 rounded-xl cursor-pointer text-xs font-sans transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSwitch}
                  className="flex-1 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-zinc-950 py-2.5 rounded-xl cursor-pointer text-xs font-sans font-semibold transition-all shadow-lg shadow-gold-500/10"
                >
                  Verify & Enter
                </button>
              </div>

              <div className="flex items-start gap-2 bg-red-950/20 border border-red-500/10 p-3 rounded-xl">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-500 leading-normal">
                  <span className="text-red-400 font-medium">Security Policy:</span> If an incorrect security password is submitted, your current session will be terminated and this console window will be closed immediately for audit safety.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global Toast Notification HUD */}
      <ToastContainer />

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
