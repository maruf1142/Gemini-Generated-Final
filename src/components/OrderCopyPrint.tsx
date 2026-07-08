/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Order } from '../types';
import { Printer, Check, X } from 'lucide-react';

interface OrderCopyPrintProps {
  order: Order;
  onClose: () => void;
  onConfirmPrint?: () => void;
}

export const OrderCopyPrint: React.FC<OrderCopyPrintProps> = ({ order, onClose, onConfirmPrint }) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateDiscounts = () => {
    return order.items.reduce((sum, item) => {
      const discountVal = (item.price * (item.discount / 100)) * item.quantity;
      return sum + discountVal;
    }, 0);
  };

  const calculateVat = () => {
    return order.items.reduce((sum, item) => {
      const discountedPrice = item.price * (1 - item.discount / 100);
      const vatVal = (discountedPrice * (item.vat / 100)) * item.quantity;
      return sum + vatVal;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscounts() + calculateVat();
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Order Copy - ${order.id}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 80mm;
                padding: 10px;
                margin: 0;
                background-color: white;
                color: black;
                font-size: 12px;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
              .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .table th, .table td { text-align: left; padding: 4px 0; font-size: 11px; }
              .right { text-align: right; }
              .header-title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
              .header-subtitle { font-size: 10px; margin-bottom: 10px; }
              .summary-row { display: flex; justify-content: space-between; padding: 2px 0; }
              .footer { margin-top: 15px; font-size: 9px; line-height: 1.4; }
              .not-invoice {
                border: 1px solid #000;
                padding: 4px;
                margin: 8px 0;
                font-size: 10px;
                font-weight: bold;
              }
              @media print {
                @page { margin: 0; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="center">
              <div class="header-title">L'AURA MIDAS</div>
              <div class="header-subtitle">Gastronomy & Lounge<br>100 Gold Sovereign Way, London<br>Tel: +44 20 7946 0958</div>
              <div class="not-invoice">CUSTOMER'S ORDER COPY<br>(NOT A TAX INVOICE)</div>
            </div>
            
            <div class="divider"></div>
            
            <div>
              <span class="bold">Order ID:</span> ${order.id}<br>
              <span class="bold">Date:</span> ${new Date(order.timestamp).toLocaleString()}<br>
              <span class="bold">Table No:</span> ${order.tableNumber}<br>
              <span class="bold">Type:</span> ${order.orderType.toUpperCase()}<br>
              ${order.specialNotes ? `<span class="bold">Notes:</span> ${order.specialNotes}<br>` : ''}
              ${order.selfieUrl ? `<span class="bold">Selfie:</span> [X] Verified Base64<br>` : ''}
              ${order.signature ? `<span class="bold">Signature:</span> [X] Customer Signed<br>` : ''}
            </div>
            
            <div class="divider"></div>
            
            <table class="table">
              <thead>
                <tr>
                  <th class="bold">Item</th>
                  <th class="bold center" style="width: 15%;">Qty</th>
                  <th class="bold right" style="width: 25%;">Price</th>
                  <th class="bold right" style="width: 25%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>
                      ${item.name}
                      ${item.discount > 0 ? `<br><small style="font-size:9px;">(Disc ${item.discount}%)</small>` : ''}
                    </td>
                    <td class="center">${item.quantity}</td>
                    <td class="right">${item.price.toFixed(2)}</td>
                    <td class="right">${((item.price * (1 - item.discount / 100)) * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="divider"></div>
            
            <div class="summary-row font-mono">
              <span>Estimated Subtotal:</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div class="summary-row font-mono text-zinc-600">
              <span>Estimated Discounts:</span>
              <span>-${calculateDiscounts().toFixed(2)}</span>
            </div>
            <div class="summary-row font-mono">
              <span>Estimated VAT (15%):</span>
              <span>+${calculateVat().toFixed(2)}</span>
            </div>
            <div class="divider" style="border-bottom-style: double;"></div>
            <div class="summary-row bold" style="font-size: 13px;">
              <span>ESTIMATED TOTAL:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="center footer">
              Please note: This is an order verification receipt. 
              The final tax invoice will be generated upon payment.
              Thank you for dining with us!<br>
              Powered by Midas SaaS Systems.
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    if (onConfirmPrint) {
      onConfirmPrint();
    }
  };

  return (
    <div id="order-copy-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-gold-500/30 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-zinc-950 border-b border-gold-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gold-400">
            <Printer className="w-5 h-5" />
            <h3 className="font-serif font-semibold text-lg tracking-wide">Customer's Order Copy</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 bg-zinc-950/50 flex justify-center">
          <div 
            ref={printAreaRef}
            className="w-[80mm] p-6 bg-white text-black shadow-lg rounded border border-zinc-200 flex flex-col font-mono text-xs leading-relaxed"
          >
            <div className="text-center">
              <h2 className="text-lg font-bold tracking-tight font-serif">L'AURA MIDAS</h2>
              <p className="text-[9px] text-zinc-500 font-sans leading-tight">
                Gastronomy & Lounge<br />
                100 Gold Sovereign Way, London<br />
                Tel: +44 20 7946 0958
              </p>
              <div className="border-t border-dashed border-zinc-400 my-2"></div>
              <div className="border border-black p-1 text-center font-bold text-[10px] my-1 uppercase">
                Customer's Order Copy<br />
                <span className="text-[8px] font-normal font-sans">(NOT A TAX INVOICE)</span>
              </div>
              <div className="border-b border-dashed border-zinc-400 mb-2"></div>
            </div>

            <div className="space-y-1 my-2 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">Order ID:</span>
                <span className="truncate max-w-[150px]">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Date:</span>
                <span>{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Table Number:</span>
                <span className="font-bold">Table {order.tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Service Mode:</span>
                <span className="uppercase font-bold">{order.orderType}</span>
              </div>
              {order.specialNotes && (
                <div className="mt-1 p-1 bg-zinc-100 border border-zinc-200 rounded text-[10px]">
                  <span className="font-bold">Note:</span> {order.specialNotes}
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-zinc-400 my-2"></div>

            {/* Receipt Table */}
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="text-left font-bold pb-1">Item</th>
                  <th className="text-center font-bold pb-1">Qty</th>
                  <th className="text-right font-bold pb-1">Price</th>
                  <th className="text-right font-bold pb-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-b border-zinc-100 last:border-0">
                    <td className="py-1">
                      <div className="font-sans font-medium text-[11px]">{item.name}</div>
                      {item.discount > 0 && <span className="text-[8px] bg-zinc-100 px-1 rounded">Disc {item.discount}%</span>}
                    </td>
                    <td className="text-center py-1 font-bold">{item.quantity}</td>
                    <td className="text-right py-1">{item.price.toFixed(2)}</td>
                    <td className="text-right py-1">
                      {((item.price * (1 - item.discount / 100)) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-dashed border-zinc-400 my-2"></div>

            {/* Calculations */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Estimated Subtotal:</span>
                <span>{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Estimated Discounts:</span>
                <span>-{calculateDiscounts().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated VAT (15%):</span>
                <span>+{calculateVat().toFixed(2)}</span>
              </div>
              <div className="border-b border-double border-zinc-400 my-1"></div>
              <div className="flex justify-between font-bold text-[12px]">
                <span>ESTIMATED TOTAL:</span>
                <span>{calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-zinc-400 mt-3 pt-2 text-center text-[9px] text-zinc-500 leading-normal">
              This receipt verifies your order selections.<br />
              Tax Invoice will be generated upon checkout.<br />
              Thank you for dining with us!
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-zinc-950 border-t border-gold-500/10 flex flex-col gap-2">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-gold-600 text-zinc-950 font-bold py-2.5 rounded-lg hover:from-gold-400 hover:to-gold-500 shadow-lg cursor-pointer text-sm"
          >
            <Printer className="w-4 h-4" />
            Print Thermal Order Copy
          </button>
        </div>

      </div>
    </div>
  );
};
