/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MenuItem, Order, OrderType } from '../types';
import { 
  ShoppingBag, ShoppingCart, Mic, MicOff, Camera, Pencil, ArrowLeft, Plus, Minus, 
  Trash2, Sparkles, Check, ChevronRight, Eye, RefreshCw, X, Clock, Utensils, Phone 
} from 'lucide-react';
import { showToast } from './Notification';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerDashboardProps {
  onBackToLanding: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onBackToLanding }) => {
  const {
    menuItems,
    orders,
    cart,
    currentTable,
    specialNotes,
    orderType,
    setTableNumber,
    setSpecialNotes,
    setOrderType,
    addToCart,
    updateCartQty,
    removeFromCart,
    placeOrder,
    parseVoiceWithGemini
  } = useApp();

  const handleAddToCart = (item: MenuItem, qty: number) => {
    addToCart(item, qty);
    setTimeout(() => {
      const element = document.getElementById('your-cart-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showTableModal, setShowTableModal] = useState<boolean>(false);
  const [showNotesModal, setShowNotesModal] = useState<boolean>(false);
  const [isNotesForCheckout, setIsNotesForCheckout] = useState<boolean>(false);
  const [showMenuSummary, setShowMenuSummary] = useState<boolean>(false);
  const [summarySearchQuery, setSummarySearchQuery] = useState<string>('');
  
  // Voice Order States
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceLang, setVoiceLang] = useState<'bn-BD' | 'en-US'>('en-US');
  const [isVoiceProcessing, setIsVoiceProcessing] = useState<boolean>(false);
  const [isListeningNotes, setIsListeningNotes] = useState<boolean>(false);
  const notesRecognitionRef = useRef<any>(null);

  // Cart / Checkout States
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutMode, setCheckoutMode] = useState<'selfie' | 'signature'>('signature');
  const [selfieCaptured, setSelfieCaptured] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [contactNumber, setContactNumber] = useState<string>('');
  
  // Ref Elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const orderTrackingRef = useRef<HTMLDivElement | null>(null);
  
  // Drawing States for Seat Signature
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Filter Categories
  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  // Clear the table number and prompt for table number immediately on mount every single time they enter the customer lounge
  useEffect(() => {
    setTableNumber('');
    setShowTableModal(true);
  }, []);

  // Clean table modal state
  const handleTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTable.trim()) {
      showToast('Table number is required.', 'error');
      return;
    }
    setShowTableModal(false);
    showToast(`Table ${currentTable} set! Explore our menu.`, 'success');
  };

  const handleNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowNotesModal(false);
    if (isNotesForCheckout) {
      showToast('Special instructions added to order.', 'success');
      setShowCheckoutModal(true);
    } else {
      showToast('Preferences saved. Explore our menu!', 'success');
    }
  };

  // Web Speech API Voice Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice Recognition is not supported in this browser. Try Google Chrome.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = voiceLang;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceTranscript('Listening...');
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error', e);
      setIsListening(false);
      
      let errorMsg = 'Error capturing audio. Please try again.';
      if (e.error === 'not-allowed') {
        errorMsg = 'Microphone permission denied! Click "Open in New Tab" in the top-right corner of the editor to bypass iframe restrictions.';
      } else if (e.error === 'no-speech') {
        errorMsg = 'No speech detected. Please speak clearly into your microphone.';
      } else if (e.error === 'audio-capture') {
        errorMsg = 'No microphone device found on your system.';
      } else if (e.error) {
        errorMsg = `Speech capture error: ${e.error}. Try opening the app in a new tab.`;
      }
      
      setVoiceTranscript(errorMsg);
      showToast(errorMsg, 'error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      const transcriptText = event.results[0][0].transcript;
      setVoiceTranscript(transcriptText);
      
      // Process voice transcript with Gemini
      setIsVoiceProcessing(true);
      showToast('Processing voice command with Gemini AI...', 'info');
      
      const result = await parseVoiceWithGemini(transcriptText);
      setIsVoiceProcessing(false);

      if (result.success) {
        if (result.itemsAdded > 0) {
          showToast(`Successfully added ${result.itemsAdded} items to cart!`, 'success');
        } else {
          showToast('No matching menu items found in transcript.', 'info');
        }
        
        if (result.tableDetected) {
          showToast(`Detected table number: ${result.tableDetected}`, 'success');
        }
        if (result.noteDetected) {
          showToast(`Added special instructions: "${result.noteDetected}"`, 'success');
        }
        
        // Wait briefly then close modal
        setTimeout(() => setShowVoiceModal(false), 2000);
      } else {
        showToast('Failed to parse order with Gemini.', 'error');
      }
    };

    recognition.start();
  };

  const toggleNotesSpeechRecognition = () => {
    if (isListeningNotes && notesRecognitionRef.current) {
      notesRecognitionRef.current.stop();
      setIsListeningNotes(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice Recognition is not supported in this browser. Try Google Chrome.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = voiceLang;
    notesRecognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListeningNotes(true);
      showToast('Listening... Speak your instructions now!', 'info');
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error in Notes modal', e);
      setIsListeningNotes(false);
      
      let errorMsg = 'Error capturing voice instructions. Please try again.';
      if (e.error === 'not-allowed') {
        errorMsg = 'Microphone permission denied! Click "Open in New Tab" in the top-right corner of the editor to bypass iframe restrictions.';
      } else if (e.error === 'no-speech') {
        errorMsg = 'No speech detected. Please speak clearly into your microphone.';
      } else if (e.error === 'audio-capture') {
        errorMsg = 'No microphone device found on your system.';
      } else if (e.error) {
        errorMsg = `Speech capture error: ${e.error}. Try opening the app in a new tab.`;
      }
      
      showToast(errorMsg, 'error');
    };

    recognition.onend = () => {
      setIsListeningNotes(false);
    };

    recognition.onresult = (event: any) => {
      const transcriptText = event.results[0][0].transcript;
      if (transcriptText) {
        setSpecialNotes((prev: string) => prev ? `${prev} ${transcriptText}` : transcriptText);
        showToast(`Voice input added!`, 'success');
      }
    };

    recognition.start();
  };

  // Camera Selfie Capture
  const startCamera = async () => {
    setIsCameraActive(true);
    setSelfieCaptured(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 225 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error starting camera', err);
      showToast('Could not access camera. Please draw signature instead.', 'error');
      setCheckoutMode('signature');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSelfieCaptured(dataUrl);
        stopCamera();
        showToast('Selfie captured successfully!', 'success');
      }
    }
  };

  // Signature Pad Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#dca215'; // Gold accent stroke color

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Submit Final Order
  const handleConfirmOrder = () => {
    const trimmedContact = contactNumber.trim();
    if (trimmedContact && trimmedContact.length < 5) {
      showToast('Please enter a valid contact number (at least 5 digits) or leave it empty.', 'error');
      return;
    }

    const placed = placeOrder(undefined, undefined, trimmedContact || undefined);
    if (placed) {
      showToast('Order placed successfully! Pending Manager Approval.', 'success');
      setShowCheckoutModal(false);
      setContactNumber('');
      
      // Auto-scroll screen to order status section
      setTimeout(() => {
        orderTrackingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    } else {
      showToast('Failed to place order. Check cart and table selection.', 'error');
    }
  };

  // Calculate pricing
  const calculateCartSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  };

  const calculateCartTotalDiscount = () => {
    return cart.reduce((sum, item) => {
      const discountAmount = (item.menuItem.price * (item.menuItem.discount / 100)) * item.quantity;
      return sum + discountAmount;
    }, 0);
  };

  const calculateCartTotalVat = () => {
    return cart.reduce((sum, item) => {
      const discounted = item.menuItem.price * (1 - item.menuItem.discount / 100);
      const vatAmount = (discounted * (item.menuItem.vat / 100)) * item.quantity;
      return sum + vatAmount;
    }, 0);
  };

  const calculateCartTotal = () => {
    return calculateCartSubtotal() - calculateCartTotalDiscount() + calculateCartTotalVat();
  };

  // Group menu items by category for the Brief Menu Summary
  const getGroupedSummaryItems = () => {
    const query = summarySearchQuery.toLowerCase().trim();
    const filtered = menuItems.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.category.toLowerCase().includes(query) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(query))
    );

    // Group by category
    const grouped: { [category: string]: MenuItem[] } = {};
    filtered.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  };

  // Filter menu items
  const filteredMenuItems = activeCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  // Active orders for this table only
  const activeTableOrders = orders.filter(o => o.tableNumber === currentTable && o.status !== 'completed');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row pb-12">
      
      {/* Sidebar Cart / Ordering Settings Summary (Mobile drawer trigger or fixed left col on Desktop) */}
      <div className="w-full md:w-80 flex-shrink-0 bg-zinc-900/60 border-b md:border-b-0 md:border-r border-gold-500/10 p-6 flex flex-col justify-between">
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-end border-b border-gold-500/5 pb-4">
            <span className="text-[10px] text-gold-400 font-mono tracking-widest uppercase">
              Table Mode
            </span>
          </div>

          {/* Table Selector & Notes Controls */}
          <div className="glass-card p-4 rounded-xl border-gold-500/20 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400 font-mono">Service Details</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsNotesForCheckout(false);
                    setShowNotesModal(true);
                  }}
                  className="text-xs text-zinc-400 hover:text-gold-400 font-sans cursor-pointer py-0.5"
                >
                  Notes
                </button>
                <span className="text-zinc-700 text-xs">|</span>
                <button 
                  onClick={() => setShowTableModal(true)}
                  className="text-xs text-gold-400 hover:text-gold-300 font-sans cursor-pointer py-0.5"
                >
                  Change
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-xs text-zinc-400">Mode</span>
                <span className="text-xs font-semibold capitalize bg-gold-500/10 text-gold-400 border border-gold-500/20 px-2 py-0.5 rounded-full">
                  {orderType === 'dine-in' ? 'Dine In' : 'Take Away'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-xs text-zinc-400">Table Number</span>
                <span className="text-sm font-bold text-gold-400 font-mono">
                  {currentTable ? `Table ${currentTable}` : 'Not set'}
                </span>
              </div>

              {specialNotes && (
                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-mono block">Special Instruction</span>
                  <p className="text-xs text-zinc-300 truncate mt-0.5 italic">"{specialNotes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Checkout Shopping Cart Section */}
          <div id="your-cart-section" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-semibold text-zinc-200 tracking-wide flex items-center gap-2 text-sm">
                <ShoppingCart className="w-4 h-4 text-gold-400" />
                Your Cart
              </h3>
              <span className="text-[11px] bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full font-sans">
                <span className="font-extrabold text-gold-400 font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span> items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-xl">
                <ShoppingCart className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Your cart is empty.</p>
                <p className="text-[10px] text-zinc-600 mt-1">Select delicacies from the menu.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] md:max-h-[52vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gold-500/20 scrollbar-track-zinc-900">
                {cart.map(item => (
                  <div key={item.menuItem.id} className="flex gap-2.5 p-2 bg-zinc-950/40 border border-zinc-800/40 rounded-lg">
                    <img 
                      src={item.menuItem.image} 
                      alt={item.menuItem.name}
                      className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-200 truncate leading-tight">
                        {item.menuItem.name}
                      </div>
                      <div className="text-[10px] text-gold-400 font-mono mt-0.5">
                        {(item.menuItem.price * (1 - item.menuItem.discount / 100)).toFixed(2)}
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-zinc-800/20">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => updateCartQty(item.menuItem.id, item.quantity - 1)}
                            className="p-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                updateCartQty(item.menuItem.id, val);
                              }
                            }}
                            className="w-11 text-center bg-zinc-900 border border-zinc-800/80 rounded py-0.5 px-0.5 text-[10px] font-bold font-mono text-zinc-100 focus:outline-none focus:border-gold-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button 
                            onClick={() => updateCartQty(item.menuItem.id, item.quantity + 1)}
                            className="p-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.menuItem.id)}
                          className="text-zinc-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="bg-zinc-950/40 border border-zinc-800/60 p-3 rounded-lg text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal:</span>
                  <span className="text-zinc-300">{calculateCartSubtotal().toFixed(2)}</span>
                </div>
                {calculateCartTotalDiscount() > 0 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Discounts:</span>
                    <span className="text-emerald-500">-{calculateCartTotalDiscount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">VAT (avg 13%):</span>
                  <span className="text-zinc-300">+{calculateCartTotalVat().toFixed(2)}</span>
                </div>
                <div className="border-t border-zinc-800/40 my-1 pt-1 flex justify-between font-bold text-sm text-gold-400">
                  <span>Total:</span>
                  <span>{calculateCartTotal().toFixed(2)}</span>
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsNotesForCheckout(true);
                      setShowNotesModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-sans font-semibold py-2 px-4 rounded-lg hover:from-gold-400 hover:to-gold-500 shadow-md transition-all cursor-pointer text-center text-xs"
                  >
                    Confirm Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Brand Sign Off */}
        <div className="pt-8 text-center text-[10px] text-zinc-600 font-mono hidden md:block">
          Midas Premium Restaurant SaaS
        </div>

      </div>

      {/* Main Delicacies Explorer Grid */}
      <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        
        {/* Top Header Controls with Voice option */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gold-500/5 pb-6">
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              Culinary Delicacies
              <Sparkles className="w-5 h-5 text-gold-400 animate-pulse" />
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Select gourmet delicacies, crafted meticulously in-house daily.</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setSummarySearchQuery('');
                setShowMenuSummary(true);
              }}
              className="inline-flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 hover:border-gold-500/40 text-zinc-300 hover:text-gold-400 font-sans text-xs py-2 px-4 rounded-full shadow-lg transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-gold-400" />
              Brief Menu Summary
            </button>
            <button
              onClick={() => {
                setVoiceTranscript('');
                setShowVoiceModal(true);
              }}
              className="inline-flex items-center gap-2 bg-gold-950/20 border border-gold-500/30 hover:border-gold-500 text-gold-400 font-sans text-xs py-2 px-4 rounded-full shadow-lg transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4 text-gold-400" />
              Voice Order / ভয়েস অর্ডার
            </button>
          </div>
        </div>

        {/* Menu Categories Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-all whitespace-nowrap ${
                activeCategory === cat 
                  ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 border-gold-400 shadow-md font-semibold' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Food Items Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenuItems.map(item => (
            <div 
              key={item.id} 
              className={`glass-card rounded-xl overflow-hidden shadow-xl flex flex-col justify-between group transition-all duration-300 relative ${
                !item.available ? 'opacity-50' : 'hover:border-gold-500/20'
              }`}
            >
              
              {/* Image & Price Overlay */}
              <div className="relative h-44 overflow-hidden bg-zinc-900 flex-shrink-0">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                
                {/* Discount Badge */}
                {item.available && item.discount > 0 && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold font-sans tracking-wide py-1 px-2.5 rounded-full shadow-lg">
                    {item.discount}% OFF
                  </span>
                )}

                {/* Pricing Tags */}
                <div className="absolute bottom-3 right-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-gold-500/20 flex items-center gap-1.5">
                  {item.discount > 0 ? (
                    <>
                      <span className="text-[10px] text-zinc-500 line-through font-mono">
                        {item.price.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-gold-400 font-mono">
                        {(item.price * (1 - item.discount / 100)).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-gold-400 font-mono">
                      {item.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Description Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-serif font-semibold text-zinc-100 text-base leading-tight group-hover:text-gold-400 transition-colors">
                          {item.name}
                        </h4>
                        {item.serialNumber && (
                          <span className="text-[9px] font-mono font-bold bg-gold-500/10 text-gold-400 px-1.5 py-0.5 rounded border border-gold-500/20">
                            {item.serialNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-sans">
                      VAT {item.vat}%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal mt-2 text-justify">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-900 mt-4 flex items-center justify-between">
                  <span className={`text-[10px] font-mono tracking-wide ${
                    item.available ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {item.available ? '● Available' : '● Sold Out'}
                  </span>
                  
                  {item.available ? (
                    <button
                      onClick={() => handleAddToCart(item, 1)}
                      className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-gold-500 hover:text-zinc-950 text-gold-400 font-sans text-xs py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-zinc-900 text-zinc-600 font-sans text-xs py-1.5 px-3 rounded-lg border border-zinc-800 cursor-not-allowed"
                    >
                      Sold Out
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Real-time Order Tracking Panel */}
        <div ref={orderTrackingRef} className="border-t border-gold-500/5 pt-12">
          <div className="text-center md:text-left mb-6">
            <h3 className="font-serif text-2xl font-bold text-zinc-100 tracking-wide flex items-center justify-center md:justify-start gap-2">
              <Clock className="w-5 h-5 text-gold-400" />
              Track Table Orders
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Real-time status updates for orders at Table {currentTable || 'None'}.</p>
          </div>

          {!currentTable ? (
            <div className="text-center py-10 bg-zinc-900/20 border border-zinc-800 rounded-xl max-w-xl mx-auto">
              <ShoppingCart className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">Please enter a table number to track existing orders.</p>
            </div>
          ) : activeTableOrders.length === 0 ? (
            <div className="text-center py-10 bg-zinc-900/20 border border-zinc-800 rounded-xl max-w-xl mx-auto">
              <ShoppingCart className="w-10 h-10 text-zinc-700 mx-auto mb-2 animate-pulse" />
              <p className="text-xs text-zinc-400">No active orders found for Table {currentTable} right now.</p>
              <p className="text-[10px] text-zinc-600 mt-1">Add items to cart and confirm to submit an order.</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {activeTableOrders.map(order => (
                <div key={order.id} className="glass-card rounded-xl border-gold-500/10 p-5 shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gold-400 font-mono">{order.id}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
                          Table {order.tableNumber}
                        </span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded capitalize font-mono">
                          {order.orderType}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Submitted at {order.createdAtTime}</p>
                    </div>
                    
                    {/* Status badge */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full font-mono uppercase ${
                        order.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        order.status === 'cooking' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
                        order.status === 'ready' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {order.status === 'pending' ? 'Pending Approval' :
                         order.status === 'cooking' ? 'Cooking in Kitchen' :
                         order.status === 'ready' ? 'Ready for Pickup' :
                         `Rejected: ${order.rejectReason || 'No reason specified'}`}
                      </span>
                    </div>
                  </div>

                  {/* Item List Summary */}
                  <div className="text-xs space-y-1">
                    <span className="text-zinc-500 font-mono">Order Items:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-950/40 p-2 rounded border border-zinc-900">
                          <span className="text-zinc-300 truncate pr-2 font-medium">{item.name}</span>
                          <span className="text-gold-400 font-mono font-bold">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Status Timeline */}
                  {order.status !== 'rejected' && (
                    <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono">
                      
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold mb-1 border ${
                          ['pending', 'cooking', 'ready', 'completed'].includes(order.status)
                            ? 'bg-gold-500 text-zinc-950 border-gold-400'
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                        }`}>
                          1
                        </div>
                        <span className="text-zinc-400 font-medium">Pending</span>
                      </div>

                      <div className={`h-0.5 flex-1 ${
                        ['cooking', 'ready', 'completed'].includes(order.status) ? 'bg-gold-500' : 'bg-zinc-800'
                      }`}></div>

                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold mb-1 border ${
                          ['cooking', 'ready', 'completed'].includes(order.status)
                            ? 'bg-gold-500 text-zinc-950 border-gold-400 animate-pulse'
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                        }`}>
                          2
                        </div>
                        <span className="text-zinc-400 font-medium">Cooking</span>
                      </div>

                      <div className={`h-0.5 flex-1 ${
                        ['ready', 'completed'].includes(order.status) ? 'bg-gold-500' : 'bg-zinc-800'
                      }`}></div>

                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold mb-1 border ${
                          ['ready', 'completed'].includes(order.status)
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                        }`}>
                          3
                        </div>
                        <span className="text-zinc-400 font-medium">Ready</span>
                      </div>

                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Slowly Blinking Table Mandatory Asking Dialog Box */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border-2 border-gold-500/80 rounded-2xl p-8 shadow-2xl text-center space-y-6 animate-blink-slow">
            
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-full border border-gold-500/30 bg-zinc-900 flex items-center justify-center text-gold-400 mx-auto mb-2 shadow-lg">
                <Utensils className="w-6 h-6 text-gold-400" />
              </div>
              <h2 className="font-serif text-3xl font-bold tracking-wide text-zinc-100 leading-tight">
                Welcome to L'Aura Midas
              </h2>
              <p className="text-xs text-gold-400/70 font-mono uppercase tracking-widest">
                Gourmet Dining Setup
              </p>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-normal pt-2">
                Table selection is mandatory for ordering. Please choose your table number to unlock our premium delicacies.
              </p>
            </div>

            <form onSubmit={handleTableSubmit} className="space-y-4 max-w-md mx-auto">
              {/* Dine-In / Takeaway Select */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setOrderType('dine-in')}
                  className={`py-3 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer border ${
                    orderType === 'dine-in' 
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 border-gold-400 font-semibold shadow-lg' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Dine-In
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`py-3 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer border ${
                    orderType === 'takeaway' 
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 border-gold-400 font-semibold shadow-lg' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Takeaway
                </button>
              </div>

              {/* Table Number Input */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 font-mono block text-left">Table Number (Mandatory)</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Table Number/Name"
                  value={currentTable}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-gold-500/20 rounded-xl py-3.5 px-4 text-center text-lg text-zinc-100 placeholder-zinc-700 font-mono font-bold focus:outline-none focus:border-gold-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-sans font-bold py-3 px-6 rounded-xl hover:from-gold-400 hover:to-gold-500 shadow-xl shadow-gold-500/5 cursor-pointer mt-4"
              >
                Unlock Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Optional Special Notes Dialog Box */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-950 border border-gold-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-6">
            <div className="space-y-1">
              <div className="w-12 h-12 rounded-full border border-gold-500/20 bg-zinc-900 flex items-center justify-center text-gold-400 mx-auto mb-2">
                <Sparkles className="w-5 h-5 text-gold-400" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-zinc-50 tracking-wide">
                Special Instructions?
              </h3>
              <p className="text-xs text-zinc-400 font-sans uppercase tracking-widest">
                Optional Customization
              </p>
              <p className="text-xs text-zinc-500 pt-1 leading-normal max-w-sm mx-auto">
                Do you have any culinary preferences? Spicy level, allergies, or sitting instructions?
              </p>
            </div>

            <form onSubmit={handleNotesSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  rows={4}
                  placeholder="e.g. Extra cheese, make it medium spicy, no mushrooms, sitting by window..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-gold-500/10 rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-gold-500/40 resize-none"
                />
                <button
                  type="button"
                  onClick={toggleNotesSpeechRecognition}
                  className={`absolute right-3 bottom-3 p-2 rounded-full border transition-all duration-300 ${
                    isListeningNotes
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-gold-400 hover:border-gold-500/40'
                  }`}
                  title="Speak instructions (Voice to Text)"
                >
                  {isListeningNotes ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Language selection & Live feedback */}
              <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isListeningNotes ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span>{isListeningNotes ? "Listening... Speak now" : "Tap mic to speak instructions"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Language:</span>
                  <select
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value as 'bn-BD' | 'en-US')}
                    className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-300 focus:outline-none text-[10px]"
                  >
                    <option value="en-US">English</option>
                    <option value="bn-BD">বাংলা (Bangla)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-sans font-bold py-2.5 rounded-xl hover:from-gold-400 hover:to-gold-500 cursor-pointer"
                >
                  {isNotesForCheckout ? 'Save & Proceed' : 'Save Preferences'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotesModal(false);
                    if (isNotesForCheckout) {
                      setShowCheckoutModal(true);
                    }
                  }}
                  className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:text-zinc-200 cursor-pointer text-xs"
                >
                  {isNotesForCheckout ? 'Skip & Continue' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Assistant Speech Recognition Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border-gold-500/30 text-center space-y-6">
            
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-serif font-semibold text-gold-400 text-base">Voice Order Assistant</span>
              <button onClick={() => {
                setIsListening(false);
                setShowVoiceModal(false);
              }} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex justify-center gap-2.5">
              <button
                onClick={() => setVoiceLang('en-US')}
                className={`py-1.5 px-3.5 rounded-full text-xs font-medium cursor-pointer border ${
                  voiceLang === 'en-US' 
                    ? 'bg-gold-500/15 border-gold-500 text-gold-400 font-semibold' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setVoiceLang('bn-BD')}
                className={`py-1.5 px-3.5 rounded-full text-xs font-medium cursor-pointer border ${
                  voiceLang === 'bn-BD' 
                    ? 'bg-gold-500/15 border-gold-500 text-gold-400 font-semibold' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                বাংলা (Bengali)
              </button>
            </div>

            {/* Microphone Circle Visualizer */}
            <div className="py-6 flex flex-col items-center">
              <button
                onClick={startSpeechRecognition}
                disabled={isListening || isVoiceProcessing}
                className={`w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer ${
                  isListening 
                    ? 'bg-red-500 border-red-400 text-white animate-pulse shadow-red-500/20' 
                    : isVoiceProcessing
                    ? 'bg-zinc-800 border-gold-500 text-gold-400 cursor-not-allowed'
                    : 'bg-gold-950/40 border-gold-500/50 text-gold-400 hover:border-gold-400 hover:bg-gold-950/70 shadow-gold-500/5'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : isVoiceProcessing ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
              
              <div className="mt-4">
                <span className="text-xs text-zinc-500 font-mono">
                  {isListening ? 'Speak your order clearly now...' : isVoiceProcessing ? 'AI Processing...' : 'Click microphone to talk'}
                </span>
              </div>
            </div>

            {/* Transcript Preview Card */}
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl min-h-[90px] flex items-center justify-center">
              {voiceTranscript ? (
                <p className="text-sm font-sans font-medium text-zinc-200 italic leading-relaxed">
                  "{voiceTranscript}"
                </p>
              ) : (
                <div className="text-xs text-zinc-600 font-sans leading-normal">
                  "I want to order Wagyu steak and one chocolate dome on table 4 with no mushrooms please."<br />
                  <span className="text-[11px] block mt-1">বা বলুন "আমার ৪ নম্বর টেবিলে দুটি বিফ বার্গার দিন"</span>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setIsListening(false);
                  setShowVoiceModal(false);
                }}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-sans cursor-pointer transition-colors"
              >
                Close Voice Portal
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Contact Number Verification Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gold-500/30 flex flex-col space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-serif font-semibold text-gold-400 text-lg">Contact Verification</span>
              <button onClick={() => {
                setShowCheckoutModal(false);
              }} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab select between Camera Selfie or Draw Signature */}
            <div className="space-y-4 py-2">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full border border-gold-500/20 bg-zinc-900 flex items-center justify-center text-gold-400 mx-auto">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-zinc-50">Enter Your Contact Number (Optional)</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-normal">
                  To ensure smooth food delivery coordinates and table seat alignment, you may provide your contact details (optional) before order dispatch.
                </p>
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <label className="text-[10px] text-zinc-500 font-mono block uppercase tracking-wider text-left">
                  Contact Number (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 text-xs font-mono border-r border-zinc-800/60 pr-2">
                    +880
                  </div>
                  <input
                    type="tel"
                    placeholder="e.g. 1712345678"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-gold-500/50 rounded-xl pl-16 pr-4 py-3 text-zinc-100 placeholder-zinc-700 font-mono text-sm outline-none transition-colors"
                    value={contactNumber}
                    onChange={(e) => {
                      // Only allow numeric input
                      const val = e.target.value.replace(/\D/g, '');
                      setContactNumber(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmOrder();
                    }}
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-zinc-800 pt-4 flex gap-3">
              <button
                onClick={handleConfirmOrder}
                className="flex-1 bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-sans font-bold py-2.5 rounded-xl hover:from-gold-400 hover:to-gold-500 shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <Check className="w-4 h-4 text-zinc-950" />
                Submit Order to Kitchen
              </button>
              
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                }}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl cursor-pointer text-sm"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Brief Menu Summary Modal */}
      {showMenuSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="glass-panel w-full max-w-4xl p-6 rounded-2xl shadow-2xl border border-gold-500/30 flex flex-col max-h-[85vh] bg-zinc-950">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div>
                <h3 className="font-serif text-2xl font-semibold text-gold-400 tracking-wide flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-gold-400" />
                  Gourmet Menu Summary
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Quickly view all items, prices, and add directly to your cart.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search dishes or categories..."
                    value={summarySearchQuery}
                    onChange={(e) => setSummarySearchQuery(e.target.value)}
                    className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-3 pr-8 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-gold-500/30"
                  />
                  {summarySearchQuery && (
                    <button
                      onClick={() => setSummarySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowMenuSummary(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-6">
              {Object.keys(getGroupedSummaryItems()).length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-sm font-sans">
                  No delicacies match your search criteria.
                </div>
              ) : (
                Object.entries(getGroupedSummaryItems()).map(([category, items]) => (
                  <div key={category} className="space-y-2.5">
                    {/* Category Label */}
                    <div className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-serif font-bold text-gold-400 tracking-wider uppercase">
                        {category}
                      </span>
                      <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    {/* Table of items inside this Category */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-900 text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
                            <th className="py-2 px-1">ID</th>
                            <th className="py-2 px-3">Name & Description</th>
                            <th className="py-2 px-3 text-center">Status</th>
                            <th className="py-2 px-3 text-right">Price</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {items.map(item => {
                            const hasDiscount = item.discount > 0;
                            const finalPrice = hasDiscount ? (item.price * (1 - item.discount / 100)) : item.price;
                            return (
                              <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors group">
                                <td className="py-3 px-1 font-mono text-[10px] text-zinc-500">
                                  {item.serialNumber || '—'}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-zinc-100 group-hover:text-gold-400 transition-colors">
                                    {item.name}
                                  </div>
                                  <div className="text-zinc-500 text-[11px] font-sans line-clamp-1 max-w-sm mt-0.5">
                                    {item.description}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                                    item.available 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    {item.available ? 'Available' : 'Sold Out'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono">
                                  {hasDiscount ? (
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-zinc-500 line-through">
                                        {item.price.toFixed(2)}
                                      </span>
                                      <span className="text-zinc-200 font-bold text-gold-400">
                                        {finalPrice.toFixed(2)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-200 font-bold">
                                      {item.price.toFixed(2)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {item.available ? (
                                    <button
                                      onClick={() => {
                                        handleAddToCart(item, 1);
                                        showToast(`Added ${item.name} to cart!`, 'success');
                                      }}
                                      className="inline-flex items-center gap-1 bg-gold-500 hover:bg-gold-400 text-zinc-950 font-sans font-bold py-1 px-2.5 rounded-lg text-[11px] transition-all cursor-pointer shadow-md shadow-gold-500/5 active:scale-95"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add
                                    </button>
                                  ) : (
                                    <span className="text-zinc-600 font-mono text-[10px]">
                                      Unavailable
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-zinc-900 pt-4 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-mono">
                Total Varieties: {menuItems.length} delicacies
              </span>
              <button
                onClick={() => setShowMenuSummary(false)}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl cursor-pointer text-xs"
              >
                Close Summary
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Bubble Brief Menu Summary Fetcher (visible when menu is unlocked) */}
      <AnimatePresence>
        {!showTableModal && currentTable.trim() !== '' && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40"
          >
            <button
              onClick={() => {
                setSummarySearchQuery('');
                setShowMenuSummary(true);
              }}
              className="group relative flex items-center gap-3 bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 text-zinc-950 font-sans font-bold py-4 px-6 md:py-4.5 md:px-8 rounded-full shadow-2xl shadow-gold-500/40 border-2 border-gold-300/40 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer text-xs md:text-sm"
              title="Brief Menu Summary"
            >
              {/* Outer pulsing shadow ring */}
              <span className="absolute -inset-1 rounded-full bg-gold-400/20 blur-sm opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none" />
              
              <Eye className="relative w-5 h-5 text-zinc-950 group-hover:rotate-12 transition-transform duration-300 stroke-[2.5]" />
              
              <span className="relative tracking-wider font-extrabold uppercase text-[11px] md:text-xs">
                Brief Menu Summary
              </span>

              <span className="relative bg-zinc-950 text-gold-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-gold-500/30">
                {menuItems.length}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
