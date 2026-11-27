import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Box,
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShoppingBag,
  Store,
  Trash2,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import {
  api,
  ApiError,
  type MerchantOverview,
  type MerchantProduct,
  type MerchantProductInput,
  type MerchantStoreProfile,
} from '../services/api';
import { prepareStoreLogo, STORE_LOGO_MAX_BYTES } from '../lib/logoImage';

/** A failed dashboard call said this to the merchant, with sign-in kept separate from outages. */
function describeFailure(error: unknown, action: string): string {
  const status = error instanceof ApiError ? error.status : null;
  const message = error instanceof Error ? error.message : '';
  if (status === 401 || /sign in|token/i.test(message)) {
    return `The marketplace could not verify this request, so we could not ${action}. Refresh the page and try again.`;
  }
  if (status === null || status >= 500) {
    return `The marketplace is temporarily unavailable, so we could not ${action}. Please try again in a moment.`;
  }
  return message || `Could not ${action}.`;
}

const money = (value: number) => `SLE ${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** Colour per fulfilment stage, so a parcel's progress reads at a glance. */
const FULFILMENT_STYLES: Record<string, string> = {
  placed: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  dispatched: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200',
  delivered: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
  cancelled: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const emptyProduct = (category: string): MerchantProductInput => ({
  title: '',
  category,
  priceSLE: 0,
  stockCount: 1,
  isActive: true,
  image: '',
  description: '',
});

type DashboardTab = 'overview' | 'products' | 'settings';

interface MerchantDashboardProps {
  currentUserEmail?: string;
  onOpenStorefront?: (slug: string) => void;
}

/**
 * The merchant's own control room, shown once their store is approved: live-sales
 * figures, catalog management and the store profile the storefront reads.
 */
export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({
  currentUserEmail,
  onOpenStorefront,
}) => {
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [overview, setOverview] = useState<MerchantOverview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [orderBusy, setOrderBusy] = useState<string | null>(null);
  const [orderError, setOrderError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      setOverview(await api.getMerchantOverview());
      setState('ready');
    } catch (err) {
      setError(describeFailure(err, 'load your store'));
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  };

  /** Moves one order to its next stage: placed → dispatched → delivered. */
  const advanceOrder = async (orderId: string, next: 'dispatched' | 'delivered') => {
    setOrderBusy(orderId);
    setOrderError('');
    try {
      await api.updateMerchantOrderStatus(orderId, next);
      await load();
      flash(next === 'delivered' ? 'Order marked as delivered' : 'Order marked as dispatched');
    } catch (err) {
      setOrderError(describeFailure(err, 'update the order'));
    } finally {
      setOrderBusy(null);
    }
  };

  const store = overview?.store ?? null;
  const products = overview?.products ?? [];
  const sales = overview?.sales ?? null;

  const lowStock = useMemo(
    () => products.filter((product) => product.isActive && product.stockCount <= 3),
    [products],
  );

  if (state === 'loading' && !overview) {
    return (
      <div className="grid place-items-center gap-2 py-16 text-xs text-slate-500 dark:text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>Loading your store…</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-3 rounded border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
        <p className="flex items-center gap-2 font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-8 items-center gap-1.5 rounded border border-rose-300 bg-white px-3 font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:bg-transparent dark:text-rose-200"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-bold">Your store is still under review.</p>
        <p className="mt-1">
          You can add products and manage your catalog as soon as an admin approves the
          application. We will email {currentUserEmail || 'your account'} when it is live.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {notice && (
        <div className="flex items-center gap-2 rounded border border-[#00875A] bg-[#eaf5ff] p-2.5 font-bold text-[#00875A] dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#DCE1E5] bg-[#f5faff] p-3 dark:border-[#1E2E3D] dark:bg-[#152738]">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded bg-white dark:bg-[#0E1720]">
            {store.logo ? (
              <img src={store.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-5 w-5 text-slate-400" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-[#0B3B60] dark:text-white">{store.name}</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Live at /stores/{store.slug}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
            Live storefront
          </span>
          {onOpenStorefront && (
            <button
              type="button"
              onClick={() => onOpenStorefront(store.slug)}
              className="inline-flex h-8 items-center gap-1.5 rounded bg-[#0B3B60] px-3 font-bold text-white hover:bg-[#002541] dark:bg-[#00875A]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View storefront
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 rounded bg-[#eaf5ff] p-1.5 dark:bg-[#152738]">
        {(
          [
            ['overview', 'Sales', <BarChart3 key="a" className="h-4 w-4" />],
            ['products', `Products (${products.length})`, <Package key="b" className="h-4 w-4" />],
            ['settings', 'Store settings', <Store key="c" className="h-4 w-4" />],
          ] as Array<[DashboardTab, string, React.ReactNode]>
        ).map(([value, label, icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded font-bold transition-colors ${
              tab === value
                ? 'bg-[#0B3B60] text-white dark:bg-[#00875A]'
                : 'bg-white text-[#1A242D] hover:bg-slate-50 dark:bg-[#0E1720] dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && sales && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Metric label="Revenue (30 days)" value={money(sales.revenueLast30SLE)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
            <Metric label="Orders (30 days)" value={String(sales.ordersLast30)} icon={<ShoppingBag className="h-3.5 w-3.5" />} />
            <Metric label="Units sold (30 days)" value={String(sales.unitsLast30)} icon={<Box className="h-3.5 w-3.5" />} />
            <Metric label="Lifetime revenue" value={money(sales.revenueSLE)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
          </div>

          {lowStock.length > 0 && (
            <div className="rounded border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <span className="font-bold">Low stock:</span>{' '}
              {lowStock.map((product) => `${product.title} (${product.stockCount})`).join(', ')}
            </div>
          )}

          {orderError && (
            <p className="flex items-center gap-1.5 rounded border border-rose-300 bg-rose-50 p-2 font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {orderError}
            </p>
          )}

          <div className="rounded border border-[#DCE1E5] dark:border-[#1E2E3D]">
            <div className="border-b border-[#DCE1E5] bg-[#f5faff] px-3 py-2 font-bold text-[#0B3B60] dark:border-[#1E2E3D] dark:bg-[#152738] dark:text-white">
              Recent sales
            </div>
            {sales.recentOrders.length === 0 ? (
              <p className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                No sales yet. Products you add appear in the marketplace immediately.
              </p>
            ) : (
              <ul className="divide-y divide-[#DCE1E5] dark:divide-[#1E2E3D]">
                {sales.recentOrders.map((sale) => (
                  <li key={sale.orderId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[#1A242D] dark:text-slate-100">
                        {sale.itemsSummary} × {sale.quantity}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {sale.trackingNumber || sale.orderId} · {sale.recipientName || 'Buyer'} ·{' '}
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {/* On a phone the controls take their own line, so the item keeps its full width. */}
                    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${FULFILMENT_STYLES[sale.status] || FULFILMENT_STYLES.placed}`}
                      >
                        {sale.status}
                      </span>
                      <p className="font-bold text-[#00875A]">{money(sale.totalSLE)}</p>
                      {sale.status !== 'delivered' && sale.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={orderBusy === sale.orderId}
                          onClick={() =>
                            void advanceOrder(
                              sale.orderId,
                              sale.status === 'placed' ? 'dispatched' : 'delivered',
                            )
                          }
                          className="inline-flex h-7 items-center gap-1 rounded border border-[#0B3B60] px-2 text-[10px] font-bold text-[#0B3B60] hover:bg-[#eaf5ff] disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {orderBusy === sale.orderId ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                          ) : (
                            <Truck className="h-3 w-3" aria-hidden="true" />
                          )}
                          {sale.status === 'placed' ? 'Mark dispatched' : 'Mark delivered'}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <ProductsPanel
          products={products}
          onSaved={async (message) => {
            flash(message);
            await load();
          }}
        />
      )}

      {tab === 'settings' && (
        <StoreSettingsPanel
          store={store}
          onSaved={async (message) => {
            flash(message);
            await load();
          }}
        />
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded border border-[#DCE1E5] bg-white p-2.5 dark:border-[#1E2E3D] dark:bg-[#0E1720]">
    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {icon}
      {label}
    </p>
    <p className="mt-1 text-sm font-black text-[#0B3B60] dark:text-white">{value}</p>
  </div>
);

/** Uploads one image, reusing the store logo pipeline for both products and the logo. */
const ImageField: React.FC<{
  value: string;
  onChange: (url: string) => void;
  label?: string;
  noun?: string;
}> = ({ value, onChange, label = 'Product photo', noun = 'photo' }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File) => {
    setError('');
    setBusy(true);
    try {
      const prepared = await prepareStoreLogo(file);
      if (prepared.size > STORE_LOGO_MAX_BYTES) {
        setError('That image is still over 4 MB after resizing. Choose a smaller image.');
        return;
      }
      onChange(await api.uploadStoreLogo(prepared));
    } catch (err) {
      setError(describeFailure(err, 'upload the image'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block font-bold text-[#1A242D] dark:text-slate-200">{label}</label>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-slate-400" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-[#0B3B60] px-2.5 font-bold text-[#0B3B60] hover:bg-[#eaf5ff] disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {busy ? 'Uploading…' : value ? `Change ${noun}` : `Upload ${noun}`}
          </button>
          <input
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Or paste an image URL"
            className="h-8 w-full rounded border border-[#DCE1E5] px-2 text-[11px] dark:border-slate-700 dark:bg-[#0E1720] dark:text-slate-100"
          />
          {error && <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
        </div>
      </div>
    </div>
  );
};

const fieldClass =
  'h-9 w-full rounded border border-[#DCE1E5] bg-white px-3 text-xs focus:border-[#0B3B60] focus:outline-none dark:border-slate-700 dark:bg-[#0E1720] dark:text-slate-100';

const ProductsPanel: React.FC<{
  products: MerchantProduct[];
  onSaved: (message: string) => Promise<void>;
}> = ({ products, onSaved }) => {
  const [editing, setEditing] = useState<MerchantProduct | 'new' | null>(null);
  const [draft, setDraft] = useState<MerchantProductInput>(emptyProduct('Phones & Tablets'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openNew = () => {
    setError('');
    setDraft(emptyProduct(products[0]?.category || 'Phones & Tablets'));
    setEditing('new');
  };

  const openEdit = (product: MerchantProduct) => {
    setError('');
    setDraft({
      title: product.title,
      category: product.category,
      priceSLE: product.priceSLE,
      stockCount: product.stockCount,
      isActive: product.isActive,
      image: product.image,
      description: product.description,
    });
    setEditing(product);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editing === 'new') {
        await api.createMerchantProduct(draft);
        await onSaved(`${draft.title} is now on sale`);
      } else if (editing) {
        await api.updateMerchantProduct(editing.id, draft);
        await onSaved(`${draft.title} updated`);
      }
      setEditing(null);
    } catch (err) {
      setError(describeFailure(err, 'save the product'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (product: MerchantProduct) => {
    setBusy(true);
    setError('');
    try {
      await api.deleteMerchantProduct(product.id);
      setConfirmDelete(null);
      await onSaved(`${product.title} removed from your store`);
    } catch (err) {
      setError(describeFailure(err, 'remove the product'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-[#0B3B60] dark:text-white">Your products</h4>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex h-8 items-center gap-1.5 rounded bg-[#0B3B60] px-3 font-bold text-white hover:bg-[#002541] dark:bg-[#00875A]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add product
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded border border-rose-300 bg-rose-50 p-2 font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {editing && (
        <form onSubmit={save} className="space-y-2.5 rounded border border-[#DCE1E5] bg-[#f8fbff] p-3 dark:border-[#1E2E3D] dark:bg-[#152738]">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-[#0B3B60] dark:text-white">
              {editing === 'new' ? 'New product' : `Edit ${editing.title}`}
            </h5>
            <button type="button" onClick={() => setEditing(null)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400" aria-label="Close product form">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block font-bold">Product name *</label>
              <input
                required
                maxLength={200}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className={fieldClass}
                placeholder="e.g. 200W Monocrystalline Solar Panel"
              />
            </div>
            <div>
              <label className="mb-1 block font-bold">Category *</label>
              <select
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                className={fieldClass}
              >
                {Array.from(new Set([draft.category, 'Phones & Tablets', 'Electronics & Audio', 'Solar & Power', 'Fashion & Footwear', 'Home & Living', 'Beauty & Health', 'Groceries & Food', 'Baby & Kids', 'Sports & Outdoors', 'Building & Hardware'])).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-bold">Price (SLE) *</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={draft.priceSLE || ''}
                onChange={(event) => setDraft({ ...draft, priceSLE: Number(event.target.value) })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block font-bold">Stock available *</label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={draft.stockCount}
                onChange={(event) => setDraft({ ...draft, stockCount: Number(event.target.value) })}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-bold">Description</label>
            <textarea
              rows={2}
              maxLength={2000}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className="w-full rounded border border-[#DCE1E5] bg-white p-2 text-xs focus:border-[#0B3B60] focus:outline-none dark:border-slate-700 dark:bg-[#0E1720] dark:text-slate-100"
              placeholder="What the buyer should know: condition, warranty, delivery."
            />
          </div>

          <ImageField value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />

          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
              className="h-4 w-4"
            />
            Visible in the marketplace
          </label>

          <button
            type="submit"
            disabled={busy || !draft.title.trim() || draft.priceSLE <= 0}
            className="inline-flex h-9 items-center gap-1.5 rounded bg-[#0B3B60] px-4 font-bold text-white hover:bg-[#002541] disabled:opacity-50 dark:bg-[#00875A]"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {editing === 'new' ? 'Add product' : 'Save changes'}
          </button>
        </form>
      )}

      {products.length === 0 ? (
        <p className="rounded border border-dashed border-[#DCE1E5] p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No products yet. Add your first product and it goes live in the marketplace immediately.
        </p>
      ) : (
        <ul className="divide-y divide-[#DCE1E5] rounded border border-[#DCE1E5] dark:divide-[#1E2E3D] dark:border-[#1E2E3D]">
          {products.map((product) => (
            <li key={product.id} className="flex flex-wrap items-center gap-2 p-2.5">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Package className="m-2 h-6 w-6 text-slate-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[#1A242D] dark:text-slate-100">{product.title}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {product.category} · {money(product.priceSLE)} · {product.stockCount} in stock
                  {!product.isActive && ' · hidden'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  className="inline-flex h-8 items-center gap-1 rounded border border-[#DCE1E5] px-2 font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                {confirmDelete === product.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void remove(product)}
                      disabled={busy}
                      className="inline-flex h-8 items-center gap-1 rounded bg-rose-600 px-2 font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="h-8 px-2 font-bold text-slate-500">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(product.id)}
                    className="inline-flex h-8 items-center gap-1 rounded border border-rose-300 px-2 font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const StoreSettingsPanel: React.FC<{
  store: MerchantStoreProfile;
  onSaved: (message: string) => Promise<void>;
}> = ({ store, onSaved }) => {
  const [draft, setDraft] = useState<MerchantStoreProfile>(store);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => setDraft(store), [store]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.updateMerchantStore({
        tagline: draft.tagline,
        description: draft.description,
        locationHub: draft.locationHub,
        province: draft.province,
        streetAddress: draft.streetAddress,
        phone: draft.phone,
        payoutProvider: draft.payoutProvider,
        payoutPhone: draft.payoutPhone,
        logo: draft.logo,
      });
      await onSaved('Store profile saved');
    } catch (err) {
      setError(describeFailure(err, 'save your store'));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/stores/${store.slug}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; the URL is still visible on screen.
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="rounded border border-[#DCE1E5] bg-[#f5faff] p-2.5 dark:border-[#1E2E3D] dark:bg-[#152738]">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Public storefront</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <code className="truncate text-[11px] text-[#0B3B60] dark:text-slate-200">/stores/{store.slug}</code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex h-7 items-center gap-1 rounded border border-[#DCE1E5] bg-white px-2 text-[11px] font-bold hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
          The store name and address stay fixed so existing links keep working.
        </p>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded border border-rose-300 bg-rose-50 p-2 font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="mb-1 block font-bold">Tagline</label>
          <input maxLength={160} value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block font-bold">Contact phone</label>
          <input maxLength={40} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block font-bold">Fulfilment hub</label>
          <input maxLength={120} value={draft.locationHub} onChange={(event) => setDraft({ ...draft, locationHub: event.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block font-bold">Province</label>
          <input maxLength={80} value={draft.province} onChange={(event) => setDraft({ ...draft, province: event.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block font-bold">Showroom address</label>
          <input maxLength={240} value={draft.streetAddress} onChange={(event) => setDraft({ ...draft, streetAddress: event.target.value })} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block font-bold">Payout number</label>
          <input maxLength={40} value={draft.payoutPhone} onChange={(event) => setDraft({ ...draft, payoutPhone: event.target.value })} className={fieldClass} />
        </div>
      </div>

      <div>
        <label className="mb-1 block font-bold">About your store</label>
        <textarea
          rows={3}
          maxLength={2000}
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          className="w-full rounded border border-[#DCE1E5] bg-white p-2 text-xs focus:border-[#0B3B60] focus:outline-none dark:border-slate-700 dark:bg-[#0E1720] dark:text-slate-100"
        />
      </div>

      <ImageField label="Store logo" noun="logo" value={draft.logo} onChange={(logo) => setDraft({ ...draft, logo })} />

      {store.reviewNote && (
        <p className="rounded border border-[#DCE1E5] bg-slate-50 p-2 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
          <span className="font-bold">Note from the review team:</span> {store.reviewNote}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-9 items-center gap-1.5 rounded bg-[#0B3B60] px-4 font-bold text-white hover:bg-[#002541] disabled:opacity-50 dark:bg-[#00875A]"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save store profile
      </button>
    </form>
  );
};
