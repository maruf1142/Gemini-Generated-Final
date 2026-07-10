/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MenuItem, Order, CartItem, Role, OrderStatus, OrderType, PasswordResetRequest } from '../types';
import { DEFAULT_MENU } from '../data/defaultMenu';
import { getBangladeshDateString, getBangladeshTimeString } from '../utils';
import bcrypt from 'bcryptjs';

interface AppContextType {
  menuItems: MenuItem[];
  orders: Order[];
  cart: CartItem[];
  currentRole: Role | null;
  currentUser: string | null;
  adminPassword: string;
  currentTable: string;
  specialNotes: string;
  orderType: OrderType;
  
  // Password Reset Workflow
  passwordResetRequests: PasswordResetRequest[];
  requestPasswordReset: (username: string, role: Role) => { success: boolean; error?: string };
  approvePasswordReset: (requestId: string) => { success: boolean; tempPassword?: string; error?: string };
  rejectPasswordReset: (requestId: string) => { success: boolean; error?: string };
  
  // Auth
  login: (username: string, password: string, targetRole: Role) => { success: boolean; error?: string };
  logout: () => void;
  setRole: (role: Role | null) => void;
  updatePassword: (newPassword: string) => void;
  verifyPasswordForRole: (role: Role, passwordToCheck: string) => boolean;
  
