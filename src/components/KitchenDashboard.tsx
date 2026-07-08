/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, MenuItem, Role } from '../types';
import { ChefHat, Check, Clock, ShieldAlert, Key, ClipboardList, ChevronRight, MessageSquareCode, Flame } from 'lucide-react';
import { showToast } from './Notification';

interface KitchenDashboardProps {
  onNavigateToRole: (role: Role) => void;
  onLogout: () => void;
}

export const KitchenDashboard: React.FC<KitchenDashboardProps> = ({ onNavigateToRole, onLogout }) => {
  const { currentRole, orders, updateOrderStatus, adminPassword, updatePassword, menuItems } = useApp();
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // Authentication Guard
  if (currentRole !== 'kitchen') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-lg animate-pulse">
          <ChefHat className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-100">Access Restricted</h2>
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Kitchen Crew Security Gate</p>
        <p className="text-sm text-zinc-400 mt-3 max-w-sm">
          You are currently unauthorized to view this console. Please navigate back to the lounge and authenticate.
        </p>
        <button 
          onClick={onLogout}
          className="mt-6 bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-semibold py-2.5 px-6 rounded-lg hover:from-gold-400 hover:to-gold-500 shadow-lg cursor-pointer text-xs"
        >
          Return to Gateways
        </button>
      </div>
    );
  }

  // Active orders in the kitchen (status is cooking)
  const cookingOrders = orders
    .filter(o => o.status === 'cooking')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Keep a tick going to update elapsed wait times in real-time
  const [now, setNow] = useState<Date>(new Date());
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 15000); // tick every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const getMinutesElapsed = (timestamp: string): number => {
    try {
      const orderTime = new Date(timestamp).getTime();
      const diffMs = now.getTime() - orderTime;
      return Math.max(0, Math.floor(diffMs / 60000));
    } catch {
      return 0;
    }
  };

  // Completed kitchen status transitions
  const handleMarkReady = (orderId: string) => {
    updateOrderStatus(orderId, 'ready');
    showToast(`Order ${orderId} marked READY. Notification sent to Admin.`, 'success');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.length < 4) {
      showToast('Password must be at least 4 characters long.', 'error');
      return;
    }
    updatePassword(newPasswordInput);
    showToast('Kitchen Security Key updated successfully.', 'success');
    setShowPasswordModal(false);
    setNewPasswordInput('');
  };

  // Compile item-wise orders with aggregated details and special notes
  // Format: { [itemName]: { qty: number, orders: { tableNum: string, note: string, time: string }[] } }
  const consolidatedItems: { 
    [itemName: string]: { 
      quantity: number; 
      details: { table: string; note: string; time: string; orderId: string; timestamp: string }[] 
    } 
  } = {};

  cookingOrders.forEach(order => {
    order.items.forEach(item => {
      if (!consolidatedItems[item.name]) {
        consolidatedItems[item.name] = { quantity: 0, details: [] };
      }
      consolidatedItems[item.name].quantity += item.quantity;
      consolidatedItems[item.name].details.push({
        table: order.tableNumber,
        note: order.specialNotes || '',
        time: order.createdAtTime,
        orderId: order.id,
        timestamp: order.timestamp
      });
    });
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-zinc-900 border-b md:border-b-0 md:border-r border-gold-500/10 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-gold-500/20 flex items-center justify-center bg-zinc-950">
              <span className="font-serif font-bold text-gold-400">K</span>
            </div>
            <div>
              <span className="font-serif font-semibold text-sm tracking-wide text-zinc-100">KITCHEN CREW</span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest block uppercase">Live Preparation</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 text-xs">
            <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-2.5 px-3">
              Dashboards View
            </div>

            <button 
              onClick={() => onNavigateToRole('kitchen')}
              className="w-full flex items-center gap-3 bg-gold-500/10 text-gold-400 border border-gold-500/25 py-2.5 px-4 rounded-xl font-medium cursor-pointer"
            >
              <ChefHat className="w-4 h-4 text-gold-400 animate-pulse" />
              Kitchen Console
            </button>
            
            <button 
              onClick={() => onNavigateToRole('admin')}
              className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4" />
                Admin Overview
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            </button>

            <button 
              onClick={() => onNavigateToRole('superadmin')}
              className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Key className="w-4 h-4" />
                Super Admin
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            </button>

            <button 
              onClick={() => onNavigateToRole('owner')}
              className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Flame className="w-4 h-4" />
                Owner Console
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            </button>
          </nav>
        </div>

        {/* Security & Logout */}
        <div className="space-y-2 pt-8 border-t border-zinc-800/60 mt-8">
          <button
            onClick={() => {
              setNewPasswordInput('');
              setShowPasswordModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 bg-zinc-950 text-zinc-400 hover:text-gold-400 py-2 rounded-lg cursor-pointer text-xs font-sans transition-colors border border-zinc-900 hover:border-gold-500/20"
          >
            <Key className="w-3.5 h-3.5" />
            Change Password
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-zinc-950 text-zinc-400 hover:text-red-400 py-2 rounded-lg cursor-pointer text-xs font-sans transition-colors border border-zinc-900 hover:border-red-500/20"
          >
            Log Out Console
          </button>
        </div>

      </aside>

      {/* Split Main View */}
      <main className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-900 overflow-hidden">
        
        {/* Left Side: Table Number Wise Incoming Orders Queue */}
        <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-[100vh]">
          <div className="border-b border-zinc-900 pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-serif text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                <Flame className="w-5 h-5 text-gold-500 animate-pulse" />
                Table-wise Kitchen Queue
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">Cooking queue categorized by customer table sequence.</p>
            </div>
            <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
              {cookingOrders.length} Cooking
            </span>
          </div>

          {cookingOrders.length === 0 ? (
            <div className="text-center py-24 bg-zinc-900/10 border border-dashed border-zinc-900 rounded-xl">
              <ChefHat className="w-10 h-10 text-zinc-800 mx-auto mb-2 animate-pulse" />
              <p className="text-xs text-zinc-500 font-sans">No dishes under preparation right now.</p>
              <p className="text-[10px] text-zinc-600 mt-1">Incoming orders auto-sync once Admin approves.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cookingOrders.map(order => {
                const elapsedMinutes = getMinutesElapsed(order.timestamp);
                const isOverdue = elapsedMinutes >= 20;

                return (
                  <div 
                    key={order.id} 
                    className={`glass-card rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all duration-300 ${
                      isOverdue 
                        ? 'border border-red-500/40 bg-red-950/20 shadow-red-900/10 ring-1 ring-red-500/20' 
                        : 'border-gold-500/10'
                    }`}
                  >
                    
                    {/* Header bar */}
                    <div className="flex items-center justify-between border-b border-zinc-950 pb-3 mb-3.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gold-400 font-mono font-bold">{order.id}</span>
                          <span className="text-xs bg-zinc-950 text-gold-400 px-2.5 py-0.5 rounded border border-gold-500/20 font-bold font-mono">
                            Table {order.tableNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Submitted at {order.createdAtTime}</span>
                          <span className="mx-1">•</span>
                          <span className={`${isOverdue ? 'text-red-400 font-bold animate-pulse' : 'text-zinc-450'}`}>
                            {elapsedMinutes}m elapsed
                          </span>
                        </div>
                        {isOverdue && (
                          <div className="mt-2 flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 px-2.5 py-1 rounded-lg text-red-400 text-[10px] font-mono font-bold animate-pulse w-fit">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                            <span>WARNING: DELAY EXCEEDS 20 MINS</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleMarkReady(order.id)}
                        className="bg-emerald-600/15 hover:bg-emerald-600 hover:text-zinc-950 text-emerald-400 font-semibold py-1.5 px-4 rounded-lg cursor-pointer transition-all text-xs flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Mark Ready
                      </button>
                    </div>

                    {/* Items list */}
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => {
                        const mItem = menuItems.find(m => m.id === item.menuItemId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300 font-medium flex items-center gap-1.5 flex-wrap">
                              {item.name}
                              {mItem?.serialNumber && (
                                <span className="text-[9px] font-mono font-bold bg-gold-500/10 text-gold-400 px-1.5 py-0.5 rounded border border-gold-500/20">
                                  {mItem.serialNumber}
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-gold-400 font-bold bg-zinc-950/60 px-2 py-0.5 rounded">x{item.quantity}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Special instruction */}
                    {order.specialNotes && (
                      <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-900/60 text-xs text-zinc-400">
                        <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 block mb-0.5">Instruction:</span>
                        "{order.specialNotes}"
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Consolidated Item-wise Kitchen Board */}
        <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-h-[100vh]">
          <div className="border-b border-zinc-900 pb-4">
            <h3 className="font-serif text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gold-500" />
              Consolidated Items & Instructions
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Aggregated recipe logs with prominent customer special notes.</p>
          </div>

          {Object.keys(consolidatedItems).length === 0 ? (
            <div className="text-center py-24 bg-zinc-900/10 border border-dashed border-zinc-900 rounded-xl">
              <ClipboardList className="w-10 h-10 text-zinc-800 mx-auto mb-2" />
              <p className="text-xs text-zinc-500 font-sans">No aggregated items to display.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(consolidatedItems).map(itemName => (
                <div key={itemName} className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 shadow-md">
                  
                  {/* Item header with bold aggregated quantity */}
                  <div className="flex items-center justify-between border-b border-zinc-950 pb-3 mb-3.5">
                    <span className="font-serif text-lg font-bold text-zinc-50 tracking-wide">{itemName}</span>
                    <span className="text-base font-bold font-mono text-zinc-950 bg-gradient-to-r from-gold-400 to-gold-500 px-3 py-1 rounded-full shadow-lg">
                      Qty {consolidatedItems[itemName].quantity}
                    </span>
                  </div>

                  {/* Details with Bold notes */}
                  <div className="space-y-3">
                    {consolidatedItems[itemName].details.map((det, i) => {
                      const detailElapsed = getMinutesElapsed(det.timestamp);
                      const isDetailOverdue = detailElapsed >= 20;

                      return (
                        <div 
                          key={i} 
                          className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isDetailOverdue 
                              ? 'bg-red-950/25 border-red-500/30 shadow-sm shadow-red-950/10' 
                              : 'bg-zinc-950/40 border-zinc-900'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                isDetailOverdue 
                                  ? 'bg-red-500 text-zinc-950' 
                                  : 'bg-zinc-900 text-gold-400'
                              }`}>
                                T{det.table}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">{det.time}</span>
                              <span className={`text-[10px] font-mono ${isDetailOverdue ? 'text-red-400 font-semibold animate-pulse' : 'text-zinc-400'}`}>
                                ({detailElapsed}m elapsed)
                              </span>
                              <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[80px]">({det.orderId})</span>
                            </div>

                            {/* Bold Custom Notes */}
                            {det.note ? (
                              <div className="pt-1 flex items-start gap-1.5">
                                <MessageSquareCode className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isDetailOverdue ? 'text-red-400' : 'text-gold-500'}`} />
                                <span className="text-xs font-bold text-zinc-100 block tracking-tight">
                                  note: "{det.note}"
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-600 block italic">No special preferences.</span>
                            )}
                          </div>

                          {/* Status / Indicator */}
                          <div className="text-right">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                              isDetailOverdue 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold animate-pulse' 
                                : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {isDetailOverdue ? 'CRITICAL DELAY' : 'Cooking'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border-gold-500/30">
            <div className="text-center mb-5">
              <div className="w-11 h-11 rounded-full border border-gold-500/20 bg-zinc-900 flex items-center justify-center text-gold-400 mx-auto mb-2">
                <Key className="w-5 h-5 text-gold-400" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-zinc-50">Change Kitchen Password</h3>
              <p className="text-xs text-zinc-500 mt-1">Updating this changes the entry key specifically for the Kitchen portal</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-mono block">Current Password</label>
                <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 py-2 px-3 rounded-lg text-xs font-mono select-none">
                  {adminPassword}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-mono block">New Security Password</label>
                <input
                  type="text"
                  required
                  placeholder="Enter at least 4 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-sm text-zinc-100 focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-bold py-2 rounded-lg cursor-pointer hover:from-gold-400 hover:to-gold-500 text-xs"
                >
                  Save Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPasswordInput('');
                  }}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-750 text-xs cursor-pointer"
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
