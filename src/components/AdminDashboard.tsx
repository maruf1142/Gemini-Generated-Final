/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus, Role } from '../types';
import { 
  ClipboardList, Check, X, ShieldAlert, Calendar, DollarSign, 
  ShoppingBag, HelpCircle, Eye, Printer, Users, Key, ChevronRight, Phone 
} from 'lucide-react';
import { showToast } from './Notification';
import { InvoicePrint } from './InvoicePrint';
import { OrderCopyPrint } from './OrderCopyPrint';
import { getBangladeshDateString } from '../utils';

interface AdminDashboardProps {
  onNavigateToRole: (role: Role) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateToRole, onLogout }) => {
  const { 
    currentRole, 
    orders, 
    adminPassword, 
    updatePassword, 
    approveOrder, 
    rejectOrder, 
    printInvoice 
  } = useApp();

  const [filterDate, setFilterDate] = useState<string>(getBangladeshDateString());
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  
  // Invoice states
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeOrderCopyOrder, setActiveOrderCopyOrder] = useState<Order | null>(null);
  const [kitchenTab, setKitchenTab] = useState<'ready' | 'cooking'>('ready');
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // Authentication Guard
  if (currentRole !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-lg animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-100">Access Restricted</h2>
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Admin Portal Security Gate</p>
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

  // Calculate order counts for statistics
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeCookingOrders = orders.filter(o => o.status === 'cooking');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const completedOrders = orders.filter(o => o.status === 'completed');

  // Calculate stats for today
  const todayDateStr = getBangladeshDateString();
  const todayOrders = orders.filter(o => o.createdAtDate === todayDateStr && o.status === 'completed');
  
  const todayRevenue = todayOrders.reduce((sum, o) => {
    const orderTotal = o.items.reduce((total, item) => {
      const discountedPrice = item.price * (1 - item.discount / 100);
      const withVat = discountedPrice * (1 + item.vat / 100);
      return total + (withVat * item.quantity);
    }, 0);
    return sum + orderTotal;
  }, 0);

  const averageTodayValue = todayOrders.length > 0 ? (todayRevenue / todayOrders.length) : 0;

  // Handle Order Actions
  const handleApprove = (orderId: string) => {
    approveOrder(orderId);
    showToast(`Order approved. Dispatched to Kitchen.`, 'success');
  };

  const handleOpenReject = (orderId: string) => {
    setRejectOrderId(orderId);
    setRejectReason('');
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectOrderId) return;
    if (!rejectReason.trim()) {
      showToast('Please state a reason for order rejection.', 'error');
      return;
    }
    rejectOrder(rejectOrderId, rejectReason);
    showToast(`Order ${rejectOrderId} rejected.`, 'info');
    setRejectOrderId(null);
  };

  // Handle password change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.length < 4) {
      showToast('Password must be at least 4 characters long.', 'error');
      return;
    }
    updatePassword(newPasswordInput);
    showToast('Admin Security Key updated successfully.', 'success');
    setShowPasswordModal(false);
    setNewPasswordInput('');
  };

  // Print invoice callback
  const handleConfirmInvoicePrint = (printChoice: boolean) => {
    if (!activeInvoiceOrder) return;
    
    // Set invoicePrinted and mark completed
    printInvoice(activeInvoiceOrder.id, printChoice);
    showToast(`Invoice status updated. Order moved to completed history.`, 'success');
    setActiveInvoiceOrder(null);
  };

  // Filter historical orders by select date
  const filteredHistory = orders.filter(o => o.createdAtDate === filterDate && o.status === 'completed');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-zinc-900 border-b md:border-b-0 md:border-r border-gold-500/10 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-gold-500/20 flex items-center justify-center bg-zinc-950">
              <span className="font-serif font-bold text-gold-400">A</span>
            </div>
            <div>
              <span className="font-serif font-semibold text-sm tracking-wide text-zinc-100">L'AURA ADMIN</span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest block uppercase">Manager Console</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 text-xs">
            <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-2.5 px-3">
              Dashboards View
            </div>
            
            <button 
              onClick={() => onNavigateToRole('admin')}
              className="w-full flex items-center gap-3 bg-gold-950/30 text-gold-400 border border-gold-500/20 py-2.5 px-4 rounded-xl font-medium cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              Overview & Approvals
            </button>

            <button 
              onClick={() => onNavigateToRole('kitchen')}
              className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                Kitchen Dashboard
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
                <DollarSign className="w-4 h-4" />
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

      {/* Main View Panel */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        
        {/* Top welcome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gold-500/5 pb-6">
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-100">Management Overview</h2>
            <p className="text-xs text-zinc-500 mt-1">Approve incoming table orders and archive completed invoices.</p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2 font-mono text-[11px] text-zinc-400">
            <span className="text-gold-400">● Live System</span>
            <span className="text-zinc-600">|</span>
            <span>Today: {todayDateStr}</span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Today Total Revenue */}
          <div className="glass-card p-5 rounded-xl border-gold-500/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Today Completed Sales</span>
              <span className="text-2xl font-bold text-gold-400 font-mono mt-1 block">{todayRevenue.toFixed(2)}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-500/15 flex items-center justify-center text-gold-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Pending Approval count */}
          <div className="glass-card p-5 rounded-xl border-gold-500/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Awaiting Approval</span>
              <span className="text-2xl font-bold text-amber-500 font-mono mt-1 block">{pendingOrders.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-950/30 border border-amber-500/15 flex items-center justify-center text-amber-400">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>

          {/* Cooking in Kitchen */}
          <div className="glass-card p-5 rounded-xl border-gold-500/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Currently Cooking</span>
              <span className="text-2xl font-bold text-blue-400 font-mono mt-1 block">{activeCookingOrders.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-950/30 border border-blue-500/15 flex items-center justify-center text-blue-400">
              <ShoppingBag className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          {/* Ready to Pickup count */}
          <div className="glass-card p-5 rounded-xl border-gold-500/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Ready - Invoicing</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">{readyOrders.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-950/30 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Action orders split list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Incoming Pending Approvals */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="font-serif font-semibold text-zinc-200 tracking-wide text-base">
                Incoming Orders Approvals ({pendingOrders.length})
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Manager Approval Required</span>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/10 border border-dashed border-zinc-800 rounded-xl">
                <ClipboardList className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No incoming approvals right now.</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Kitchen stays fully updated in real-time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map(order => (
                  <div key={order.id} className="glass-card rounded-xl p-4 border-gold-500/10 space-y-3.5 relative overflow-hidden shadow-md">
                    
                    {/* Header bar */}
                    <div className="flex justify-between items-start gap-2 border-b border-zinc-950 pb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gold-400 font-mono">{order.id}</span>
                          <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">
                            Table {order.tableNumber}
                          </span>
                          <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">
                            {order.orderType}
                          </span>
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">Arrived at {order.createdAtTime}</p>
                      </div>

                      {/* Selfie, Signature or Contact Number */}
                      <div className="flex items-center gap-1.5">
                        {order.contactNumber && (
                          <div className="flex items-center gap-1 bg-zinc-950 border border-gold-500/25 px-2 py-1 rounded text-[10px] font-mono text-gold-400">
                            <Phone className="w-2.5 h-2.5 text-gold-400" />
                            <span>+880 {order.contactNumber}</span>
                          </div>
                        )}
                        {order.selfieUrl ? (
                          <div className="group relative">
                            <img 
                              src={order.selfieUrl} 
                              alt="Customer" 
                              className="w-8 h-8 rounded object-cover border border-gold-500/10 hover:border-gold-500 cursor-zoom-in"
                            />
                            {/* Hover tooltip for selfie */}
                            <div className="hidden group-hover:block absolute bottom-10 right-0 z-20 p-1 bg-zinc-900 border border-gold-500/20 rounded-lg shadow-2xl">
                              <img src={order.selfieUrl} alt="Selfie large" className="w-32 h-24 object-cover" />
                            </div>
                          </div>
                        ) : order.signature ? (
                          <div className="group relative">
                            <div className="w-8 h-8 rounded border border-gold-500/10 bg-zinc-950 flex items-center justify-center hover:border-gold-500 cursor-zoom-in">
                              <Eye className="w-3.5 h-3.5 text-gold-400" />
                            </div>
                            {/* Hover tooltip for signature */}
                            <div className="hidden group-hover:block absolute bottom-10 right-0 z-20 p-2 bg-zinc-950 border border-gold-500/20 rounded-lg shadow-2xl">
                              <img src={order.signature} alt="Signature large" className="w-32 h-16 object-contain" />
                              <div className="text-[8px] text-center text-zinc-500 font-mono mt-1">Seat Signature</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Order items List */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-zinc-950/40 p-2 rounded border border-zinc-900">
                            <span className="text-zinc-300 font-medium truncate max-w-[120px]">{item.name}</span>
                            <span className="text-gold-400 font-mono font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Special notes */}
                    {order.specialNotes && (
                      <div className="bg-zinc-950/50 p-2 rounded border border-zinc-900/60 text-xs italic text-zinc-400">
                        <span className="font-semibold text-zinc-500 not-italic font-mono block text-[10px] uppercase">Instruction:</span>
                        "{order.specialNotes}"
                      </div>
                    )}

                    {/* Action button bar */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-zinc-950">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(order.id)}
                          className="flex-1 bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600 hover:text-zinc-950 text-emerald-400 font-semibold py-1.5 rounded-lg cursor-pointer transition-all text-xs flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Order
                        </button>
                        <button
                          onClick={() => handleOpenReject(order.id)}
                          className="flex-1 bg-red-600/10 border border-red-500/20 hover:bg-red-600 hover:text-zinc-950 text-red-400 py-1.5 rounded-lg cursor-pointer transition-all text-xs flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject Order
                        </button>
                      </div>
                      <button
                        onClick={() => setActiveOrderCopyOrder(order)}
                        className="w-full bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/80 font-medium py-1.5 rounded-lg cursor-pointer transition-all text-[11px] flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5 text-gold-400" />
                        Print Order Copy (Thermal)
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kitchen Ready & Cooking Orders Awaiting Invoice Print */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="font-serif font-semibold text-zinc-200 tracking-wide text-base">
                Kitchen Active Orders
              </h3>
              <div className="flex bg-zinc-950 border border-zinc-850 rounded-lg p-0.5">
                <button
                  onClick={() => setKitchenTab('ready')}
                  className={`px-3 py-1 text-[10px] font-mono rounded-md font-semibold transition-all cursor-pointer ${
                    kitchenTab === 'ready'
                      ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  Ready ({readyOrders.length})
                </button>
                <button
                  onClick={() => setKitchenTab('cooking')}
                  className={`px-3 py-1 text-[10px] font-mono rounded-md font-semibold transition-all cursor-pointer ${
                    kitchenTab === 'cooking'
                      ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  Cooking ({activeCookingOrders.length})
                </button>
              </div>
            </div>

            {kitchenTab === 'ready' && (
              readyOrders.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/10 border border-dashed border-zinc-800 rounded-xl">
                  <Printer className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No ready orders awaiting invoicing.</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Staff will see cooking states update live.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {readyOrders.map(order => (
                    <div key={order.id} className="glass-card rounded-xl p-4 border-gold-500/15 space-y-3 relative shadow-md">
                      
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-zinc-950 pb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gold-400 font-mono">{order.id}</span>
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
                              READY (TABLE {order.tableNumber})
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">Kitchen finished at {order.createdAtTime}</p>
                        </div>

                        {/* Cancel/Reject option even at Ready stage */}
                        <button
                          onClick={() => handleOpenReject(order.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 transition-colors text-xs cursor-pointer font-mono"
                          title="Reject/Void Order"
                        >
                          Void Order
                        </button>
                      </div>

                      {/* Info */}
                      <div className="space-y-1.5 text-xs">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-zinc-300">
                            <span>{item.name}</span>
                            <span className="font-mono text-gold-400 font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Print invoice & copy button triggers */}
                      <div className="pt-2 border-t border-zinc-950 flex flex-col gap-2">
                        <button
                          onClick={() => setActiveInvoiceOrder(order)}
                          className="w-full bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-bold py-2 rounded-lg cursor-pointer shadow-lg hover:from-gold-400 hover:to-gold-500 text-xs flex items-center justify-center gap-1.5"
                        >
                          <Printer className="w-4 h-4 text-zinc-950" />
                          Print Invoice & Archive
                        </button>
                        <button
                          onClick={() => setActiveOrderCopyOrder(order)}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-750 font-medium py-1.5 rounded-lg cursor-pointer transition-all text-xs flex items-center justify-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-gold-400" />
                          Print Order Copy (Thermal)
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )
            )}

            {kitchenTab === 'cooking' && (
              activeCookingOrders.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/10 border border-dashed border-zinc-800 rounded-xl">
                  <ShoppingBag className="w-8 h-8 text-zinc-800 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs text-zinc-500">No orders currently cooking.</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Approved orders automatically transition here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCookingOrders.map(order => (
                    <div key={order.id} className="glass-card rounded-xl p-4 border-gold-500/10 space-y-3 relative shadow-md">
                      
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-zinc-950 pb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gold-400 font-mono">{order.id}</span>
                            <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
                              COOKING (TABLE {order.tableNumber})
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-0.5 font-mono">Dispatched at {order.createdAtTime}</p>
                        </div>

                        {/* Cancel/Reject option */}
                        <button
                          onClick={() => handleOpenReject(order.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 transition-colors text-xs cursor-pointer font-mono"
                          title="Reject/Void Order"
                        >
                          Void Order
                        </button>
                      </div>

                      {/* Info */}
                      <div className="space-y-1.5 text-xs">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-zinc-300">
                            <span>{item.name}</span>
                            <span className="font-mono text-gold-400 font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Print copy button trigger */}
                      <div className="pt-2 border-t border-zinc-950">
                        <button
                          onClick={() => setActiveOrderCopyOrder(order)}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-750 font-medium py-1.5 rounded-lg cursor-pointer transition-all text-xs flex items-center justify-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-gold-400" />
                          Print Order Copy (Thermal)
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )
            )}
          </div>

        </div>

        {/* Date Wise Historical completed orders */}
        <div className="border-t border-zinc-900 pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4 mb-6">
            <div>
              <h3 className="font-serif text-2xl font-bold text-zinc-100">Historical Archives</h3>
              <p className="text-xs text-zinc-500 mt-1">Audit and retrieve past completed orders date-wise.</p>
            </div>

            {/* Date filter picker */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-400" />
              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-10 bg-zinc-900/10 border border-zinc-800 rounded-xl">
              <ClipboardList className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No completed records found for {filterDate}.</p>
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 font-mono uppercase tracking-wider">
                    <th className="p-3">Order ID</th>
                    <th className="p-3 text-center">Table</th>
                    <th className="p-3">Service</th>
                    <th className="p-3">Items Purchased</th>
                    <th className="p-3 text-center">Invoiced</th>
                    <th className="p-3 text-right">Total Price</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((order, index) => {
                    // Calc order sum
                    const orderTotalSum = order.items.reduce((sum, item) => {
                      const discountedPrice = item.price * (1 - item.discount / 100);
                      const withVat = discountedPrice * (1 + item.vat / 100);
                      return sum + (withVat * item.quantity);
                    }, 0);

                    return (
                      <tr key={order.id} className="border-b border-zinc-800/40 hover:bg-zinc-900/20 font-sans text-zinc-300">
                        <td className="p-3 font-mono font-semibold text-gold-400">{order.id}</td>
                        <td className="p-3 text-center font-bold font-mono">T{order.tableNumber}</td>
                        <td className="p-3 capitalize font-mono text-[10px]">{order.orderType}</td>
                        <td className="p-3 max-w-xs truncate font-medium">
                          {order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {order.invoicePrinted ? (
                            <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Printed</span>
                          ) : (
                            <span className="text-zinc-500 text-[10px] bg-zinc-800 px-2 py-0.5 rounded">No</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-100">{orderTotalSum.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setActiveOrderCopyOrder(order)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-gold-400 p-1.5 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Print Customer's Order Copy"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Invoice Generation Print Modal */}
      {activeInvoiceOrder && (
        <InvoicePrint 
          order={activeInvoiceOrder}
          onClose={() => setActiveInvoiceOrder(null)}
          onConfirmPrint={handleConfirmInvoicePrint}
          onVoidOrder={(orderId) => {
            setActiveInvoiceOrder(null);
            handleOpenReject(orderId);
          }}
        />
      )}

      {/* Customer Order Copy (Thermal) Modal */}
      {activeOrderCopyOrder && (
        <OrderCopyPrint 
          order={activeOrderCopyOrder}
          onClose={() => setActiveOrderCopyOrder(null)}
          onConfirmPrint={() => {
            showToast('Order Copy printed successfully.', 'success');
            setActiveOrderCopyOrder(null);
          }}
        />
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border-gold-500/30">
            <div className="text-center mb-5">
              <div className="w-11 h-11 rounded-full border border-gold-500/20 bg-zinc-900 flex items-center justify-center text-gold-400 mx-auto mb-2">
                <Key className="w-5 h-5 text-gold-400" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-zinc-50">Change Admin Password</h3>
              <p className="text-xs text-zinc-500 mt-1">Updating this changes the entry key specifically for the Admin portal</p>
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

      {/* Reject Order custom reason Modal */}
      {rejectOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border-red-500/30">
            <div className="text-center mb-4">
              <div className="w-11 h-11 rounded-full border border-red-500/20 bg-zinc-900 flex items-center justify-center text-red-500 mx-auto mb-2 animate-pulse">
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-zinc-50">Reject Culinary Order</h3>
              <p className="text-xs text-zinc-500 mt-1">Specify reason for rejecting Order {rejectOrderId}</p>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-mono block">Rejection Reason (Mandatory)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Wagyu Ribeye Sold Out, Kitchen Closed, Incorrect Table Selection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-zinc-900 border border-red-500/10 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg cursor-pointer hover:bg-red-500 text-xs"
                >
                  Reject & Return Table
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOrderId(null)}
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
