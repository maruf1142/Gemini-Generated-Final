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

function AppContent() {
  const { currentRole, setRole } = useApp();
  const [screen, setScreen] = useState<'landing' | 'customer' | 'dashboard'>('landing');

  // Navigate back to the home landing page
  const handleBackToLanding = () => {
    setScreen('landing');
  };

  const handleNavigateToCustomer = () => {
    setScreen('customer');
  };

  const handleNavigateToDashboard = (role: Role) => {
    if (currentRole && currentRole !== role) {
      // Disallow any cross-dashboard switching directly
      return;
    }
    setRole(role);
    setScreen('dashboard');
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
          onLogout={handleDashboardLogout}
        />
      )}

      {screen === 'dashboard' && currentRole === 'kitchen' && (
        <KitchenDashboard 
          onLogout={handleDashboardLogout}
        />
      )}

      {screen === 'dashboard' && currentRole === 'superadmin' && (
        <SuperAdminDashboard 
          onLogout={handleDashboardLogout}
        />
      )}

      {screen === 'dashboard' && currentRole === 'owner' && (
        <OwnerDashboard 
          onLogout={handleDashboardLogout}
        />
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