  // Cart & Ordering
  setTableNumber: (table: string) => void;
  setSpecialNotes: (notes: string) => void;
  setOrderType: (type: OrderType) => void;
  addToCart: (item: MenuItem, qty?: number) => void;
  updateCartQty: (itemId: string, qty: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  placeOrder: (selfieUrl?: string, signature?: string, contactNumber?: string) => Order | null;
  
  // Order Management
  approveOrder: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  printInvoice: (orderId: string, isPrinted: boolean) => void;
  
  // Menu Management
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt'>) => void;
  editMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  updateItemPrice: (id: string, price: number) => void;
  updateItemVat: (id: string, vat: number) => void;
  updateAllItemsVat: (vat: number) => void;
  updateItemDiscount: (id: string, discount: number) => void;
  toggleItemAvailability: (id: string) => void;
  
  // Simulated Voice Processing
  parseVoiceWithGemini: (transcript: string) => Promise<{ success: boolean; itemsAdded: number; tableDetected?: string; noteDetected?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  
  // Separate passwords for each dashboard / portal
  const [adminPass, setAdminPass] = useState<string>('admin123');
  const [kitchenPass, setKitchenPass] = useState<string>('kitchen123');
  const [ownerPass, setOwnerPass] = useState<string>('owner123');
  const [superadminPass, setSuperadminPass] = useState<string>('super123');

  const [currentTable, setCurrentTable] = useState<string>('');
  const [specialNotes, setSpecialNotesState] = useState<string>('');
  const [orderType, setOrderTypeState] = useState<OrderType>('dine-in');

  // Load initial data
  const loadData = () => {
    try {
      // Menu items
      const storedMenu = localStorage.getItem('saas_restaurant_menu');
      if (storedMenu) {
        setMenuItems(JSON.parse(storedMenu));
      } else {
        localStorage.setItem('saas_restaurant_menu', JSON.stringify(DEFAULT_MENU));
        setMenuItems(DEFAULT_MENU);
      }

      // Orders
      const storedOrders = localStorage.getItem('saas_restaurant_orders');
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      } else {
        localStorage.setItem('saas_restaurant_orders', JSON.stringify([]));
        setOrders([]);
      }

      // Cart
      const storedCart = localStorage.getItem('saas_restaurant_cart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }

      // Password Reset Requests
      const storedResets = localStorage.getItem('saas_restaurant_password_resets');
      if (storedResets) {
        setPasswordResetRequests(JSON.parse(storedResets));
      } else {
        setPasswordResetRequests([]);
      }

      // Passwords - Migration / Separation
      const oldPassword = localStorage.getItem('saas_restaurant_password') || 'admin123';

      const storedAdminPass = localStorage.getItem('saas_restaurant_password_admin');
      if (storedAdminPass) {
        setAdminPass(storedAdminPass);
      } else {
        localStorage.setItem('saas_restaurant_password_admin', oldPassword);
        setAdminPass(oldPassword);
      }

      const storedKitchenPass = localStorage.getItem('saas_restaurant_password_kitchen');
      if (storedKitchenPass) {
        setKitchenPass(storedKitchenPass);
      } else {
        const defaultKitchen = oldPassword !== 'admin123' ? oldPassword : 'kitchen123';
        localStorage.setItem('saas_restaurant_password_kitchen', defaultKitchen);
        setKitchenPass(defaultKitchen);
      }

      const storedOwnerPass = localStorage.getItem('saas_restaurant_password_owner');
      if (storedOwnerPass) {
        setOwnerPass(storedOwnerPass);
      } else {
        const defaultOwner = oldPassword !== 'admin123' ? oldPassword : 'owner123';
        localStorage.setItem('saas_restaurant_password_owner', defaultOwner);
        setOwnerPass(defaultOwner);
      }

      const storedSuperadminPass = localStorage.getItem('saas_restaurant_password_superadmin');
      if (storedSuperadminPass) {
        setSuperadminPass(storedSuperadminPass);
      } else {
        const defaultSuper = oldPassword !== 'admin123' ? oldPassword : 'super123';
        localStorage.setItem('saas_restaurant_password_superadmin', defaultSuper);
        setSuperadminPass(defaultSuper);
      }

      // Active Role / Session
      const storedRole = sessionStorage.getItem('saas_restaurant_role');
      const storedUser = sessionStorage.getItem('saas_restaurant_user');
      if (storedRole) {
        setCurrentRole(storedRole as Role);
        setCurrentUser(storedUser);
      } else {
        setCurrentRole(null);
        setCurrentUser(null);
      }

      // Table & Notes
      const storedTable = localStorage.getItem('saas_restaurant_table') || '';
      const storedNotes = localStorage.getItem('saas_restaurant_notes') || '';
      const storedOrderType = localStorage.getItem('saas_restaurant_ordertype') || 'dine-in';
      setCurrentTable(storedTable);
      setSpecialNotesState(storedNotes);
      setOrderTypeState(storedOrderType as OrderType);
    } catch (e) {
      console.error('Error loading localStorage data', e);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to storage changes from other tabs/iframes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('saas_restaurant_')) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper to save and dispatch custom events for same-tab updates
  const updateLocalStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    // Trigger storage event manually for the current window to update other listening components immediately
    window.dispatchEvent(new Event('storage'));
  };

  // Dynamic active password based on the current logged-in role
  const adminPassword = (() => {
    if (currentRole === 'kitchen') return kitchenPass;
    if (currentRole === 'owner') return ownerPass;
    if (currentRole === 'superadmin') return superadminPass;
    return adminPass;
  })();

  // Auth Functions
  const login = (username: string, password: string, targetRole: Role) => {
    const cleanUsername = username.trim().toLowerCase();
    
    // Superadmin bypass: superadmin can login to ANY dashboard
    const isSuperAdminLogin = cleanUsername === 'superadmin' && password === superadminPass;
    
    // Otherwise check matching role credentials
    let passwordToCheck = '';
    if (targetRole === 'admin') passwordToCheck = adminPass;
    else if (targetRole === 'kitchen') passwordToCheck = kitchenPass;
    else if (targetRole === 'owner') passwordToCheck = ownerPass;
    else if (targetRole === 'superadmin') passwordToCheck = superadminPass;
    
    // Check for approved temporary password
    let isTempPasswordLogin = false;
    if ((targetRole === 'admin' && cleanUsername === 'admin') ||
        (targetRole === 'kitchen' && cleanUsername === 'kitchen') ||
        (targetRole === 'owner' && cleanUsername === 'owner')) {
      const approvedReset = passwordResetRequests.find(r => r.role === targetRole && r.status === 'approved' && r.tempPasswordHash);
      if (approvedReset && approvedReset.tempPasswordHash) {
        try {
          if (bcrypt.compareSync(password, approvedReset.tempPasswordHash)) {
            isTempPasswordLogin = true;
          }
        } catch (e) {
          console.error('Bcrypt compare failed:', e);
        }
      }
    }

    const isMatchedRoleLogin = (password === passwordToCheck || isTempPasswordLogin) && (
      (targetRole === 'admin' && cleanUsername === 'admin') ||
      (targetRole === 'kitchen' && cleanUsername === 'kitchen') ||
      (targetRole === 'owner' && cleanUsername === 'owner') ||
      (targetRole === 'superadmin' && cleanUsername === 'superadmin')
    );

    if (isSuperAdminLogin || isMatchedRoleLogin) {
      setCurrentRole(targetRole);
      setCurrentUser(username);
      sessionStorage.setItem('saas_restaurant_role', targetRole);
      sessionStorage.setItem('saas_restaurant_user', username);
      return { success: true };
    }

    return { success: false, error: 'Invalid username or password for this role.' };
  };

  const logout = () => {
    setCurrentRole(null);
    setCurrentUser(null);
    sessionStorage.removeItem('saas_restaurant_role');
    sessionStorage.removeItem('saas_restaurant_user');
    window.dispatchEvent(new Event('storage'));
  };

  const setRole = (role: Role | null) => {
    setCurrentRole(role);
    if (role) {
      sessionStorage.setItem('saas_restaurant_role', role);
    } else {
      sessionStorage.removeItem('saas_restaurant_role');
      sessionStorage.removeItem('saas_restaurant_user');
      setCurrentUser(null);
    }
    window.dispatchEvent(new Event('storage'));
  };

  const updatePassword = (newPassword: string) => {
    if (currentRole === 'admin') {
      setAdminPass(newPassword);
      localStorage.setItem('saas_restaurant_password_admin', newPassword);
      // Clean up reset requests so temporary password can no longer be used
      const updated = passwordResetRequests.map(r => {
        if (r.role === 'admin' && (r.status === 'approved' || r.status === 'pending')) {
          return { ...r, status: 'completed' as const };
        }
        return r;
      });
      setPasswordResetRequests(updated);
      updateLocalStorage('saas_restaurant_password_resets', updated);
    } else if (currentRole === 'kitchen') {
      setKitchenPass(newPassword);
      localStorage.setItem('saas_restaurant_password_kitchen', newPassword);
      // Clean up reset requests for kitchen
      const updated = passwordResetRequests.map(r => {
        if (r.role === 'kitchen' && (r.status === 'approved' || r.status === 'pending')) {
          return { ...r, status: 'completed' as const };
        }
        return r;
      });
      setPasswordResetRequests(updated);
      updateLocalStorage('saas_restaurant_password_resets', updated);
    } else if (currentRole === 'owner') {
      setOwnerPass(newPassword);
      localStorage.setItem('saas_restaurant_password_owner', newPassword);
      // Clean up reset requests for owner
      const updated = passwordResetRequests.map(r => {
        if (r.role === 'owner' && (r.status === 'approved' || r.status === 'pending')) {
          return { ...r, status: 'completed' as const };
        }
        return r;
      });
      setPasswordResetRequests(updated);
      updateLocalStorage('saas_restaurant_password_resets', updated);
    } else if (currentRole === 'superadmin') {
      setSuperadminPass(newPassword);
      localStorage.setItem('saas_restaurant_password_superadmin', newPassword);
    } else {
      setAdminPass(newPassword);
      localStorage.setItem('saas_restaurant_password_admin', newPassword);
    }
    // Also save as default old key for any legacy components that look for it
    localStorage.setItem('saas_restaurant_password', newPassword);
    window.dispatchEvent(new Event('storage'));
  };

  const verifyPasswordForRole = (role: Role, passwordToCheck: string): boolean => {
    if (passwordToCheck === superadminPass) return true;
    if (role === 'admin') {
      if (passwordToCheck === adminPass) return true;
      const approvedReset = passwordResetRequests.find(r => r.role === 'admin' && r.status === 'approved' && r.tempPasswordHash);
      if (approvedReset && approvedReset.tempPasswordHash) {
        try {
          return bcrypt.compareSync(passwordToCheck, approvedReset.tempPasswordHash);
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (role === 'kitchen') {
      if (passwordToCheck === kitchenPass) return true;
      const approvedReset = passwordResetRequests.find(r => r.role === 'kitchen' && r.status === 'approved' && r.tempPasswordHash);
      if (approvedReset && approvedReset.tempPasswordHash) {
        try {
          return bcrypt.compareSync(passwordToCheck, approvedReset.tempPasswordHash);
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (role === 'owner') {
      if (passwordToCheck === ownerPass) return true;
      const approvedReset = passwordResetRequests.find(r => r.role === 'owner' && r.status === 'approved' && r.tempPasswordHash);
      if (approvedReset && approvedReset.tempPasswordHash) {
        try {
          return bcrypt.compareSync(passwordToCheck, approvedReset.tempPasswordHash);
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (role === 'superadmin') return passwordToCheck === superadminPass;
    return false;
  };

  const requestPasswordReset = (username: string, role: Role) => {
    const cleanUsername = username.trim().toLowerCase();
    const allowedRoles: Role[] = ['admin', 'kitchen', 'owner'];
    
    if (!allowedRoles.includes(role) || cleanUsername !== role) {
      return { success: false, error: `Password resets are only supported for: ${allowedRoles.join(', ')}.` };
    }

    const existingPending = passwordResetRequests.find(r => r.role === role && r.status === 'pending');
    if (existingPending) {
      return { success: false, error: `A password reset request is already pending for ${role} with Super Admin.` };
    }

    const newRequest: PasswordResetRequest = {
      id: 'req-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      role: role,
      username: role,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    const updated = [newRequest, ...passwordResetRequests];
    setPasswordResetRequests(updated);
    updateLocalStorage('saas_restaurant_password_resets', updated);
    return { success: true };
  };

  const approvePasswordReset = (requestId: string) => {
    const request = passwordResetRequests.find(r => r.id === requestId);
    if (!request) {
      return { success: false, error: 'Request not found.' };
    }

    // Generate a cryptographically secure temporary password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#';
    let tempPassword = '';
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(8);
      window.crypto.getRandomValues(array);
      for (let i = 0; i < 8; i++) {
        tempPassword += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < 8; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(tempPassword, salt);

      const updated = passwordResetRequests.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'approved' as const,
            tempPasswordHash: hash
          };
        }
        return r;
      });

      setPasswordResetRequests(updated);
      updateLocalStorage('saas_restaurant_password_resets', updated);

      return { success: true, tempPassword };
    } catch (e) {
      console.error('Password hashing failed:', e);
      return { success: false, error: 'Hashing failed.' };
    }
  };

  const rejectPasswordReset = (requestId: string) => {
    const updated = passwordResetRequests.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'rejected' as const
        };
      }
      return r;
    });

    setPasswordResetRequests(updated);
    updateLocalStorage('saas_restaurant_password_resets', updated);
    return { success: true };
  };

  // Cart Functions
  const setTableNumber = (table: string) => {
    setCurrentTable(table);
    localStorage.setItem('saas_restaurant_table', table);
    window.dispatchEvent(new Event('storage'));
  };

  const setSpecialNotes = (notes: string) => {
    setSpecialNotesState(notes);
    localStorage.setItem('saas_restaurant_notes', notes);
    window.dispatchEvent(new Event('storage'));
  };

  const setOrderType = (type: OrderType) => {
    setOrderTypeState(type);
    localStorage.setItem('saas_restaurant_ordertype', type);
    window.dispatchEvent(new Event('storage'));
  };

  const addToCart = (item: MenuItem, qty: number = 1) => {
    const updatedCart = [...cart];
    const existingIndex = updatedCart.findIndex(cartItem => cartItem.menuItem.id === item.id);
    
    if (existingIndex > -1) {
      const existingItem = updatedCart[existingIndex];
      existingItem.quantity += qty;
      // Remove it from its current position and put it at the very top (index 0)
      updatedCart.splice(existingIndex, 1);
      updatedCart.unshift(existingItem);
    } else {
      updatedCart.unshift({ menuItem: item, quantity: qty });
    }
    
    setCart(updatedCart);
    updateLocalStorage('saas_restaurant_cart', updatedCart);
  };

  const updateCartQty = (itemId: string, qty: number) => {
    let updatedCart = [...cart];
    const existingIndex = updatedCart.findIndex(cartItem => cartItem.menuItem.id === itemId);
    
    if (existingIndex > -1) {
      if (qty <= 0) {
        updatedCart = updatedCart.filter(cartItem => cartItem.menuItem.id !== itemId);
      } else {
        updatedCart[existingIndex].quantity = qty;
      }
      setCart(updatedCart);
      updateLocalStorage('saas_restaurant_cart', updatedCart);
    }
  };

  const removeFromCart = (itemId: string) => {
    const updatedCart = cart.filter(cartItem => cartItem.menuItem.id !== itemId);
    setCart(updatedCart);
    updateLocalStorage('saas_restaurant_cart', updatedCart);
  };

  const clearCart = () => {
    setCart([]);
    updateLocalStorage('saas_restaurant_cart', []);
  };

  const placeOrder = (selfieUrl?: string, signature?: string, contactNumber?: string) => {
    if (cart.length === 0 || !currentTable) return null;

    const now = new Date();
    const newOrder: Order = {
      id: 'ord-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      tableNumber: currentTable,
      specialNotes: specialNotes || undefined,
      orderType,
      items: cart.map(item => ({
        menuItemId: item.menuItem.id,
        name: item.menuItem.name,
        price: item.menuItem.price,
        vat: item.menuItem.vat,
        discount: item.menuItem.discount,
        quantity: item.quantity,
        category: item.menuItem.category
      })),
      status: 'pending',
      timestamp: now.toISOString(),
      createdAtTime: getBangladeshTimeString(now),
      createdAtDate: getBangladeshDateString(now),
      selfieUrl,
      signature,
      contactNumber
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    updateLocalStorage('saas_restaurant_orders', updatedOrders);
    
    // Clear cart and customer preferences except table number
    clearCart();
    setSpecialNotes('');
    localStorage.removeItem('saas_restaurant_notes');
    window.dispatchEvent(new Event('storage'));

    return newOrder;
  };

  // Order Management Functions
  const approveOrder = (orderId: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, status: 'cooking' as const };
      }
      return order;
    });
    setOrders(updatedOrders);
    updateLocalStorage('saas_restaurant_orders', updatedOrders);
  };

  const rejectOrder = (orderId: string, reason: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, status: 'rejected' as const, rejectReason: reason };
      }
      return order;
    });
    setOrders(updatedOrders);
    updateLocalStorage('saas_restaurant_orders', updatedOrders);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, status };
      }
      return order;
    });
    setOrders(updatedOrders);
    updateLocalStorage('saas_restaurant_orders', updatedOrders);
  };

  const printInvoice = (orderId: string, isPrinted: boolean) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { 
          ...order, 
          status: 'completed' as const, 
          invoicePrinted: isPrinted 
        };
      }
      return order;
    });
    setOrders(updatedOrders);
    updateLocalStorage('saas_restaurant_orders', updatedOrders);
  };

  // Menu Management Functions
  const addMenuItem = (item: Omit<MenuItem, 'id' | 'createdAt'>) => {
    const newItem: MenuItem = {
      ...item,
      id: 'm-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    const updatedMenu = [...menuItems, newItem];
    setMenuItems(updatedMenu);
    updateLocalStorage('saas_restaurant_menu', updatedMenu);
  };

  const editMenuItem = (updatedItem: MenuItem) => {
    const updatedMenu = menuItems.map(item => item.id === updatedItem.id ? updatedItem : item);
    setMenuItems(updatedMenu);
    updateLocalStorage('saas_restaurant_menu', updatedMenu);
  };

  const deleteMenuItem = (id: string) => {
    const updatedMenu = menuItems.filter(item => item.id !== id);
    setMenuItems(updatedMenu);
    updateLocalStorage('saas_restaurant_menu', updatedMenu);
  };

  const updateItemPrice = (id: string, price: number) => {
    const updatedMenu = menuItems.map(item => item.id === id ? { ...item, price } : item);
    setMenuItems(updatedMenu);
    updateLocalStorage('saas_restaurant_menu', updatedMenu);
  };

  const updateItemVat = (id: string, vat: number) => {
    const updatedMenu = menuItems.map(item => item.id === id ? { ...item, vat } : item);
    setMenuItems(updatedMenu);
    updateLocalStorage('saas_restaurant_menu', updatedMenu);
  };

  const updateAllItemsVat = (vat: number) => {
    const updatedMenu = menuItems.map(item => ({ ...item, vat }));
    setMenuItems(updatedMenu);
    updateLocalStorage('saas_restaurant_menu', updatedMenu);
  };

  const updateItemDiscount = (id: string, discount: number) => {
    const updatedMenu = menuItems.map(item => item.id === id ? { ...item, discount } : item);
    setMenuItems(updatedMenu);
    updateLocalStorage('saas_restaurant_menu', updatedMenu);
  };

  const toggleItemAvailability = (id: string) => {
    const updatedMenu = menuItems.map(item => item.id === id ? { ...item, available: !item.available } : item);
    setMenuItems(updatedMenu);
    updateLocalStorage('saas_restaurant_menu', updatedMenu);
  };

  // Server-Side AI Voice Parsing Proxy call
  const parseVoiceWithGemini = async (transcript: string) => {
    try {
      const response = await fetch('/api/parse-voice-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, menuItems })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result = await response.json();
      
      let itemsAdded = 0;
      if (result.items && Array.isArray(result.items)) {
        for (const item of result.items) {
          const matchedItem = menuItems.find(m => m.id === item.menuItemId && m.available);
          if (matchedItem) {
            addToCart(matchedItem, item.quantity || 1);
            itemsAdded += (item.quantity || 1);
          }
        }
      }

      if (result.tableNumber) {
        setTableNumber(String(result.tableNumber));
      }

      if (result.specialNotes) {
        setSpecialNotes(String(result.specialNotes));
      }

      return {
        success: true,
        itemsAdded,
        tableDetected: result.tableNumber || undefined,
        noteDetected: result.specialNotes || undefined
      };
    } catch (err) {
      console.error('Error calling Voice Parsing API:', err);
      
      // Client-side local fallback parsing if server API keys are not ready or fail
      // Just some simple regex mapping so it works offline too!
      const normalized = transcript.toLowerCase();
      let itemsAdded = 0;
      let tableDetected = '';
      let noteDetected = '';

      // Try to find table
      const tableMatch = normalized.match(/(?:table|টেবিল|টেবিলে)\s*(\d+)/) || normalized.match(/(\d+)\s*(?:table|টেবিল)/);
      if (tableMatch && tableMatch[1]) {
        tableDetected = tableMatch[1];
        setTableNumber(tableDetected);
      }

      // Try to match items
      for (const m of menuItems) {
        if (!m.available) continue;
        const itemWords = m.name.toLowerCase().split(' ');
        const matchesName = itemWords.some(word => word.length > 3 && normalized.includes(word)) || normalized.includes(m.name.toLowerCase());
        
        if (matchesName) {
          // Detect quantity
          let qty = 1;
          const qtyMatch = normalized.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${itemWords[0]}`)) || normalized.match(new RegExp(`${itemWords[0]}\\s*(\\d+(?:\\.\\d+)?)`));
          if (qtyMatch && qtyMatch[1]) {
            qty = parseFloat(qtyMatch[1]);
          } else if (normalized.includes('two') || normalized.includes('দুই') || normalized.includes('দুটি')) {
            qty = 2;
          } else if (normalized.includes('three') || normalized.includes('তিন') || normalized.includes('তিনটি')) {
            qty = 3;
          }
          addToCart(m, qty);
          itemsAdded += qty;
        }
      }

      return {
        success: true,
        itemsAdded,
        tableDetected: tableDetected || undefined,
        noteDetected: noteDetected || undefined
      };
    }
  };

  return (
    <AppContext.Provider value={{
      menuItems,
      orders,
      cart,
      currentRole,
      currentUser,
      adminPassword,
      currentTable,
      specialNotes,
      orderType,
      passwordResetRequests,
      requestPasswordReset,
      approvePasswordReset,
      rejectPasswordReset,
      login,
      logout,
      setRole,
      updatePassword,
      verifyPasswordForRole,
      setTableNumber,
      setSpecialNotes,
      setOrderType,
      addToCart,
      updateCartQty,
      removeFromCart,
      clearCart,
      placeOrder,
      approveOrder,
      rejectOrder,
      updateOrderStatus,
      printInvoice,
      addMenuItem,
      editMenuItem,
      deleteMenuItem,
      updateItemPrice,
      updateItemVat,
      updateAllItemsVat,
      updateItemDiscount,
      toggleItemAvailability,
      parseVoiceWithGemini
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
