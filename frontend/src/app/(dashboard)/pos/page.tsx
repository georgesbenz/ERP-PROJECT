'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RefreshCw, Hash, Wallet, LockOpen, Lock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { inventoryService } from '@/services/inventory.service';
import { posService, type PosReceipt } from '@/services/pos.service';
import { cashSessionService } from '@/services/expenses.service';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types/models';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface QtyPopupState {
  product: Product;
  qty: string;
}

const QUICK_QTYS = [1, 2, 5, 10, 20, 50, 100, 500];

function QtyPopup({
  state,
  onConfirm,
  onCancel,
}: {
  state: QtyPopupState;
  onConfirm: (product: Product, qty: number) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [qty, setQty] = useState(state.qty);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const confirm = () => {
    const n = parseFloat(qty);
    if (!isNaN(n) && n > 0) onConfirm(state.product, n);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      {/* Panel — stop propagation so clicking inside doesn't close */}
      <div
        className="w-80 rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Product info */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-indigo-600 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 font-bold text-white text-sm">
            {state.product.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{state.product.name}</p>
            <p className="text-indigo-200 text-sm font-medium">
              {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(Number(state.product.salePrice))} each
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Quantity input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quantity
            </label>
            <input
              ref={inputRef}
              type="number"
              min="0.001"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') onCancel(); }}
              className="w-full rounded-xl border-2 border-indigo-300 px-4 py-3 text-center text-3xl font-bold text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-0"
            />
          </div>

          {/* Quick-select buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_QTYS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQty(String(q))}
                className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${
                  qty === String(q)
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-stone-200 bg-stone-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Total preview */}
          {qty && !isNaN(parseFloat(qty)) && parseFloat(qty) > 0 && (
            <div className="rounded-xl bg-indigo-50 px-4 py-2.5 text-center">
              <span className="text-sm text-indigo-600">Total: </span>
              <span className="font-bold text-indigo-800 text-lg">
                {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(
                  parseFloat(qty) * Number(state.product.salePrice)
                )}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!qty || isNaN(parseFloat(qty)) || parseFloat(qty) <= 0}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

export default function PosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER'>('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [qtyPopup, setQtyPopup] = useState<QtyPopupState | null>(null);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: () => inventoryService.listProducts(1, 30, search || undefined),
    staleTime: 10_000,
  });

  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['pos-session'],
    queryFn: posService.getSession,
  });

  const openSessionM = useMutation({
    mutationFn: () => cashSessionService.openSession({ openingBalance: Number(openingBalance) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos-session'] }); setShowOpenSession(false); setOpeningBalance(''); },
  });

  const closeSessionM = useMutation({
    mutationFn: () => cashSessionService.closeSession((session as any)?.openSession?.id, { closingBalance: Number(closingBalance) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos-session'] }); setShowCloseSession(false); setClosingBalance(''); },
  });

  const checkoutMutation = useMutation({
    mutationFn: posService.checkout,
    onSuccess: (res) => {
      setReceipt(res.receipt);
      setShowReceipt(true);
      setCart([]);
      setAmountTendered('');
      void refetchSession();
    },
  });

  const openQtyPopup = useCallback((product: Product) => {
    setQtyPopup({ product, qty: '1' });
  }, []);

  const addToCart = useCallback((product: Product, qty: number, mode: 'add' | 'set' = 'add') => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: mode === 'set' ? qty : i.quantity + qty }
            : i,
        );
      }
      return [...prev, { product, quantity: qty, unitPrice: Number(product.salePrice), discount: 0 }];
    });
    setQtyPopup(null);
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.product.id !== id));

  const subtotal = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice * (1 - i.discount / 100), 0);
  const total = subtotal;
  const change = Math.max(0, Number(amountTendered || 0) - total);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const tender = Number(amountTendered || total);
    checkoutMutation.mutate({
      items: cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      })),
      paymentMethod,
      paymentAmount: tender,
    });
  };

  return (
    <>
      <Header title="POS / Caisse" />
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* LEFT — Product Grid */}
        <div className="flex w-3/5 flex-col border-r border-stone-200 bg-stone-50">
          {/* Session bar */}
          <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2">
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">
                Aujourd&apos;hui: <strong>{session?.salesToday ?? 0}</strong> ventes ·{' '}
                <strong>{formatCurrency(Number(session?.revenueToday ?? 0))}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <Wallet size={13} className={(session as any)?.openSession ? 'text-green-500' : 'text-red-400'} />
                <span className="text-xs text-slate-600">
                  {(session as any)?.openSession ? (
                    <span className="text-green-600 font-medium">Caisse ouverte</span>
                  ) : (
                    <span className="text-red-500 font-medium">Caisse fermée</span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!(session as any)?.openSession ? (
                <button onClick={() => setShowOpenSession(true)}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                  <LockOpen size={12} /> Ouvrir caisse
                </button>
              ) : (
                <button onClick={() => setShowCloseSession(true)}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium">
                  <Lock size={12} /> Fermer caisse
                </button>
              )}
              <button onClick={() => refetchSession()} className="text-slate-400 hover:text-indigo-600">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-stone-200 bg-white p-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <p className="text-center text-sm text-slate-400 mt-8">Loading products…</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products?.data.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openQtyPopup(p)}
                    className="flex flex-col items-start rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm hover:border-indigo-400 hover:shadow-md transition-all active:scale-95"
                  >
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">{p.name}</p>
                    {p.sku && <p className="mt-0.5 text-[10px] text-slate-400">{p.sku}</p>}
                    <p className="mt-1.5 text-sm font-bold text-indigo-700">{formatCurrency(Number(p.salePrice))}</p>
                    <Badge variant={p.isService ? 'info' : 'default'} className="mt-1 text-[10px]">
                      {p.isService ? 'Service' : 'Product'}
                    </Badge>
                  </button>
                ))}
                {products?.data.length === 0 && (
                  <p className="col-span-4 text-center text-sm text-slate-400 mt-8">No products found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Cart + Checkout */}
        <div className="flex w-2/5 flex-col bg-white">
          {/* Cart header */}
          <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
            <ShoppingCart size={18} className="text-indigo-600" />
            <span className="font-semibold text-slate-800">Cart</span>
            <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Add products to start a sale
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {cart.map((item) => (
                  <li key={item.product.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{item.product.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(item.unitPrice)} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="rounded p-1 text-slate-400 hover:bg-stone-100 hover:text-slate-700">
                        <Minus size={14} />
                      </button>
                      <button
                        title="Click to set quantity"
                        onClick={() => setQtyPopup({ product: item.product, qty: String(item.quantity) })}
                        className="flex min-w-[2rem] items-center justify-center gap-0.5 rounded px-1 py-0.5 text-sm font-semibold text-slate-800 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {item.quantity}
                        <Hash size={9} className="text-indigo-400" />
                      </button>
                      <button onClick={() => updateQty(item.product.id, 1)} className="rounded p-1 text-slate-400 hover:bg-stone-100 hover:text-slate-700">
                        <Plus size={14} />
                      </button>
                    </div>
                    <p className="w-20 text-right text-sm font-semibold text-slate-800">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Checkout panel */}
          <div className="border-t border-stone-200 p-4 space-y-3">
            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <Select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              options={PAYMENT_METHODS}
            />

            {/* Amount tendered */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Amount tendered</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                placeholder={formatCurrency(total)}
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              {amountTendered && (
                <p className="text-xs text-emerald-600 font-medium">
                  Change: {formatCurrency(change)}
                </p>
              )}
            </div>

            <Button
              onClick={handleCheckout}
              loading={checkoutMutation.isPending}
              disabled={cart.length === 0}
              className="w-full"
              size="lg"
            >
              Charge {formatCurrency(total)}
            </Button>

            {checkoutMutation.isError && (
              <p className="text-xs text-red-600 text-center">
                {(checkoutMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Checkout failed'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quantity Popup */}
      {qtyPopup && (
        <QtyPopup
          state={qtyPopup}
          onConfirm={(product, qty) => {
            const inCart = cart.some((i) => i.product.id === product.id);
            addToCart(product, qty, inCart ? 'set' : 'add');
          }}
          onCancel={() => setQtyPopup(null)}
        />
      )}

      {/* Receipt Modal */}
      <Modal open={showReceipt} onClose={() => setShowReceipt(false)} title="Receipt" className="max-w-sm">
        {receipt && (
          <div className="space-y-3 text-sm">
            <div className="text-center">
              <p className="font-bold text-lg">ERP Platform</p>
              <p className="text-slate-500 text-xs">{new Date(receipt.date).toLocaleString()}</p>
              <p className="font-mono font-semibold">{receipt.reference}</p>
              <p className="text-slate-500 text-xs">Customer: {receipt.customer}</p>
            </div>
            <div className="border-t border-dashed border-stone-200 pt-2 space-y-1">
              {receipt.items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="flex-1">{item.name} × {item.qty}</span>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-200 pt-2 space-y-1">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(receipt.subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Tax</span><span>{formatCurrency(receipt.taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(receipt.total)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Paid ({receipt.paymentMethod})</span><span>{formatCurrency(receipt.paid)}</span></div>
              {receipt.change > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold"><span>Change</span><span>{formatCurrency(receipt.change)}</span></div>
              )}
            </div>
            <div className="text-center text-xs text-slate-400 pt-2 border-t border-dashed border-stone-200">
              Thank you! / Merci !
            </div>
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <Printer size={14} /> Print Receipt
            </Button>
          </div>
        )}
      </Modal>

      {/* ── Open Cash Session Modal ──────────────────────────────────────────── */}
      <Modal open={showOpenSession} onClose={() => setShowOpenSession(false)} title="Ouvrir la caisse">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Saisissez le solde d&apos;ouverture (espèces en caisse au démarrage).</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Solde d&apos;ouverture (FCFA) *</label>
            <input
              type="number"
              min="0"
              step="100"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowOpenSession(false)}>Annuler</Button>
            <Button
              onClick={() => openSessionM.mutate()}
              disabled={!openingBalance || openSessionM.isPending}
            >
              {openSessionM.isPending ? 'Ouverture…' : 'Ouvrir la caisse'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Close Cash Session Modal ─────────────────────────────────────────── */}
      <Modal open={showCloseSession} onClose={() => setShowCloseSession(false)} title="Fermer la caisse">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Comptez les espèces et saisissez le montant réel en caisse.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Solde de fermeture (FCFA) *</label>
            <input
              type="number"
              min="0"
              step="100"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCloseSession(false)}>Annuler</Button>
            <Button
              onClick={() => closeSessionM.mutate()}
              disabled={!closingBalance || closeSessionM.isPending}
              variant="outline"
            >
              {closeSessionM.isPending ? 'Fermeture…' : 'Fermer la caisse'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
