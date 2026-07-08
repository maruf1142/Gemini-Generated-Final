/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, Role, SalesReportRow } from '../types';
import { 
  TrendingUp, Calendar, DollarSign, Award, Trophy, Key, ShieldAlert, 
  ChevronRight, ClipboardList, Sliders, Users, Search, HelpCircle, ArrowLeftRight,
  Download, Clock
} from 'lucide-react';
import { showToast } from './Notification';
import { getBangladeshDateString } from '../utils';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';

interface OwnerDashboardProps {
  onNavigateToRole: (role: Role) => void;
  onLogout: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onNavigateToRole, onLogout }) => {
  const { currentRole, orders, adminPassword, updatePassword } = useApp();

  // Date range filters
  const [startDate, setStartDate] = useState<string>(getBangladeshDateString());
  const [endDate, setEndDate] = useState<string>(getBangladeshDateString());

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Chart range selection
  const [revenuePeriod, setRevenuePeriod] = useState<'selected' | '7days' | '30days'>('7days');

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // Authentication Guard
  if (currentRole !== 'owner') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-lg animate-pulse">
          <TrendingUp className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-100">Access Restricted</h2>
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Owner Console Security Gate</p>
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

  // Filter completed orders by selected Date Range
  const filteredCompletedOrders = orders.filter(order => {
    if (order.status !== 'completed') return false;
    const orderDate = order.createdAtDate;
    return orderDate >= startDate && orderDate <= endDate;
  });

  // Flat map orders into sales rows
  // Columns: Item ID, Order ID, Item Name, Category, Price, Vat, Total Price, Table Number
  const salesRows: SalesReportRow[] = [];
  
  filteredCompletedOrders.forEach(order => {
    order.items.forEach(item => {
      const basePrice = item.price;
      const discountedPrice = basePrice * (1 - item.discount / 100);
      const vatAmount = discountedPrice * (item.vat / 100);
      const finalPrice = (discountedPrice + vatAmount) * item.quantity;

      salesRows.push({
        itemId: item.id,
        orderId: order.id,
        itemName: item.name,
        category: item.category,
        price: basePrice,
        vat: item.vat,
        discount: item.discount,
        totalPrice: finalPrice,
        tableNumber: order.tableNumber,
        date: order.createdAtDate,
        contactNumber: order.contactNumber,
        quantity: item.quantity
      });
    });
  });

  // Filter sales rows by name or category search query
  const searchedSalesRows = salesRows.filter(row => {
    const query = searchQuery.toLowerCase();
    return row.itemName.toLowerCase().includes(query) || 
           row.category.toLowerCase().includes(query) || 
           row.orderId.toLowerCase().includes(query) ||
           (row.contactNumber && row.contactNumber.toLowerCase().includes(query));
  });

  // Calculate Consolidated financial summary metrics
  let totalGrossRevenue = 0;
  let totalNetBase = 0;
  let totalVatAmount = 0;
  let totalDiscounts = 0;

  filteredCompletedOrders.forEach(order => {
    order.items.forEach(item => {
      const baseVal = item.price * item.quantity;
      const discVal = (item.price * (item.discount / 100)) * item.quantity;
      const discountedVal = baseVal - discVal;
      const vatVal = (discountedVal * (item.vat / 100));
      const totalVal = discountedVal + vatVal;

      totalNetBase += baseVal;
      totalDiscounts += discVal;
      totalVatAmount += vatVal;
      totalGrossRevenue += totalVal;
    });
  });

  // Top Selling Items calculations (Frequency count)
  const itemCounts: { [name: string]: { qty: number; revenue: number } } = {};
  salesRows.forEach(row => {
    if (!itemCounts[row.itemName]) {
      itemCounts[row.itemName] = { qty: 0, revenue: 0 };
    }
    itemCounts[row.itemName].qty += row.quantity;
    itemCounts[row.itemName].revenue += row.totalPrice;
  });

  const bestSellers = Object.keys(itemCounts)
    .map(name => ({ name, count: itemCounts[name].qty, revenue: itemCounts[name].revenue }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top Revenue Tables calculations
  const tableRevenues: { [table: string]: number } = {};
  salesRows.forEach(row => {
    if (!tableRevenues[row.tableNumber]) {
      tableRevenues[row.tableNumber] = 0;
    }
    tableRevenues[row.tableNumber] += row.totalPrice;
  });

  const topTables = Object.keys(tableRevenues)
    .map(table => ({ table, revenue: tableRevenues[table] }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // --- Real-time Data Visualization Helpers & Datasets ---

  // Daily Revenue & Order count generator for charting
  const getDatesInRange = (startStr: string, endStr: string) => {
    const dates: string[] = [];
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const current = new Date(start);
      let limit = 0;
      while (current <= end && limit < 100) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
        limit++;
      }
    } catch (e) {
      console.error(e);
    }
    return dates;
  };

  let datesToDisplay: string[] = [];
  if (revenuePeriod === 'selected') {
    datesToDisplay = getDatesInRange(startDate, endDate);
  } else if (revenuePeriod === '7days') {
    const start = new Date(endDate);
    start.setDate(start.getDate() - 6);
    datesToDisplay = getDatesInRange(start.toISOString().split('T')[0], endDate);
  } else { // 30 days
    const start = new Date(endDate);
    start.setDate(start.getDate() - 29);
    datesToDisplay = getDatesInRange(start.toISOString().split('T')[0], endDate);
  }

  if (datesToDisplay.length === 0) {
    datesToDisplay = [getBangladeshDateString()];
  }

  const dailyRevenueData = datesToDisplay.map(date => {
    const dayOrders = orders.filter(o => o.status === 'completed' && o.createdAtDate === date);
    let gross = 0;
    let discount = 0;
    dayOrders.forEach(order => {
      order.items.forEach(item => {
        const baseVal = item.price * item.quantity;
        const discVal = (item.price * (item.discount / 100)) * item.quantity;
        const discountedVal = baseVal - discVal;
        const vatVal = (discountedVal * (item.vat / 100));
        gross += discountedVal + vatVal;
        discount += discVal;
      });
    });

    let label = date;
    try {
      const [y, m, d] = date.split('-');
      const dObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      label = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {}

    return {
      date,
      label,
      Revenue: parseFloat(gross.toFixed(2)),
      Discounts: parseFloat(discount.toFixed(2)),
      Orders: dayOrders.length
    };
  });

  // Hourly order analytics (9 AM to 11 PM)
  const hourlyData = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 9;
    const hourFormatted = hour.toString().padStart(2, '0');
    const hourOrders = filteredCompletedOrders.filter(o => {
      if (!o.createdAtTime) return false;
      const h = o.createdAtTime.split(':')[0];
      return h === hourFormatted;
    });

    let revenue = 0;
    hourOrders.forEach(order => {
      order.items.forEach(item => {
        const baseVal = item.price * item.quantity;
        const discVal = (item.price * (item.discount / 100)) * item.quantity;
        const discountedVal = baseVal - discVal;
        const vatVal = (discountedVal * (item.vat / 100));
        revenue += discountedVal + vatVal;
      });
    });

    const hourLabel = hour >= 12 
      ? `${hour === 12 ? 12 : hour - 12} PM` 
      : `${hour} AM`;

    return {
      hour: hourFormatted,
      label: hourLabel,
      Orders: hourOrders.length,
      Revenue: parseFloat(revenue.toFixed(2))
    };
  });

  // Custom styled Tooltip component for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-xl shadow-2xl font-mono text-[10px] space-y-1 text-left">
          <p className="font-sans font-bold text-zinc-200 border-b border-zinc-900 pb-1 mb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-5 py-0.5">
              <span className="text-zinc-500" style={{ color: item.color }}>{item.name}:</span>
              <span className="font-bold text-zinc-100">
                {item.name === 'Orders' || item.name === 'Orders Count'
                  ? item.value
                  : `${item.value.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.length < 4) {
      showToast('Password must be at least 4 characters long.', 'error');
      return;
    }
    updatePassword(newPasswordInput);
    showToast('Owner Security Key updated successfully.', 'success');
    setShowPasswordModal(false);
    setNewPasswordInput('');
  };

  const handleExportLedger = () => {
    if (searchedSalesRows.length === 0) {
      showToast('No transaction data available to export in this date range.', 'info');
      return;
    }

    const headers = [
      'Item ID',
      'Order ID',
      'Item Name',
      'Category',
      'Unit Price',
      'VAT Rate (%)',
      'Discount (%)',
      'Table Number',
      'Phone Number',
      'Date',
      'Gross Total'
    ];

    const csvRows = [headers.join(',')];

    searchedSalesRows.forEach(row => {
      const formattedPhone = row.contactNumber ? `+880 ${row.contactNumber}` : '—';
      const values = [
        `"${row.itemId}"`,
        `"${row.orderId}"`,
        `"${row.itemName.replace(/"/g, '""')}"`,
        `"${row.category.replace(/"/g, '""')}"`,
        row.price.toFixed(2),
        `"${row.vat}%"`,
        `"${row.discount}%"`,
        `"T${row.tableNumber}"`,
        `"${formattedPhone}"`,
        `"${row.date}"`,
        row.totalPrice.toFixed(2)
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Sales_Ledger_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Ledger CSV download initiated!', 'success');
  };



  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-zinc-900 border-b md:border-b-0 md:border-r border-gold-500/10 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-gold-500/20 flex items-center justify-center bg-zinc-950">
              <span className="font-serif font-bold text-gold-400">O</span>
            </div>
            <div>
              <span className="font-serif font-semibold text-sm tracking-wide text-zinc-100">OWNER CONSOLE</span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest block uppercase">SaaS Analytics</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 text-xs">
            <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-2.5 px-3">
              Dashboards View
            </div>

            <button 
              onClick={() => onNavigateToRole('owner')}
              className="w-full flex items-center gap-3 bg-gold-950/30 text-gold-400 border border-gold-500/20 py-2.5 px-4 rounded-xl font-medium cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              SaaS Sales Analytics
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
              onClick={() => onNavigateToRole('kitchen')}
              className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Sliders className="w-4 h-4" />
                Kitchen Crew
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

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        
        {/* Top welcome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gold-500/5 pb-6">
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-100">SaaS Executive Board</h2>
            <p className="text-xs text-zinc-500 mt-1">Audit daily net aggregates, top dining tables, and premium product margins.</p>
          </div>

          {/* Date range picker selectors */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-2 font-mono text-[11px] text-zinc-300">
            <span className="text-gold-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Period:
            </span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-gold-500"
            />
            <span className="text-zinc-600 px-1">to</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-gold-500"
            />
          </div>
        </div>

        {/* Aggregated Revenue Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Gross Revenue */}
          <div className="glass-card p-5 rounded-xl border-gold-500/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Gross Revenues</span>
              <span className="text-2xl font-bold text-gold-400 font-mono mt-1 block">{totalGrossRevenue.toFixed(2)}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gold-950/30 border border-gold-500/15 flex items-center justify-center text-gold-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Base Sales net */}
          <div className="glass-card p-5 rounded-xl border-gold-500/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Net Base Value</span>
              <span className="text-2xl font-bold text-zinc-100 font-mono mt-1 block">{totalNetBase.toFixed(2)}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-zinc-850/30 border border-zinc-500/15 flex items-center justify-center text-zinc-400">
              <Sliders className="w-5 h-5" />
            </div>
          </div>

          {/* Vat Collected */}
          <div className="glass-card p-5 rounded-xl border-gold-500/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">VAT Collected</span>
              <span className="text-2xl font-bold text-blue-400 font-mono mt-1 block">{totalVatAmount.toFixed(2)}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-950/30 border border-blue-500/15 flex items-center justify-center text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
          </div>

          {/* Total Discounts */}
          <div className="glass-card p-5 rounded-xl border-gold-500/10 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Discounts Granted</span>
              <span className="text-2xl font-bold text-rose-500 font-mono mt-1 block">{totalDiscounts.toFixed(2)}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-950/30 border border-rose-500/15 flex items-center justify-center text-rose-400">
              <Sliders className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Real-time Data Visualization Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Chart 1: Daily Revenue Trend */}
          <div className="glass-card p-5 rounded-2xl border border-zinc-800/80 shadow-xl bg-zinc-900/15 flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold-400" />
                <div>
                  <h3 className="font-serif font-semibold text-zinc-100 text-sm">Daily Revenue Trend</h3>
                  <p className="text-[10px] text-zinc-500">Track visual trends of net daily incoming receipts and discounts.</p>
                </div>
              </div>

              {/* Chart range selection */}
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 gap-1 text-[10px] font-mono self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setRevenuePeriod('selected')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    revenuePeriod === 'selected' 
                      ? 'bg-gold-500 text-zinc-950 font-bold font-semibold' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Range
                </button>
                <button
                  type="button"
                  onClick={() => setRevenuePeriod('7days')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    revenuePeriod === '7days' 
                      ? 'bg-gold-500 text-zinc-950 font-bold font-semibold' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setRevenuePeriod('30days')}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    revenuePeriod === '30days' 
                      ? 'bg-gold-500 text-zinc-950 font-bold font-semibold' 
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  30 Days
                </button>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailyRevenueData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dbbf60" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#dbbf60" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Revenue" 
                    stroke="#dbbf60" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#revenueGradient)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Discounts" 
                    stroke="#ef4444" 
                    strokeWidth={1.5}
                    fill="none"
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Peak Order Times (Hourly Load) */}
          <div className="glass-card p-5 rounded-2xl border border-zinc-800/80 shadow-xl bg-zinc-900/15 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <div>
                  <h3 className="font-serif font-semibold text-zinc-100 text-sm">Peak Service Hours</h3>
                  <p className="text-[10px] text-zinc-500">Distribution of orders and hourly ticket loads (9 AM – 11 PM).</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-900 uppercase">
                Hourly Distribution
              </span>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hourlyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#52525b" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Bar 
                    dataKey="Orders" 
                    name="Orders Count" 
                    fill="#14b8a6" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={30}
                  />
                  <Bar 
                    dataKey="Revenue" 
                    name="Revenue Value" 
                    fill="#dbbf60" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Top lists grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Best Selling Items list */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Award className="w-5 h-5 text-gold-400" />
              <h3 className="font-serif font-semibold text-zinc-200 tracking-wide text-base">
                Best-Selling Menu Items
              </h3>
            </div>

            {bestSellers.length === 0 ? (
              <div className="text-center py-8 bg-zinc-900/10 border border-dashed border-zinc-900 rounded-xl text-zinc-500 text-xs">
                No active sales data in selected range.
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl overflow-hidden p-4 space-y-3">
                {bestSellers.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between bg-zinc-950/40 p-3 rounded-lg border border-zinc-900/60 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                        index === 0 ? 'bg-gold-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-medium text-zinc-200">{item.name}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-zinc-500 mr-2">Qty: <span className="font-bold text-zinc-300">{item.count}</span></span>
                      <span className="text-gold-400 font-bold">{item.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Revenue Tables list */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Trophy className="w-5 h-5 text-gold-400" />
              <h3 className="font-serif font-semibold text-zinc-200 tracking-wide text-base">
                Top Revenue-Generating Tables
              </h3>
            </div>

            {topTables.length === 0 ? (
              <div className="text-center py-8 bg-zinc-900/10 border border-dashed border-zinc-900 rounded-xl text-zinc-500 text-xs">
                No active sales data in selected range.
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl overflow-hidden p-4 space-y-3">
                {topTables.map((tab, index) => (
                  <div key={tab.table} className="flex items-center justify-between bg-zinc-950/40 p-3 rounded-lg border border-zinc-900/60 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                        index === 0 ? 'bg-gold-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-medium text-zinc-200 font-mono">Table {tab.table}</span>
                    </div>
                    <div className="text-right font-mono font-bold text-gold-400">
                      {tab.revenue.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Detailed Sales ledger sheet */}
        <div className="border-t border-zinc-900 pt-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4 mb-6">
            <div>
              <h3 className="font-serif text-2xl font-bold text-zinc-100">Comprehensive Sales Ledger</h3>
              <p className="text-xs text-zinc-500 mt-1">Complete itemized ledger matching all SaaS transaction guidelines.</p>
            </div>

            {/* Quick stats on matches */}
            <div className="text-right text-xs font-mono text-zinc-500">
              Showing <span className="text-gold-400 font-bold">{searchedSalesRows.length}</span> recorded item sales
            </div>
          </div>

          {/* Combined Toolbar: Date Range, Search, and Excel Export */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl mb-6">
            {/* Left Side: Synced Date Range Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <Calendar className="w-4 h-4 text-gold-400" />
                <span>Ledger Period:</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 focus:border-gold-500/50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none transition-all"
                />
                <span className="text-zinc-600 text-xs font-mono">to</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 focus:border-gold-500/50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Right Side: Search Input & Export Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Quick search input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Item, Category, Order, Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-gold-500/50 rounded-lg py-1.5 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all"
                />
              </div>

              {/* Excel Download button */}
              <button
                onClick={handleExportLedger}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sans font-bold py-1.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs transition-all shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Export Excel (.csv)
              </button>
            </div>
          </div>

          {searchedSalesRows.length === 0 ? (
            <div className="text-center py-10 bg-zinc-900/10 border border-zinc-800 rounded-xl text-zinc-500 text-xs">
              No matching ledger rows found.
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-mono uppercase tracking-wider">
                    <th className="p-3">Item ID</th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-center">VAT Rate</th>
                    <th className="p-3 text-center">Discount</th>
                    <th className="p-3 text-center">Table</th>
                    <th className="p-3 text-center">Phone Number</th>
                    <th className="p-3 text-right">Gross Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                  {searchedSalesRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/25">
                      <td className="p-3 font-mono text-[10px] text-zinc-500">{row.itemId}</td>
                      <td className="p-3 font-mono font-medium text-gold-500 truncate max-w-[80px]" title={row.orderId}>{row.orderId}</td>
                      <td className="p-3 font-medium text-zinc-100">{row.itemName}</td>
                      <td className="p-3 text-zinc-400">{row.category}</td>
                      <td className="p-3 text-right font-mono">{row.price.toFixed(2)}</td>
                      <td className="p-3 text-center font-mono text-zinc-400">{row.vat}%</td>
                      <td className="p-3 text-center font-mono text-rose-400">{row.discount}%</td>
                      <td className="p-3 text-center font-mono font-bold">T{row.tableNumber}</td>
                      <td className="p-3 text-center font-mono text-zinc-400">
                        {row.contactNumber ? `+880 ${row.contactNumber}` : '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gold-400">{row.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <h3 className="font-serif text-xl font-semibold text-zinc-50">Change Owner Password</h3>
              <p className="text-xs text-zinc-500 mt-1">Updating this changes the entry key specifically for the Owner portal</p>
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
