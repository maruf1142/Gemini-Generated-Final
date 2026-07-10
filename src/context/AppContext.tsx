/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MenuItem, Order, CartItem, Role, OrderStatus, OrderType, PasswordResetRequest } from '../types';
import { DEFAULT_MENU } from '../data/defaultMenu';
import { getBangladeshDateString, getBangladeshTimeString } from '../utils';
import bcrypt from 'bcryptjs';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

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

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        newObj[key] = cleanUndefined(val);
      }
    }
    return newObj as T;
  }
  return obj;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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

  // Load initial data from localStorage for fast initial render
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
    // 1. Initial fast load from local cache
    loadData();

    // 2. Real-time Subscription to Menu Items in Firestore
    const unsubscribeMenu = onSnapshot(collection(db, 'menu_items'), async (snapshot) => {
      if (snapshot.empty) {
        // Seed default menu to Firestore if empty
        try {
          for (const item of DEFAULT_MENU) {
            await setDoc(doc(db, 'menu_items', item.id), cleanUndefined(item));
          }
        } catch (err) {
          console.error('Error seeding menu to Firestore:', err);
        }
      } else {
        const items: MenuItem[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as MenuItem);
        });
        // Sort items stably by serialNumber or ID
        items.sort((a, b) => {
          const numA = parseInt(a.serialNumber || '999');
          const numB = parseInt(b.serialNumber || '999');
          return numA - numB;
        });
        setMenuItems(items);
        localStorage.setItem('saas_restaurant_menu', JSON.stringify(items));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'menu_items');
    });

    // 3. Real-time Subscription to Orders in Firestore
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orderList: Order[] = [];
      snapshot.forEach(docSnap => {
        orderList.push(docSnap.data() as Order);
      });
      // Sort descending by timestamp
      orderList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setOrders(orderList);
      localStorage.setItem('saas_restaurant_orders', JSON.stringify(orderList));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    // 4. Real-time Subscription to Password Resets in Firestore
    const unsubscribeResets = onSnapshot(collection(db, 'password_reset_requests'), (snapshot) => {
      const resets: PasswordResetRequest[] = [];
      snapshot.forEach(docSnap => {
        resets.push(docSnap.data() as PasswordResetRequest);
      });
      resets.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      setPasswordResetRequests(resets);
      localStorage.setItem('saas_restaurant_password_resets', JSON.stringify(resets));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'password_reset_requests');
    });

    // 5. Real-time Subscription to system passwords in Firestore Settings
    const unsubscribePasswords = onSnapshot(doc(db, 'settings', 'passwords'), async (snapshot) => {
      if (!snapshot.exists()) {
        try {
          await setDoc(doc(db, 'settings', 'passwords'), {
            adminPass: 'admin123',
            kitchenPass: 'kitchen123',
            ownerPass: 'owner123',
            superadminPass: 'super123'
          });
        } catch (err) {
          console.error('Error seeding passwords to Firestore:', err);
        }
      } else {
        const data = snapshot.data();
        if (data.adminPass) {
          setAdminPass(data.adminPass);
          localStorage.setItem('saas_restaurant_password_admin', data.adminPass);
        }
        if (data.kitchenPass) {
          setKitchenPass(data.kitchenPass);
          localStorage.setItem('saas_restaurant_password_kitchen', data.kitchenPass);
        }
        if (data.ownerPass) {
          setOwnerPass(data.ownerPass);
          localStorage.setItem('saas_restaurant_password_owner', data.ownerPass);
        }
        if (data.superadminPass) {
          setSuperadminPass(data.superadminPass);
          localStorage.setItem('saas_restaurant_password_superadmin', data.superadminPass);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/passwords');
    });

    // Handle same-tab storage event updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('saas_restaurant_')) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribeMenu();
      unsubscribeOrders();
      unsubscribeResets();
      unsubscribePasswords();
      window.removeEventListener('storage', handleStorageChange);
    };
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

  const updatePassword = async (newPassword: string) => {
    let nextAdminPass = adminPass;
    let nextKitchenPass = kitchenPass;
    let nextOwnerPass = ownerPass;
    let nextSuperadminPass = superadminPass;

    if (currentRole === 'admin') {
      nextAdminPass = newPassword;
      setAdminPass(newPassword);
      localStorage.setItem('saas_restaurant_password_admin', newPassword);
      // Clean up reset requests so temporary password can no longer be used
      passwordResetRequests.forEach(async r => {
        if (r.role === 'admin' && (r.status === 'approved' || r.status === 'pending')) {
          await updateDoc(doc(db, 'password_reset_requests', r.id), { status: 'completed' });
        }
      });
    } else if (currentRole === 'kitchen') {
      nextKitchenPass = newPassword;
      setKitchenPass(newPassword);
      localStorage.setItem('saas_restaurant_password_kitchen', newPassword);
      passwordResetRequests.forEach(async r => {
        if (r.role === 'kitchen' && (r.status === 'approved' || r.status === 'pending')) {
          await updateDoc(doc(db, 'password_reset_requests', r.id), { status: 'completed' });
        }
      });
    } else if (currentRole === 'owner') {
      nextOwnerPass = newPassword;
      setOwnerPass(newPassword);
      localStorage.setItem('saas_restaurant_password_owner', newPassword);
      passwordResetRequests.forEach(async r => {
        if (r.role === 'owner' && (r.status === 'approved' || r.status === 'pending')) {
          await updateDoc(doc(db, 'password_reset_requests', r.id), { status: 'completed' });
        }
      });
    } else if (currentRole === 'superadmin') {
      nextSuperadminPass = newPassword;
      setSuperadminPass(newPassword);
      localStorage.setItem('saas_restaurant_password_superadmin', newPassword);
    } else {
      nextAdminPass = newPassword;
      setAdminPass(newPassword);
      localStorage.setItem('saas_restaurant_password_admin', newPassword);
    }

    // Save update to Firestore
    try {
      await setDoc(doc(db, 'settings', 'passwords'), {
        adminPass: nextAdminPass,
        kitchenPass: nextKitchenPass,
        ownerPass: nextOwnerPass,
        superadminPass: nextSuperadminPass
      });
    } catch (err) {
      console.error('Error saving passwords to Firestore:', err);
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

    try {
      setDoc(doc(db, 'password_reset_requests', newRequest.id), cleanUndefined(newRequest));
    } catch (err) {
      console.error('Error writing reset request to Firestore:', err);
    }
    return { success: true };
  };

  const approvePasswordReset = async (requestId: string) => {
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

      await updateDoc(doc(db, 'password_reset_requests', requestId), {
        status: 'approved',
        tempPasswordHash: hash
      });

      return { success: true, tempPassword };
    } catch (e) {
      console.error('Password hashing failed:', e);
      return { success: false, error: 'Hashing failed.' };
    }
  };

  const rejectPasswordReset = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'password_reset_requests', requestId), {
        status: 'rejected'
      });
    } catch (err) {
      console.error('Error rejecting reset request in Firestore:', err);
    }
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

    // Write to Firestore - real-time listener will instantly propagate this to all dashboards
    try {
      setDoc(doc(db, 'orders', newOrder.id), cleanUndefined(newOrder));
    } catch (err) {
      console.error('Error placing order in Firestore:', err);
    }
    
    // Clear cart and customer preferences except table number
    clearCart();
    setSpecialNotes('');
    localStorage.removeItem('saas_restaurant_notes');
    window.dispatchEvent(new Event('storage'));

    return newOrder;
  };

  // Order Management Functions
  const approveOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cooking' });
    } catch (err) {
      console.error('Error approving order in Firestore:', err);
    }
  };

  const rejectOrder = async (orderId: string, reason: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'rejected', rejectReason: reason });
    } catch (err) {
      console.error('Error rejecting order in Firestore:', err);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (err) {
      console.error('Error updating order status in Firestore:', err);
    }
  };

  const printInvoice = async (orderId: string, isPrinted: boolean) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status: 'completed', 
        invoicePrinted: isPrinted 
      });
    } catch (err) {
      console.error('Error printing invoice/completing order in Firestore:', err);
    }
  };

  // Menu Management Functions
  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'createdAt'>) => {
    const newItem: MenuItem = {
      ...item,
      id: 'm-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'menu_items', newItem.id), cleanUndefined(newItem));
    } catch (err) {
      console.error('Error adding menu item in Firestore:', err);
    }
  };

  const editMenuItem = async (updatedItem: MenuItem) => {
    try {
      await setDoc(doc(db, 'menu_items', updatedItem.id), cleanUndefined(updatedItem));
    } catch (err) {
      console.error('Error editing menu item in Firestore:', err);
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menu_items', id));
    } catch (err) {
      console.error('Error deleting menu item in Firestore:', err);
    }
  };

  const updateItemPrice = async (id: string, price: number) => {
    try {
      await updateDoc(doc(db, 'menu_items', id), { price });
    } catch (err) {
      console.error('Error updating item price in Firestore:', err);
    }
  };

  const updateItemVat = async (id: string, vat: number) => {
    try {
      await updateDoc(doc(db, 'menu_items', id), { vat });
    } catch (err) {
      console.error('Error updating item VAT in Firestore:', err);
    }
  };

  const updateAllItemsVat = async (vat: number) => {
    try {
      const updates = menuItems.map(item => 
        updateDoc(doc(db, 'menu_items', item.id), { vat })
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('Error updating all items VAT in Firestore:', err);
    }
  };

  const updateItemDiscount = async (id: string, discount: number) => {
    try {
      await updateDoc(doc(db, 'menu_items', id), { discount });
    } catch (err) {
      console.error('Error updating item discount in Firestore:', err);
    }
  };

  const toggleItemAvailability = async (id: string) => {
    const targetItem = menuItems.find(item => item.id === id);
    if (targetItem) {
      try {
        await updateDoc(doc(db, 'menu_items', id), { available: !targetItem.available });
      } catch (err) {
        console.error('Error toggling item availability in Firestore:', err);
      }
    }
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
