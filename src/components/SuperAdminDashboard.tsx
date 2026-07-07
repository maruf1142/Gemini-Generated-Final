/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItem, Role } from '../types';
import { 
  Plus, Edit2, Trash2, Key, Sparkles, Check, X, ShieldAlert, 
  Eye, Image, Sliders, DollarSign, ArrowLeft, ClipboardList, ChevronRight 
} from 'lucide-react';
import { showToast } from './Notification';

interface SuperAdminDashboardProps {
  onNavigateToRole: (role: Role) => void;
  onLogout: () => void;
}

const LUXURY_PRESET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60', label: 'Gourmet Steak' },
  { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=60', label: 'Woodfired Pizza' },
  { url: 'https://images.unsplash.com/photo-1560684352-8497838a2229?w=500&auto=format&fit=crop&q=60', label: 'Truffle Pasta' },
  { url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&auto=format&fit=crop&q=60', label: 'Chocolate Soufflé' },
  { url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60', label: 'Craft Cocktail' },
  { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60', label: 'BBR Skewer' },
  { url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60', label: 'Salmon Salad' },
  { url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=60', label: 'Berry Cupcake' }
];

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigateToRole, onLogout }) => {
  const { 
    currentRole, 
    menuItems, 
    addMenuItem, 
    editMenuItem, 
    deleteMenuItem, 
    updateItemPrice, 
    updateItemVat, 
    updateItemDiscount, 
    toggleItemAvailability,
    adminPassword,
    updatePassword
  } = useApp();

  // State managers
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Form input states
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(10);
  const [vat, setVat] = useState<number>(15);
  const [discount, setDiscount] = useState<number>(0);
  const [category, setCategory] = useState('Entrées');
  const [imageUrl, setImageUrl] = useState(LUXURY_PRESET_IMAGES[0].url);
  const [customImageToggle, setCustomImageToggle] = useState(false);

  // Deletion confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');

  // Authentication Guard
  if (currentRole !== 'superadmin') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-lg animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-100">Access Restricted</h2>
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">Super Admin Security Gate</p>
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

  // Parse and fill form fields from clipboard pasted Excel row
  const handleExcelString = (text: string) => {
    if (!text) return;
    
    // Tab-separated or comma-separated
    const delimiter = text.includes('\t') ? '\t' : text.includes(',') ? ',' : ';';
    const cells = text.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    
    if (cells.length > 0) {
      // S/N, Name, Category, Description, Price, VAT, Discount, Image URL
      let parsedSN = cells[0] || '';
      let parsedName = cells[1] || '';
      let parsedCategory = cells[2] || '';
      let parsedDescription = cells[3] || '';
      let parsedPrice = parseFloat(cells[4]);
      let parsedVat = parseFloat(cells[5]);
      let parsedDiscount = parseFloat(cells[6]);
      let parsedImageUrl = cells[7] || '';

      // If we don't have exactly 7 or 8 cells, let's use a smart fallback parser to detect cells!
      if (cells.length < 6) {
        parsedSN = ''; parsedName = ''; parsedCategory = ''; parsedDescription = '';
        parsedPrice = NaN; parsedVat = NaN; parsedDiscount = NaN; parsedImageUrl = '';
        
        cells.forEach(cell => {
          if (!cell) return;
          if (cell.startsWith('http://') || cell.startsWith('https://')) {
            parsedImageUrl = cell;
          } else if (cell.toUpperCase().startsWith('SN-') || (/^[A-Z0-9-]{3,10}$/.test(cell) && isNaN(Number(cell)))) {
            parsedSN = cell;
          } else if (['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Signature Steaks', 'Specials', 'Entrées', 'Mains'].some(cat => cell.toLowerCase().includes(cat.toLowerCase()))) {
            parsedCategory = cell;
          } else if (!isNaN(Number(cell))) {
            const num = Number(cell);
            if (isNaN(parsedPrice)) {
              parsedPrice = num;
            } else if (isNaN(parsedVat)) {
              parsedVat = num;
            } else if (isNaN(parsedDiscount)) {
              parsedDiscount = num;
            }
          } else if (cell.length > 25) {
            parsedDescription = cell;
          } else if (!parsedName) {
            parsedName = cell;
          } else if (!parsedCategory) {
            parsedCategory = cell;
          }
        });
      }

      if (parsedSN) setSerialNumber(parsedSN);
      if (parsedName) setName(parsedName);
      if (parsedCategory) setCategory(parsedCategory);
      if (parsedDescription) setDescription(parsedDescription);
      if (!isNaN(parsedPrice)) setPrice(parsedPrice);
      if (!isNaN(parsedVat)) setVat(parsedVat);
      if (!isNaN(parsedDiscount)) setDiscount(parsedDiscount);
      if (parsedImageUrl) setImageUrl(parsedImageUrl);

      showToast(`Excel row parsed: "${parsedName || 'Delicacy'}" details auto-filled!`, 'success');
    }
  };

  // Open item editor
  const handleOpenAdd = () => {
    setEditingItem(null);
    setSerialNumber('');
    setName('');
    setDescription('');
    setPrice(15);
    setVat(13);
    setDiscount(0);
    setCategory('Entrées');
    setImageUrl(LUXURY_PRESET_IMAGES[0].url);
    setCustomImageToggle(false);
    setShowItemModal(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setSerialNumber(item.serialNumber || '');
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price);
    setVat(item.vat);
    setDiscount(item.discount);
    setCategory(item.category);
    setImageUrl(item.image);
    setCustomImageToggle(!LUXURY_PRESET_IMAGES.some(preset => preset.url === item.image));
    setShowItemModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || price <= 0) {
      showToast('All fields must be valid.', 'error');
      return;
    }

    const itemData = {
      serialNumber,
      name,
      description,
      price: Number(price),
      vat: Number(vat),
      discount: Number(discount),
      category,
      image: imageUrl,
      available: editingItem ? editingItem.available : true
    };

    if (editingItem) {
      editMenuItem({ ...itemData, id: editingItem.id });
      showToast(`Successfully updated "${name}"`, 'success');
    } else {
      addMenuItem(itemData);
      showToast(`Successfully added "${name}" to the menu`, 'success');
    }
    setShowItemModal(false);
  };

  const handleDeleteConfirm = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmId) {
      deleteMenuItem(deleteConfirmId);
      showToast('Menu item removed successfully.', 'success');
      setDeleteConfirmId(null);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.length < 4) {
      showToast('Password must be at least 4 characters long.', 'error');
      return;
    }
    updatePassword(newPasswordInput);
    showToast('Superadmin Security Key updated successfully.', 'success');
    setShowPasswordModal(false);
    setNewPasswordInput('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-zinc-900 border-b md:border-b-0 md:border-r border-gold-500/10 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-gold-500/20 flex items-center justify-center bg-zinc-950">
              <span className="font-serif font-bold text-gold-400">S</span>
            </div>
            <div>
              <span className="font-serif font-semibold text-sm tracking-wide text-zinc-100">SUPER ADMIN</span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest block uppercase">Menu Controller</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 text-xs">
            <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-2.5 px-3">
              Dashboards View
            </div>

            <button 
              onClick={() => onNavigateToRole('superadmin')}
              className="w-full flex items-center gap-3 bg-gold-950/30 text-gold-400 border border-gold-500/20 py-2.5 px-4 rounded-xl font-medium cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              Gourmet Menu Controls
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

        {/* Logout */}
        <div className="space-y-3 pt-8 border-t border-zinc-800/60 mt-8">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-zinc-950 text-zinc-400 hover:text-red-400 py-2 rounded-lg cursor-pointer text-xs font-sans transition-colors"
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
            <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              Menu Configuration
              <Sparkles className="w-5 h-5 text-gold-400 animate-pulse" />
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Add, edit, adjust prices, VAT, discounts, or toggle immediate availability.</p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-sans font-bold py-2.5 px-5 rounded-lg hover:from-gold-400 hover:to-gold-500 shadow-md transition-all cursor-pointer flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            Add Menu Item
          </button>
        </div>

        {/* Menu Management Table/List Layout */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-mono uppercase tracking-wider">
                  <th className="p-4">Dish Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-right">Base Price</th>
                  <th className="p-4 text-center">VAT Rate</th>
                  <th className="p-4 text-center">Discount</th>
                  <th className="p-4 text-center">Availability</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {menuItems.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-900/25">
                    
                    {/* Name, desc and image */}
                    <td className="p-4 max-w-sm">
                      <div className="flex gap-3">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-zinc-800"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-serif font-bold text-zinc-100 text-sm">{item.name}</h4>
                            {item.serialNumber && (
                              <span className="text-[9px] font-mono font-bold bg-gold-500/10 text-gold-400 px-1.5 py-0.5 rounded border border-gold-500/20">
                                {item.serialNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{item.description}</p>
                          <span className="text-[9px] text-zinc-600 font-mono mt-1 block">ID: {item.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4 font-medium font-sans">
                      <span className="bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 rounded-full text-zinc-400">
                        {item.category}
                      </span>
                    </td>

                    {/* Price with inline quick changer */}
                    <td className="p-4 text-right font-mono font-bold text-zinc-100">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-gold-400 font-bold">{item.price.toFixed(2)}</span>
                        <button
                          onClick={() => {
                            const newPrice = prompt(`Enter new base price for ${item.name}:`, item.price.toString());
                            if (newPrice && !isNaN(Number(newPrice)) && Number(newPrice) > 0) {
                              updateItemPrice(item.id, Number(newPrice));
                              showToast(`Price updated for ${item.name}`, 'success');
                            }
                          }}
                          className="p-0.5 bg-zinc-800 hover:bg-gold-500 hover:text-zinc-950 text-zinc-400 rounded cursor-pointer"
                          title="Quick Price change"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* VAT Rate changer */}
                    <td className="p-4 text-center font-mono">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{item.vat}%</span>
                        <button
                          onClick={() => {
                            const newVat = prompt(`Enter new VAT% rate for ${item.name}:`, item.vat.toString());
                            if (newVat && !isNaN(Number(newVat)) && Number(newVat) >= 0) {
                              updateItemVat(item.id, Number(newVat));
                              showToast(`VAT rate updated for ${item.name}`, 'success');
                            }
                          }}
                          className="p-0.5 bg-zinc-800 hover:bg-gold-500 hover:text-zinc-950 text-zinc-400 rounded cursor-pointer"
                        >
                          <Sliders className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Discount rate changer */}
                    <td className="p-4 text-center font-mono text-rose-400">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={item.discount > 0 ? 'font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20' : ''}>
                          {item.discount}%
                        </span>
                        <button
                          onClick={() => {
                            const newDiscount = prompt(`Enter new discount% rate for ${item.name}:`, item.discount.toString());
                            if (newDiscount && !isNaN(Number(newDiscount)) && Number(newDiscount) >= 0 && Number(newDiscount) <= 100) {
                              updateItemDiscount(item.id, Number(newDiscount));
                              showToast(`Discount percentage updated for ${item.name}`, 'success');
                            }
                          }}
                          className="p-0.5 bg-zinc-800 hover:bg-rose-500 hover:text-white text-zinc-400 rounded cursor-pointer"
                        >
                          <Sliders className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Availability toggle switch */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          toggleItemAvailability(item.id);
                          showToast(`Availability changed for ${item.name}`, 'info');
                        }}
                        className={`py-1 px-2.5 rounded-full font-mono text-[10px] font-bold cursor-pointer border ${
                          item.available 
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                            : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                        }`}
                      >
                        {item.available ? '● Active' : '● Disabled'}
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 bg-zinc-800 hover:bg-gold-500 hover:text-zinc-950 text-zinc-300 rounded-lg cursor-pointer"
                          title="Full Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(item.id)}
                          className="p-1.5 bg-zinc-800 hover:bg-rose-500 hover:text-white text-zinc-500 rounded-lg cursor-pointer"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Gourmet Add/Edit Item modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-4xl p-6 rounded-2xl shadow-2xl border-gold-500/30 max-h-[95vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-gold-400 text-lg">
                  {editingItem ? `Edit Delicacy - ${editingItem.name}` : 'Add New Gourmet Delicacy'}
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                  Excel & Sheets Friendly
                </span>
              </div>
              <button onClick={() => setShowItemModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Excel spreadsheet interactive row */}
            <div className="bg-zinc-950/60 border border-emerald-500/20 p-4 rounded-xl space-y-3 mb-5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">Excel Instant-Paste Row Grid</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Copy a row from Excel/Sheets & Paste (Ctrl+V) anywhere here!
                </span>
              </div>

              <div className="overflow-x-auto pb-1 scrollbar-thin">
                <table className="w-full border-collapse border border-zinc-850 text-left min-w-[750px]">
                  <thead>
                    <tr className="bg-zinc-900/80 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">
                      <th className="border border-zinc-850 px-2 py-1.5 text-center bg-zinc-950 w-7">Row</th>
                      <th className="border border-zinc-850 px-2 py-1.5">S/N <span className="text-zinc-600">(Col A)</span></th>
                      <th className="border border-zinc-850 px-2 py-1.5">Dish Name <span className="text-zinc-600">(Col B)</span></th>
                      <th className="border border-zinc-850 px-2 py-1.5">Category <span className="text-zinc-600">(Col C)</span></th>
                      <th className="border border-zinc-850 px-2 py-1.5">Description <span className="text-zinc-600">(Col D)</span></th>
                      <th className="border border-zinc-850 px-2 py-1.5 w-20">Price <span className="text-zinc-600">(Col E)</span></th>
                      <th className="border border-zinc-850 px-2 py-1.5 w-14">VAT % <span className="text-zinc-600">(Col F)</span></th>
                      <th className="border border-zinc-850 px-2 py-1.5 w-14">Disc % <span className="text-zinc-600">(Col G)</span></th>
                      <th className="border border-zinc-850 px-2 py-1.5">Image URL <span className="text-zinc-600">(Col H)</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-zinc-900/30">
                      <td className="border border-zinc-850 text-center text-[10px] font-mono text-zinc-600 bg-zinc-950/40 select-none">1</td>
                      
                      {/* S/N */}
                      <td className="border border-zinc-850 p-0">
                        <input
                          type="text"
                          value={serialNumber}
                          onChange={(e) => setSerialNumber(e.target.value)}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\t') || txt.includes(',')) {
                              e.preventDefault();
                              handleExcelString(txt);
                            }
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-xs text-zinc-100 font-mono focus:bg-emerald-950/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-0"
                          placeholder="S/N"
                        />
                      </td>

                      {/* Name */}
                      <td className="border border-zinc-850 p-0">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\t') || txt.includes(',')) {
                              e.preventDefault();
                              handleExcelString(txt);
                            }
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-xs text-zinc-100 font-serif focus:bg-emerald-950/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-0"
                          placeholder="Dish Name"
                        />
                      </td>

                      {/* Category */}
                      <td className="border border-zinc-850 p-0">
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\t') || txt.includes(',')) {
                              e.preventDefault();
                              handleExcelString(txt);
                            }
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-xs text-zinc-100 focus:bg-emerald-950/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-0"
                          placeholder="Category"
                        />
                      </td>

                      {/* Description */}
                      <td className="border border-zinc-850 p-0">
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\t') || txt.includes(',')) {
                              e.preventDefault();
                              handleExcelString(txt);
                            }
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-xs text-zinc-100 focus:bg-emerald-950/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-0 truncate"
                          placeholder="Recipe..."
                        />
                      </td>

                      {/* Price */}
                      <td className="border border-zinc-850 p-0">
                        <input
                          type="number"
                          step="0.01"
                          value={price || ''}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\t') || txt.includes(',')) {
                              e.preventDefault();
                              handleExcelString(txt);
                            }
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-xs text-zinc-100 font-mono focus:bg-emerald-950/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-0"
                          placeholder="0.00"
                        />
                      </td>

                      {/* VAT */}
                      <td className="border border-zinc-850 p-0">
                        <input
                          type="number"
                          step="any"
                          value={vat || ''}
                          onChange={(e) => setVat(Number(e.target.value))}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\t') || txt.includes(',')) {
                              e.preventDefault();
                              handleExcelString(txt);
                            }
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-xs text-zinc-100 font-mono focus:bg-emerald-950/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-0"
                          placeholder="15"
                        />
                      </td>

                      {/* Discount */}
                      <td className="border border-zinc-850 p-0">
                        <input
                          type="number"
                          step="any"
                          value={discount || ''}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\t') || txt.includes(',')) {
                              e.preventDefault();
                              handleExcelString(txt);
                            }
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-xs text-zinc-100 font-mono focus:bg-emerald-950/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-0"
                          placeholder="0"
                        />
                      </td>

                      {/* Image URL */}
                      <td className="border border-zinc-850 p-0">
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\t') || txt.includes(',')) {
                              e.preventDefault();
                              handleExcelString(txt);
                            }
                          }}
                          className="w-full bg-transparent px-2 py-1.5 text-xs text-zinc-100 font-mono focus:bg-emerald-950/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 border-0 truncate"
                          placeholder="https://..."
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Master paste input clipboard box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="📋 Click here & Paste (Ctrl+V) a full copied row from Excel or Google Sheets to automatically fill all cells!"
                  onPaste={(e) => {
                    const txt = e.clipboardData.getData('text');
                    handleExcelString(txt);
                  }}
                  className="w-full bg-zinc-900/90 border border-emerald-500/30 rounded-lg py-2.5 px-3 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono text-center cursor-pointer hover:bg-zinc-900"
                />
              </div>
            </div>

            {/* Standard full form view */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-mono block">Dish Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wagyu Ribeye Steak"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500"
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-mono block">Serial Number (S/N)</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-009"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                {/* Typeable Category */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-mono block">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Signature Steaks"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500"
                  />
                  {/* Quick Preset categories */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Signature Steaks'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`text-[8px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                          category.toLowerCase() === cat.toLowerCase()
                            ? 'bg-gold-500/10 text-gold-400 border-gold-500/30 font-bold'
                            : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-mono block">Recipe Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the gourmet dish preparation and ingredients meticulous detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Price */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-mono block">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                {/* VAT */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-mono block">VAT Rate (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    required
                    value={vat}
                    onChange={(e) => setVat(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>

                {/* Discount */}
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-mono block">Discount (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    required
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500 font-mono"
                  />
                </div>
              </div>

              {/* Food Image Selector with presets in unified dialog layout */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs text-zinc-400 font-mono block">Dish Image (Absolute URL or Preset below)</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-gold-500/10 rounded-lg py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-gold-500 font-mono mb-2"
                />
                
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500 font-mono block">Select a Luxury Preset Image:</span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 border border-zinc-850 p-2 rounded-lg bg-zinc-950/40">
                    {LUXURY_PRESET_IMAGES.map((preset, index) => (
                      <button 
                        key={index} 
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`relative h-12 rounded-lg overflow-hidden cursor-pointer border text-left transition-all ${
                          imageUrl === preset.url ? 'border-gold-500 ring-2 ring-gold-500/20' : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                        title={preset.label}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-0.5 text-center">
                          <span className="text-[7px] text-zinc-300 font-sans truncate block">{preset.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-zinc-800 pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-sans font-bold py-2.5 rounded-xl hover:from-gold-400 hover:to-gold-500 transition-all cursor-pointer text-xs uppercase tracking-wider"
                >
                  {editingItem ? 'Save Delicacy Changes' : 'Publish Delicacy'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl shadow-2xl border-red-500/30 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border border-red-500/20 bg-zinc-900 flex items-center justify-center text-red-500 mx-auto animate-pulse">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-semibold text-zinc-100">Delete Menu Item</h3>
              <p className="text-xs text-zinc-500">Are you absolutely sure you want to remove this dish from the menu? This cannot be undone.</p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleExecuteDelete}
                className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg cursor-pointer hover:bg-red-500 text-xs"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-750 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border-gold-500/30">
            <div className="text-center mb-5">
              <div className="w-11 h-11 rounded-full border border-gold-500/20 bg-zinc-900 flex items-center justify-center text-gold-400 mx-auto mb-2">
                <Key className="w-5 h-5 text-gold-400" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-zinc-50">Change Superadmin Password</h3>
              <p className="text-xs text-zinc-500 mt-1">Updating this changes the entry key specifically for the Superadmin portal</p>
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
