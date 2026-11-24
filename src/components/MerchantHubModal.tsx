import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Store, 
  PlusCircle, 
  ShieldCheck, 
  Zap, 
  Check, 
  Building2, 
  Wrench, 
  Tag, 
  MapPin, 
  Loader2,
  RefreshCw,
  Phone,
  Sliders,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  Eye,
  Calendar,
  Sparkles,
  Download,
  Upload,
  Filter,
  Layers,
  ExternalLink,
  FileSpreadsheet,
  Award,
  AlertCircle,
  Clock,
  ClipboardList
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Category, Product, VendorStore, BlueCollarService, TradeCategory, ItemCondition, UserProfile } from '../types';
import { detectCarrier, INITIAL_PRODUCTS, INITIAL_STORES } from '../data/mockData';
import { api, ApiError, StoreSubmission } from '../services/api';
import { AbuLogo } from './AbuLogo';
import { recordStoreLogoOutcome } from '../lib/uploadDiagnostics';
import {
  STORE_LOGO_MAX_BYTES,
  STORE_LOGO_MAX_SOURCE_BYTES,
  STORE_LOGO_TYPES,
  prepareStoreLogo,
} from '../lib/logoImage';

/** Why a chosen file cannot be used as a store logo, or null when it can be. */
export const describeLogoFileProblem = (file: File): string | null => {
  if (!STORE_LOGO_TYPES.includes(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
  if (!file.size) return 'That image is empty. Choose a different file.';
  // Anything under the source ceiling is accepted here and shrunk before it is sent, so a
  // full-resolution phone photo is not turned away over a limit we can compress past.
  if (file.size > STORE_LOGO_MAX_SOURCE_BYTES) {
    return 'That image is too large to process. Choose a photo under 25 MB.';
  }
  return null;
};

/**
 * The store form is only reachable while signed in, so a refused upload is a problem with
 * the file or the transfer — it never asks the merchant to sign in again.
 */
export const describeLogoUploadFailure = (error: unknown): string => {
  const status = error instanceof ApiError ? error.status : null;
  if (status === null) {
    return 'Could not reach the marketplace to upload the logo. Check your connection, then choose the image again.';
  }
  if (status === 401 || status === 403) {
    return 'The marketplace could not confirm this request, so the logo was not uploaded. Refresh the page and try again.';
  }
  if (status === 413) return 'That image is too large. Choose a JPEG, PNG, or WebP under 4 MB.';
  if (status === 415) return 'That file is not a readable image. Choose a JPEG, PNG, or WebP instead.';
  if (status >= 500) return 'The image service could not store the logo just now. Choose the image again in a moment.';
  return 'The logo could not be uploaded. Choose the image again.';
};

/**
 * Every merchant form opens only for a signed-in person, so a submission never answers with
 * a sign-in prompt: outages read as temporary, a refused request asks for a refresh, and
 * validation messages reach the merchant unchanged.
 */
export const describeMerchantFailure = (error: unknown, action: string): string => {
  const status = error instanceof ApiError ? error.status : null;
  const message = error instanceof Error ? error.message : '';
  // A missing token is raised before any request is sent, so it has no status. Checking the
  // session first keeps that case from being reported as a marketplace outage.
  if (status === 401 || /sign in|token/i.test(message)) {
    return `The marketplace could not verify this request, so we could not ${action}. Refresh the page and try again.`;
  }
  if (status === null || status >= 500) {
    return `The marketplace is temporarily unavailable, so we could not ${action}. Please try again in a moment.`;
  }
  return message || `Could not ${action}.`;
};

// Tooltip for Sales & Visitor Trends Chart
const CustomTrendsTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    return (
      <div className="bg-[#002541] text-white p-3 rounded-lg shadow-xl border border-white/10 text-xs min-w-[190px]">
        <p className="font-bold text-white text-[13px] border-b border-white/15 pb-1 mb-2">
          {dataPoint?.date || label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white">
                {entry.dataKey === 'sales'
                  ? `SLE ${Number(entry.value).toLocaleString()}`
                  : Number(entry.value).toLocaleString()}
              </span>
            </div>
          ))}
          {dataPoint?.orders !== undefined && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/15 text-[11px] text-[#8df7c1]">
              <span>Completed Orders:</span>
              <span className="font-bold">{dataPoint.orders}</span>
            </div>
          )}
          {dataPoint?.conversion !== undefined && (
            <div className="flex items-center justify-between gap-3 text-[11px] text-amber-300">
              <span>Visitor Conversion:</span>
              <span className="font-bold">{dataPoint.conversion}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip for Top-Selling Products Chart
const CustomProductTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0]?.payload;
    return (
      <div className="bg-[#002541] text-white p-3 rounded-lg shadow-xl border border-white/10 text-xs max-w-xs">
        <p className="font-bold text-white text-[13px] mb-1 leading-snug">
          {item?.fullName || item?.name}
        </p>
        <p className="text-[11px] text-slate-300 mb-2">
          Category: <span className="text-[#8df7c1] font-semibold">{item?.category}</span>
        </p>
        <div className="space-y-1 border-t border-white/15 pt-2 text-[11px]">
          <div className="flex justify-between gap-2">
            <span className="text-slate-300">Units Sold:</span>
            <span className="font-bold text-white">{item?.unitsSold} units</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-300">Unit Price:</span>
            <span className="font-bold text-white">SLE {Number(item?.priceSLE).toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-2 text-emerald-300 font-bold pt-1 border-t border-white/15">
            <span>Total Gross Revenue:</span>
            <span>SLE {Number(item?.revenueSLE).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/** How each review state is labelled and coloured in the merchant's own list. */
const APPLICATION_STATUS_META: Record<
  StoreSubmission['status'],
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending review',
    className: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
    icon: <Clock className="h-3 w-3" aria-hidden="true" />,
  },
  approved: {
    label: 'Approved',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
    icon: <Check className="h-3 w-3" aria-hidden="true" />,
  },
  rejected: {
    label: 'Rejected',
    className: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
    icon: <AlertCircle className="h-3 w-3" aria-hidden="true" />,
  },
};

const APPLICATION_KIND_META: Record<
  StoreSubmission['kind'],
  { label: string; icon: React.ReactNode }
> = {
  store: { label: 'Store', icon: <Store className="h-3.5 w-3.5" aria-hidden="true" /> },
  product: { label: 'Product', icon: <Tag className="h-3.5 w-3.5" aria-hidden="true" /> },
  service: { label: 'Service', icon: <Wrench className="h-3.5 w-3.5" aria-hidden="true" /> },
};

/** A short, local-time date for an application timeline entry. */
const formatApplicationDate = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface MerchantHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  onAddStore?: (store: VendorStore) => void;
  onAddService?: (service: BlueCollarService) => void;
  onOpenCMS?: () => void;
  onOpenAuth?: () => void;
  currentUser?: UserProfile | null;
  products?: Product[];
  stores?: VendorStore[];
  initialTab?: 'store' | 'single_product' | 'service';
}

export const MerchantHubModal: React.FC<MerchantHubModalProps> = ({
  isOpen,
  onClose,
  onAddStore,
  onOpenCMS,
  onOpenAuth,
  currentUser,
  products = [],
  stores = [],
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'single_product' | 'service' | 'applications' | 'analytics' | undefined>(initialTab || 'store');
  const [successMessage, setSuccessMessage] = useState('');
  const [storeError, setStoreError] = useState('');
  const [exportToast, setExportToast] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initialTab when modal opens or initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Merchant's own applications: which of their submissions are awaiting a decision.
  const [applications, setApplications] = useState<StoreSubmission[]>([]);
  const [applicationsState, setApplicationsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [applicationsError, setApplicationsError] = useState('');

  const loadApplications = useCallback(async () => {
    if (!currentUser) {
      setApplications([]);
      setApplicationsState('idle');
      return;
    }
    setApplicationsState('loading');
    setApplicationsError('');
    try {
      setApplications(await api.getMyStoreApplications());
      setApplicationsState('ready');
    } catch (err) {
      setApplicationsError(describeMerchantFailure(err, 'load your applications'));
      setApplicationsState('error');
    }
  }, [currentUser?.id]);

  // Loaded when the tab is opened rather than on mount, so the hub costs nothing extra
  // for merchants who only came to create a listing.
  useEffect(() => {
    if (!isOpen || activeTab !== 'applications') return;
    void loadApplications();
  }, [isOpen, activeTab, loadApplications]);

  // Analytics Dashboard State
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedAnalyticsStore, setSelectedAnalyticsStore] = useState<string>('all');
  const [analyticsMetricView, setAnalyticsMetricView] = useState<'all' | 'sales' | 'visitors'>('all');

  // 1. Store Form State
  const [storeName, setStoreName] = useState('');
  const [storeTagline, setStoreTagline] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [storeHub, setStoreHub] = useState('Freetown Central');
  const [storeStreet, setStoreStreet] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeLogoError, setStoreLogoError] = useState('');
  const [isUploadingStoreLogo, setIsUploadingStoreLogo] = useState(false);
  /** Object URL of the chosen file, shown while the upload runs and dropped once it lands. */
  const [storeLogoPreview, setStoreLogoPreview] = useState('');
  /** The file from a failed attempt, kept so retrying needs one click, not the file picker. */
  const [failedLogoFile, setFailedLogoFile] = useState<File | null>(null);
  const storeLogoInputRef = useRef<HTMLInputElement | null>(null);
  const storeLogoPreviewUrlRef = useRef<string | null>(null);

  /** Swaps the local preview for a new file, releasing the previous object URL's memory. */
  const showStoreLogoPreview = (file: File | null) => {
    if (storeLogoPreviewUrlRef.current) URL.revokeObjectURL(storeLogoPreviewUrlRef.current);
    const url = file ? URL.createObjectURL(file) : '';
    storeLogoPreviewUrlRef.current = url || null;
    setStoreLogoPreview(url);
  };

  // Unmounting with an upload in flight must not leak the preview's object URL.
  useEffect(() => () => {
    if (storeLogoPreviewUrlRef.current) URL.revokeObjectURL(storeLogoPreviewUrlRef.current);
    storeLogoPreviewUrlRef.current = null;
  }, []);

  /**
   * Uploads one logo file. A failure leaves every other store field alone and keeps the file
   * and its preview, so the merchant can retry the same image instead of filling in the form
   * or reaching for the file picker again.
   */
  const uploadStoreLogo = async (file: File) => {
    setStoreLogoError('');
    setFailedLogoFile(null);
    // Show the picked image immediately so the merchant sees what is uploading, not an empty box.
    if (!storeLogoPreviewUrlRef.current) showStoreLogoPreview(file);
    setIsUploadingStoreLogo(true);
    let sentBytes: number | null = null;
    const base = {
      fileName: file.name,
      fileType: file.type,
      sourceBytes: file.size,
      at: new Date().toISOString(),
    };
    try {
      // Phone photos are often far bigger than the API accepts, so shrink them here first.
      const prepared = await prepareStoreLogo(file);
      if (prepared.size > STORE_LOGO_MAX_BYTES) {
        const message = 'That image is still over 4 MB after resizing. Choose a smaller image.';
        setStoreLogoError(message);
        recordStoreLogoOutcome({ ...base, outcome: 'failed', kind: 'file', message, status: null, sentBytes: null });
        return;
      }
      sentBytes = prepared.size;
      const hostedUrl = await api.uploadStoreLogo(prepared);
      setStoreLogoUrl(hostedUrl);
      showStoreLogoPreview(null);
      recordStoreLogoOutcome({
        ...base,
        outcome: 'uploaded',
        kind: 'upload',
        message: `Uploaded ${prepared.name} to image storage.`,
        status: 200,
        sentBytes,
      });
    } catch (error) {
      const message = describeLogoUploadFailure(error);
      setStoreLogoUrl('');
      setStoreLogoError(message);
      setFailedLogoFile(file);
      recordStoreLogoOutcome({
        ...base,
        outcome: 'failed',
        kind: 'upload',
        message,
        status: error instanceof ApiError ? error.status : null,
        ...(error instanceof ApiError && error.code ? { authCode: error.code } : {}),
        sentBytes,
      });
    } finally {
      setIsUploadingStoreLogo(false);
    }
  };

  /** Chooses and checks one logo file, then hands it to the uploader. */
  const handleStoreLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || isUploadingStoreLogo) return;

    const fileProblem = describeLogoFileProblem(file);
    if (fileProblem) {
      setFailedLogoFile(null);
      setStoreLogoError(fileProblem);
      recordStoreLogoOutcome({
        outcome: 'failed',
        kind: 'file',
        message: fileProblem,
        status: null,
        fileName: file.name,
        fileType: file.type,
        sourceBytes: file.size,
        sentBytes: null,
        at: new Date().toISOString(),
      });
      return;
    }

    await uploadStoreLogo(file);
  };

  const handleStoreLogoRetry = () => {
    if (!failedLogoFile || isUploadingStoreLogo) return;
    void uploadStoreLogo(failedLogoFile);
  };

  // 2. Single Product Form State
  const [singleTitle, setSingleTitle] = useState('');
  const [singleCategory, setSingleCategory] = useState<Category>('Phones & Tablets');
  const [singlePrice, setSinglePrice] = useState('');
  const [singleCondition, setSingleCondition] = useState<ItemCondition>('brand_new');
  const [singleSellerName, setSingleSellerName] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleLocation, setSingleLocation] = useState('Aberdeen, Freetown');
  const [singleDesc, setSingleDesc] = useState('');

  // 3. Service Form State
  const [serviceTitle, setServiceTitle] = useState('');
  const [tradeCategory, setTradeCategory] = useState<TradeCategory>('Solar & Inverter Technician');
  const [providerName, setProviderName] = useState('');
  const [servicePhone, setServicePhone] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [calloutFeeSLE, setCalloutFeeSLE] = useState('');
  const [serviceHub, setServiceHub] = useState('Lumley & Aberdeen');
  const [skillsText, setSkillsText] = useState('');
  const [certification, setCertification] = useState('');

  // Analytics Calculations
  const availableStores = useMemo(() => {
    return stores && stores.length > 0 ? stores : INITIAL_STORES;
  }, [stores]);

  const availableProducts = useMemo(() => {
    return products && products.length > 0 ? products : INITIAL_PRODUCTS;
  }, [products]);

  const currentStoreObj = useMemo(() => {
    if (selectedAnalyticsStore === 'all') return null;
    return availableStores.find((s) => s.id === selectedAnalyticsStore) || null;
  }, [availableStores, selectedAnalyticsStore]);

  // Filter products for this store if specific store is chosen
  const storeProducts = useMemo(() => {
    if (!currentStoreObj) return availableProducts;
    const filtered = availableProducts.filter(
      (p) =>
        (p.storeId && p.storeId === currentStoreObj.id) ||
        (p.sellerName && p.sellerName.toLowerCase().includes(currentStoreObj.name.toLowerCase()))
    );
    return filtered.length > 0 ? filtered : availableProducts.slice(0, 8);
  }, [availableProducts, currentStoreObj]);

  // Top-selling products
  const topProducts = useMemo(() => {
    const sorted = [...storeProducts].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    return sorted.slice(0, 5);
  }, [storeProducts]);

  // Data for Recharts Bar Chart of Top-Selling Products
  const topProductsChartData = useMemo(() => {
    return topProducts.map((p, idx) => ({
      rank: `#${idx + 1}`,
      name: p.title.length > 18 ? p.title.substring(0, 17) + '…' : p.title,
      fullName: p.title,
      unitsSold: p.soldCount || Math.max(8, 28 - idx * 5),
      revenueSLE: (p.soldCount || Math.max(8, 28 - idx * 5)) * p.priceSLE,
      priceSLE: p.priceSLE,
      category: p.category,
      stock: p.stockCount,
      image: p.image,
    }));
  }, [topProducts]);

  // Time series data for Sales and Visitor trends
  const timeSeriesData = useMemo(() => {
    const baseMultiplier = currentStoreObj ? Math.max(0.55, (currentStoreObj.totalSales || 350) / 450) : 1.35;

    if (analyticsTimeframe === '7d') {
      const days = [
        { name: 'Mon', date: 'Mon Oct 15', salesCoeff: 5800, visitorCoeff: 420, orders: 12 },
        { name: 'Tue', date: 'Tue Oct 16', salesCoeff: 7200, visitorCoeff: 510, orders: 15 },
        { name: 'Wed', date: 'Wed Oct 17', salesCoeff: 6400, visitorCoeff: 480, orders: 14 },
        { name: 'Thu', date: 'Thu Oct 18', salesCoeff: 9800, visitorCoeff: 690, orders: 22 },
        { name: 'Fri', date: 'Fri Oct 19', salesCoeff: 13500, visitorCoeff: 940, orders: 31 },
        { name: 'Sat', date: 'Sat Oct 20', salesCoeff: 16200, visitorCoeff: 1180, orders: 38 },
        { name: 'Sun', date: 'Sun Oct 21', salesCoeff: 11400, visitorCoeff: 820, orders: 25 },
      ];
      return days.map((d) => ({
        name: d.name,
        date: d.date,
        sales: Math.round(d.salesCoeff * baseMultiplier),
        visitors: Math.round(d.visitorCoeff * baseMultiplier),
        orders: Math.round(d.orders * baseMultiplier),
        conversion: ((d.orders / d.visitorCoeff) * 100).toFixed(1),
      }));
    }

    if (analyticsTimeframe === '30d') {
      const weeks = [
        { name: 'Week 1', date: 'Days 1–7', salesCoeff: 42000, visitorCoeff: 3200, orders: 98 },
        { name: 'Week 2', date: 'Days 8–14', salesCoeff: 48500, visitorCoeff: 3650, orders: 114 },
        { name: 'Week 3', date: 'Days 15–21', salesCoeff: 62000, visitorCoeff: 4420, orders: 142 },
        { name: 'Week 4', date: 'Days 22–30', salesCoeff: 71500, visitorCoeff: 5180, orders: 168 },
      ];
      return weeks.map((w) => ({
        name: w.name,
        date: w.date,
        sales: Math.round(w.salesCoeff * baseMultiplier),
        visitors: Math.round(w.visitorCoeff * baseMultiplier),
        orders: Math.round(w.orders * baseMultiplier),
        conversion: ((w.orders / w.visitorCoeff) * 100).toFixed(1),
      }));
    }

    // 90d (Quarterly)
    const months = [
      { name: 'Month 1', date: 'Aug 2026', salesCoeff: 165000, visitorCoeff: 12400, orders: 390 },
      { name: 'Month 2', date: 'Sep 2026', salesCoeff: 198000, visitorCoeff: 14800, orders: 460 },
      { name: 'Month 3', date: 'Oct 2026', salesCoeff: 242000, visitorCoeff: 18100, orders: 580 },
    ];
    return months.map((m) => ({
      name: m.name,
      date: m.date,
      sales: Math.round(m.salesCoeff * baseMultiplier),
      visitors: Math.round(m.visitorCoeff * baseMultiplier),
      orders: Math.round(m.orders * baseMultiplier),
      conversion: ((m.orders / m.visitorCoeff) * 100).toFixed(1),
    }));
  }, [analyticsTimeframe, currentStoreObj]);

  // Aggregate totals
  const summaryMetrics = useMemo(() => {
    const totalSales = timeSeriesData.reduce((acc, curr) => acc + curr.sales, 0);
    const totalVisitors = timeSeriesData.reduce((acc, curr) => acc + curr.visitors, 0);
    const totalOrders = timeSeriesData.reduce((acc, curr) => acc + curr.orders, 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
    const conversionRate = totalVisitors > 0 ? ((totalOrders / totalVisitors) * 100).toFixed(1) : '0.0';

    return {
      totalSales,
      totalVisitors,
      totalOrders,
      avgOrderValue,
      conversionRate,
    };
  }, [timeSeriesData]);

  // Export CSV Report Handler
  const handleExportReport = () => {
    const storeLabel = currentStoreObj ? currentStoreObj.name : 'All-Stores-Overview';
    const rows = [
      ['ABU MARKETPLACE - MERCHANT PERFORMANCE & ANALYTICS REPORT'],
      [`Store Name`, storeLabel],
      [`Reporting Window`, analyticsTimeframe.toUpperCase()],
      [`Generated Date`, new Date().toLocaleDateString('en-GB')],
      [],
      ['EXECUTIVE METRICS'],
      ['Total Sales (SLE)', summaryMetrics.totalSales],
      ['Total Store Visitors', summaryMetrics.totalVisitors],
      ['Total Completed Orders', summaryMetrics.totalOrders],
      ['Average Order Value (SLE)', summaryMetrics.avgOrderValue],
      ['Overall Conversion Rate', `${summaryMetrics.conversionRate}%`],
      [],
      ['SALES & TRAFFIC BREAKDOWN'],
      ['Period', 'Date/Range', 'Sales (SLE)', 'Visitors', 'Orders', 'Conversion %'],
      ...timeSeriesData.map((d) => [d.name, d.date, d.sales, d.visitors, d.orders, `${d.conversion}%`]),
      [],
      ['TOP-SELLING MERCHANDISE RANKING'],
      ['Rank', 'Product Title', 'Category', 'Units Sold', 'Unit Price (SLE)', 'Gross Revenue (SLE)', 'Remaining Stock'],
      ...topProductsChartData.map((p, idx) => [
        `#${idx + 1}`,
        p.fullName,
        p.category,
        p.unitsSold,
        p.priceSLE,
        p.revenueSLE,
        p.stock,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows
        .map((e) =>
          e
            .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `abu-merchant-${storeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${analyticsTimeframe}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportToast(`Analytics report exported for ${storeLabel}!`);
    setTimeout(() => setExportToast(''), 4500);
  };

  if (!isOpen) return null;

  // Handlers
  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreError('');
    setSuccessMessage('');
    if (!storeName.trim() || !storePhone.trim()) {
      setStoreError('Enter your store name and contact phone number to continue.');
      return;
    }
    setIsSubmitting(true);
    const detection = detectCarrier(storePhone);

    const storePayload: Partial<VendorStore> = {
      name: storeName.trim(),
      tagline: storeTagline.trim() || 'Verified Sierra Leone Merchant Store',
      description: storeDesc.trim() || 'Authorized distributor on ABU Marketplace.',
      locationHub: storeHub,
      streetAddress: storeStreet.trim() || 'Freetown',
      phone: storePhone.trim(),
      payoutProvider: detection.carrier || 'orange',
      payoutPhone: storePhone.trim(),
      logo: storeLogoUrl || '/src/assets/images/flagship_smartphone_device_1791485459581.jpg',
    };

    try {
      const { submission, emailStatus } = await api.submitStoreApplication(storePayload);

      setSuccessMessage(emailStatus === 'sent'
        ? `Application for "${submission.name}" submitted. A confirmation email was sent; the store will appear after review.`
        : emailStatus === 'logged'
          ? `Application for "${submission.name}" submitted. Email delivery is not configured; the store will appear after review.`
          : `Application for "${submission.name}" submitted, but the confirmation email failed. The store will still appear after review.`);
      setStoreName('');
      setStoreTagline('');
      setStoreDesc('');
      setStoreStreet('');
      setStorePhone('');
      setStoreLogoUrl('');
      // A submitted application starts clean, so no leftover preview or retry offer.
      setFailedLogoFile(null);
      setStoreLogoError('');
      showStoreLogoPreview(null);
    } catch (err) {
      setSuccessMessage('');
      setStoreError(describeMerchantFailure(err, 'submit your store application'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTitle || !singlePrice) return;

    setIsSubmitting(true);
    setStoreError('');
    setSuccessMessage('');
    const price = parseFloat(singlePrice) || 100;
    const originalPrice = Math.round(price * 1.2);

    let assignedImage = '/src/assets/images/flagship_smartphone_device_1791485459581.jpg';
    if (singleCategory === 'Solar & Power') {
      assignedImage = '/src/assets/images/solar_inverter_power_station_1791485447453.jpg';
    } else if (singleCategory === 'Electronics & Audio') {
      assignedImage = '/src/assets/images/wireless_anc_headphones_1791485470426.jpg';
    } else if (singleCategory === 'Fashion & Footwear') {
      assignedImage = '/src/assets/images/leather_oxford_shoes_1791485481085.jpg';
    } else if (singleCategory === 'Home & Living') {
      assignedImage = '/src/assets/images/smart_multi_cooker_1791485578647.jpg';
    }

    const productPayload: Partial<Product> = {
      title: singleTitle.trim(),
      category: singleCategory,
      priceSLE: price,
      originalPriceSLE: originalPrice,
      discountPercent: 15,
      stockCount: 1,
      image: assignedImage,
      sellerName: singleSellerName.trim() || 'Individual Seller',
      sellerLocation: `${singleLocation} (Verified)`,
      description: singleDesc.trim() || `Condition: ${singleCondition}. Direct seller pickup or delivery in Sierra Leone.`,
      condition: singleCondition,
      sellerType: 'individual',
      sellerPhone: singlePhone,
    };

    try {
      const { submission } = await api.submitListing('product', productPayload);
      setSuccessMessage(`"${submission.name}" was submitted for review. It goes live once an admin approves it.`);
      setSingleTitle('');
      setSinglePrice('');
      setSingleDesc('');
    } catch (err) {
      setStoreError(describeMerchantFailure(err, 'list this item'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle || !providerName || !servicePhone) return;

    setIsSubmitting(true);
    setStoreError('');
    setSuccessMessage('');
    const detection = detectCarrier(servicePhone);
    const skills = skillsText.split(',').map((s) => s.trim()).filter(Boolean);

    const servicePayload: Partial<BlueCollarService> = {
      title: serviceTitle.trim(),
      tradeCategory,
      providerName: providerName.trim(),
      phone: servicePhone.trim(),
      whatsapp: servicePhone.trim(),
      payoutProvider: detection.carrier || 'orange',
      experienceYears: parseInt(experienceYears, 10) || 5,
      locationHub: serviceHub,
      calloutFeeSLE: parseFloat(calloutFeeSLE) || 100,
      skills: skills.length > 0 ? skills : ['On-site diagnosis', 'Standard tools supplied'],
      certification: certification.trim() || 'Certified Guild Artisan SL',
      avatar: '/src/assets/images/solar_inverter_power_station_1791485447453.jpg',
    };

    try {
      const { submission } = await api.submitListing('service', servicePayload);
      setSuccessMessage(`"${submission.name}" was submitted for review. The artisan goes live once an admin approves it.`);
      setServiceTitle('');
      setProviderName('');
    } catch (err) {
      setStoreError(describeMerchantFailure(err, 'register this service'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/75 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl overflow-hidden rounded-t-2xl border border-[#DCE1E5] bg-white text-[#1A242D] shadow-2xl transition-all duration-200 dark:border-[#1E2E3D] dark:bg-[#111D27] dark:text-[#F1F5F9] sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Abu Logo */}
        <div className="bg-[#0B3B60] dark:bg-[#002541] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <AbuLogo size={32} />
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                ABU Merchant & Trade Hub
              </h2>
              <p className="text-[11px] text-[#8df7c1]">
                Stores · Listings · Artisan Services · Application Status
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenCMS && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCMS();
                }}
                className="bg-[#082d49] hover:bg-[#144b77] text-amber-300 border border-amber-400/40 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Manage Live Store Catalog & Inventory in CMS"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Store CMS</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
              aria-label="Close merchant hub"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Track Selector Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-[#eaf5ff] dark:bg-[#152738] border-b border-[#DCE1E5] dark:border-[#1E2E3D] p-1.5 gap-1.5 text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('store');
              setSuccessMessage('');
            }}
            className={`min-h-12 px-1 py-1 sm:px-1.5 rounded font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'store'
                ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1720] text-[#1A242D] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="block max-w-full whitespace-normal text-center text-[10px] leading-tight sm:text-xs">Create Store</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('single_product');
              setSuccessMessage('');
            }}
            className={`min-h-12 px-1 py-1 sm:px-1.5 rounded font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'single_product'
                ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1720] text-[#1A242D] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0" />
            <span className="block max-w-full whitespace-normal text-center text-[10px] leading-tight sm:text-xs">List Product</span>
          </button>



          <button
            type="button"
            onClick={() => {
              setActiveTab('service');
              setSuccessMessage('');
            }}
            className={`min-h-12 px-1 py-1 sm:px-1.5 rounded font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'service'
                ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1720] text-[#1A242D] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span className="block max-w-full whitespace-normal text-center text-[10px] leading-tight sm:text-xs">Offer Service</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('applications');
              setSuccessMessage('');
              setStoreError('');
            }}
            className={`min-h-12 px-1 py-1 sm:px-1.5 rounded font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1720] text-[#1A242D] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span className="block max-w-full whitespace-normal text-center text-[10px] leading-tight sm:text-xs">My Applications</span>
          </button>

        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-4">
          {successMessage && (
            <div className="bg-[#eaf5ff] border border-[#00875A] p-3 rounded flex items-center gap-2 text-xs text-[#00875A] font-bold">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
              <button
                type="button"
                onClick={() => setSuccessMessage('')}
                className="ml-2 text-[9px] underline underline-offset-1 hover:text-[#00875A] transition-colors"
                aria-label="Dismiss success message"
              >Close</button>
            </div>
          )}

          {storeError && (
            <div className="bg-rose-50 border border-rose-300 p-3 rounded flex items-center gap-2 text-xs text-rose-700 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{storeError}</span>
            </div>
          )}

          {/* TRACK 1: CREATE A STORE */}
          {activeTab === 'store' && (
            <form onSubmit={handleStoreSubmit} className="merchant-hub-form space-y-3.5 text-xs">
              <div className="bg-[#f5faff] p-3 rounded border border-[#DCE1E5]">
                <h4 className="font-bold text-[#0B3B60] mb-1">
                  Full Merchant Storefront
                </h4>
                <p className="text-[11px] text-[#334155]">
                  For shop owners and wholesale distributors. Get your dedicated branded storefront with product collections and verified merchant badge.
                </p>
              </div>                <div className="flex items-center gap-3 rounded border border-[#DCE1E5] bg-white p-3">
                <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                  {storeLogoPreview || storeLogoUrl ? (
                    <img src={storeLogoPreview || storeLogoUrl} alt="Store logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-6 w-6 text-slate-400" aria-hidden="true" />
                  )}
                  {isUploadingStoreLogo && storeLogoPreview && (
                    <div className="absolute inset-0 grid place-items-center bg-[#002541]/45">
                      <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                      <span className="sr-only">Uploading logo…</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="store-logo-upload" className="mb-1 block font-bold text-[#1A242D]">Store Logo</label>
                  <input
                    ref={storeLogoInputRef}
                    id="store-logo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleStoreLogoUpload}
                    className="sr-only"
                    aria-describedby="store-logo-help store-logo-error"
                  />
                  <button
                    type="button"
                    onClick={() => storeLogoInputRef.current?.click()}
                    disabled={isUploadingStoreLogo}
                    className="inline-flex h-9 items-center gap-2 rounded bg-[#0B3B60] px-3 text-xs font-bold text-white hover:bg-[#002541] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {isUploadingStoreLogo ? 'Uploading…' : storeLogoUrl ? 'Change logo' : 'Upload logo'}
                  </button>
                  <p id="store-logo-help" className="mt-1 text-[10px] text-slate-600">JPEG, PNG, or WebP. Large photos are resized automatically.</p>
                  <div id="store-logo-error" role="alert" className="mt-1 space-y-1.5 text-[11px] font-semibold text-rose-700">
                    {storeLogoError && <p>{storeLogoError}</p>}
                    {failedLogoFile && (
                      <button
                        type="button"
                        onClick={handleStoreLogoRetry}
                        disabled={isUploadingStoreLogo}
                        className="inline-flex h-8 items-center gap-1.5 rounded border border-rose-300 bg-white px-2.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Try upload again
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="store-name" className="block font-bold text-[#1A242D] mb-1">
                    Store / Business Name *
                  </label>
                  <input
                    id="store-name"
                    type="text"
                    required
                    maxLength={120}
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Lumley Solar Hub SL"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>

                <div>
                  <label htmlFor="store-tagline" className="block font-bold text-[#1A242D] mb-1">
                    Store Catchphrase / Tagline
                  </label>
                  <input
                    id="store-tagline"
                    type="text"
                    maxLength={160}
                    value={storeTagline}
                    onChange={(e) => setStoreTagline(e.target.value)}
                    placeholder="e.g. Genuine Solar & Power Backup Systems"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="store-hub" className="block font-bold text-[#1A242D] mb-1">
                    Fulfillment Hub / City *
                  </label>
                  <select
                    id="store-hub"
                    value={storeHub}
                    onChange={(e) => setStoreHub(e.target.value)}
                    className="w-full h-9 px-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  >
                    <option value="Freetown Central">Freetown Central</option>
                    <option value="Lumley & Aberdeen">Lumley & Aberdeen</option>
                    <option value="Kissy & Wellington">Kissy & Wellington</option>
                    <option value="Bo City">Bo City</option>
                    <option value="Makeni Hub">Makeni</option>
                    <option value="Kenema Hub">Kenema</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="store-phone" className="block font-bold text-[#1A242D] mb-1">
                    Merchant Contact Phone (+232) *
                  </label>
                  <input
                    id="store-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    maxLength={24}
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="076 123 456"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="store-address" className="block font-bold text-[#1A242D] mb-1">
                  Physical Showroom Address
                </label>
                <input
                  id="store-address"
                  type="text"
                  value={storeStreet}
                  onChange={(e) => setStoreStreet(e.target.value)}
                  placeholder="e.g. 18 Lumley Beach Road, Freetown"
                  className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                />
              </div>

              <div>
                <label htmlFor="store-description" className="block font-bold text-[#1A242D] mb-1">
                  Store Description
                </label>
                <textarea
                  id="store-description"
                  rows={2}
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  placeholder="Tell buyers about your products, warranties, and store history..."
                  className="w-full p-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isUploadingStoreLogo || !storeName.trim() || !storePhone.trim()}
                className="w-full h-10 bg-[#0B3B60] hover:bg-[#002541] disabled:opacity-50 text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#8df7c1]" />
                <span>
                  {isSubmitting ? 'Submitting application...' : 'Submit Store for Review'}
                </span>
              </button>
            </form>
          )}

          {/* TRACK 2: LIST SINGLE ITEM */}
          {activeTab === 'single_product' && (
            <form onSubmit={handleSingleProductSubmit} className="merchant-hub-form space-y-3.5 text-xs">
              <div className="bg-[#f5faff] p-3 rounded border border-[#DCE1E5]">
                <h4 className="font-bold text-[#0B3B60] mb-1">
                  Quick Single-Item Listing
                </h4>
                <p className="text-[11px] text-[#334155]">
                  Got an individual smartphone, solar inverter, car part, or gadget to sell? List it here in 60 seconds.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#1A242D] mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  value={singleTitle}
                  onChange={(e) => setSingleTitle(e.target.value)}
                  placeholder="e.g. iPhone 13 Pro 256GB Dual SIM (Sierra Leone Ready)"
                  className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Category *
                  </label>
                  <select
                    value={singleCategory}
                    onChange={(e) => setSingleCategory(e.target.value as Category)}
                    className="w-full h-9 px-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  >
                    <option value="Phones & Tablets">Phones & Tablets</option>
                    <option value="Solar & Power">Solar & Power</option>
                    <option value="Electronics & Audio">Electronics & Audio</option>
                    <option value="Home & Living">Home & Living</option>
                    <option value="Fashion & Footwear">Fashion & Footwear</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Asking Price (SLE) *
                  </label>
                  <div className="flex items-stretch">
                    <span className="h-9 px-2 bg-[#eaf5ff] border border-r-0 border-[#DCE1E5] rounded-l text-xs font-bold text-[#0B3B60] flex items-center">
                      SLE
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={singlePrice}
                      onChange={(e) => setSinglePrice(e.target.value)}
                      placeholder="e.g. 650"
                      className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded-r text-xs focus:outline-none focus:border-[#0B3B60]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Item Condition *
                  </label>
                  <select
                    value={singleCondition}
                    onChange={(e) => setSingleCondition(e.target.value as ItemCondition)}
                    className="w-full h-9 px-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  >
                    <option value="brand_new">Brand New in Box</option>
                    <option value="like_new">Like New / Refurbished</option>
                    <option value="used">Gently Used</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={singleSellerName}
                    onChange={(e) => setSingleSellerName(e.target.value)}
                    placeholder="e.g. Brima Kargbo"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Phone / WhatsApp (+232)
                  </label>
                  <input
                    type="text"
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                    placeholder="078 123 456"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A242D] mb-1">
                  Item Description & Accessories Included
                </label>
                <textarea
                  rows={2}
                  value={singleDesc}
                  onChange={(e) => setSingleDesc(e.target.value)}
                  placeholder="Includes original charger, battery health 92%, available for pickup at..."
                  className="w-full p-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !singleTitle || !singlePrice}
                className="w-full h-10 bg-[#0B3B60] hover:bg-[#002541] disabled:opacity-50 text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
              >
                <Tag className="w-4 h-4 text-[#8df7c1]" />
                <span>
                  {isSubmitting ? 'Posting Item...' : 'Post Single Item Live to Feed'}
                </span>
              </button>
            </form>
          )}

          {/* TRACK 3: OFFER A BLUE-COLLAR SERVICE */}
          {activeTab === 'service' && (
            <form onSubmit={handleServiceSubmit} className="merchant-hub-form space-y-3.5 text-xs">
              <div className="bg-[#f5faff] p-3 rounded border border-[#DCE1E5]">
                <h4 className="font-bold text-[#0B3B60] mb-1">
                  Blue-Collar Artisan & Technician Registration
                </h4>
                <p className="text-[11px] text-[#334155]">
                  Join ABU Marketplace's verified trade network. Get booked by homeowners and businesses for solar setups, electrical work, plumbing, AC maintenance, and auto diagnostics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Trade Profession *
                  </label>
                  <select
                    value={tradeCategory}
                    onChange={(e) => setTradeCategory(e.target.value as TradeCategory)}
                    className="w-full h-9 px-2 bg-white border border-[#DCE1E5] rounded text-xs font-semibold focus:outline-none focus:border-[#0B3B60]"
                  >
                    <option value="Solar & Inverter Technician">Solar & Inverter Technician</option>
                    <option value="Electrician & Generator">Electrician & Generator</option>
                    <option value="AC & Refrigeration">AC & Refrigeration</option>
                    <option value="Plumbing & Water Tanks">Plumbing & Water Tanks</option>
                    <option value="Auto Mechanic & Diagnostics">Auto Mechanic & Diagnostics</option>
                    <option value="Phone & Laptop Repair">Phone & Laptop Repair</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Service Listing Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder="e.g. Master Inverter & Solar Wiring Technician"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Technician / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Technician or business name"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Mobile / WhatsApp (+232) *
                  </label>
                  <input
                    type="text"
                    required
                    value={servicePhone}
                    onChange={(e) => setServicePhone(e.target.value)}
                    placeholder="076 123 456"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Consultation & Diagnostic Fee (SLE) *
                  </label>
                  <div className="flex items-stretch">
                    <span className="h-9 px-2 bg-[#eaf5ff] border border-r-0 border-[#DCE1E5] rounded-l text-xs font-bold text-[#0B3B60] flex items-center">
                      SLE
                    </span>
                    <input
                      type="number"
                      required
                      min="10"
                      value={calloutFeeSLE}
                      onChange={(e) => setCalloutFeeSLE(e.target.value)}
                      placeholder="100"
                      className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded-r text-xs focus:outline-none focus:border-[#0B3B60]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Primary Hub & Service Area
                  </label>
                  <select
                    value={serviceHub}
                    onChange={(e) => setServiceHub(e.target.value)}
                    className="w-full h-9 px-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  >
                    <option value="Lumley & Aberdeen">Lumley & Aberdeen</option>
                    <option value="Freetown CBD">Freetown Central</option>
                    <option value="Kissy & Wellington">Kissy & Wellington</option>
                    <option value="Bo City">Bo City</option>
                    <option value="Makeni Hub">Makeni</option>
                    <option value="Kenema Hub">Kenema</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Years of Trade Experience
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A242D] mb-1">
                  Key Skills & Tools Supplied (comma separated)
                </label>
                <input
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  placeholder="e.g. AC chemical cleaning, OBD2 car diagnostics, water pump repair"
                  className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !serviceTitle || !providerName}
                className="w-full h-10 bg-[#0B3B60] hover:bg-[#002541] disabled:opacity-50 text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-[#8df7c1]" />
                <span>
                  {isSubmitting ? 'Registering Trade Profile...' : 'Register as Verified Artisan'}
                </span>
              </button>
            </form>
          )}

          {/* TRACK 4: THE MERCHANT'S OWN APPLICATIONS AND THEIR REVIEW STATUS */}
          {activeTab === 'applications' && (
            <div className="space-y-3.5 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#0B3B60] dark:text-[#8df7c1]">
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                    My Applications
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#334155] dark:text-slate-400">
                    Everything you have submitted for review, with the decision and any reason an admin gave.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadApplications()}
                  disabled={applicationsState === 'loading'}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded border border-[#DCE1E5] bg-white px-2.5 text-[11px] font-bold text-[#0B3B60] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1E2E3D] dark:bg-[#0E1720] dark:text-[#8df7c1] dark:hover:bg-[#152738]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${applicationsState === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {applicationsState === 'loading' ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {!currentUser ? (
                <div className="rounded border border-[#DCE1E5] bg-[#f5faff] p-4 text-center dark:border-[#1E2E3D] dark:bg-[#0E1720]">
                  <ClipboardList className="mx-auto h-6 w-6 text-[#0B3B60] dark:text-[#8df7c1]" aria-hidden="true" />
                  <p className="mt-2 text-[11px] font-semibold text-[#334155] dark:text-slate-300">
                    Sign in to see the applications tied to your account.
                  </p>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="mt-2 h-8 rounded bg-[#0B3B60] px-3 text-[11px] font-bold text-white hover:bg-[#002541]"
                    >
                      Sign in
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {applicationsState === 'error' && (
                    <div role="alert" className="flex items-start gap-2 rounded border border-rose-300 bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{applicationsError}</span>
                      <button type="button" onClick={() => void loadApplications()} className="shrink-0 underline underline-offset-2">
                        Try again
                      </button>
                    </div>
                  )}

                  {applicationsState === 'loading' && applications.length === 0 && (
                    <div className="flex items-center justify-center gap-2 rounded border border-[#DCE1E5] bg-white p-6 text-[11px] font-semibold text-slate-600 dark:border-[#1E2E3D] dark:bg-[#0E1720] dark:text-slate-300">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Loading your applications…
                    </div>
                  )}

                  {applicationsState !== 'loading' && applicationsState !== 'error' && applications.length === 0 && (
                    <div className="rounded border border-dashed border-[#DCE1E5] bg-white p-5 text-center dark:border-[#1E2E3D] dark:bg-[#0E1720]">
                      <ClipboardList className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
                      <p className="mt-2 text-[11px] font-bold text-[#1A242D] dark:text-white">No applications yet</p>
                      <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        Submit a store, product, or service and its review status will appear here.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('store')}
                        className="mt-3 h-8 rounded bg-[#0B3B60] px-3 text-[11px] font-bold text-white hover:bg-[#002541]"
                      >
                        Create a store application
                      </button>
                    </div>
                  )}

                  {applications.length > 0 && (
                    <>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                        {(['pending', 'approved', 'rejected'] as const).map((status) => {
                          const count = applications.filter((app) => app.status === status).length;
                          if (!count) return null;
                          const meta = APPLICATION_STATUS_META[status];
                          return (
                            <span key={status} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${meta.className}`}>
                              {meta.icon}
                              {count} {meta.label.toLowerCase()}
                            </span>
                          );
                        })}
                      </div>

                      <ul className="space-y-2">
                        {applications.map((app) => {
                          const status = APPLICATION_STATUS_META[app.status];
                          const kind = APPLICATION_KIND_META[app.kind];
                          return (
                            <li key={app.id} className="rounded border border-[#DCE1E5] bg-white p-3 dark:border-[#1E2E3D] dark:bg-[#0E1720]">
                              <div className="flex items-start gap-2.5">
                                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eaf5ff] text-[#0B3B60] dark:bg-[#152738] dark:text-[#8df7c1]">
                                  {kind.icon}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="min-w-0 break-words text-xs font-extrabold text-[#1A242D] dark:text-white">
                                      {app.name}
                                    </p>
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${status.className}`}>
                                      {status.icon}
                                      {status.label}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    {kind.label} · Submitted {formatApplicationDate(app.created_at)}
                                    {app.reviewed_at ? ` · Reviewed ${formatApplicationDate(app.reviewed_at)}` : ''}
                                  </p>

                                  {app.status === 'pending' && (
                                    <p className="mt-1 text-[11px] leading-relaxed text-[#334155] dark:text-slate-300">
                                      Waiting for an admin to review this application. You will get an email when a decision is made.
                                    </p>
                                  )}

                                  {app.status === 'approved' && (
                                    <p className="mt-1 text-[11px] leading-relaxed font-semibold text-emerald-700 dark:text-emerald-300">
                                      Approved and live in the marketplace.
                                      {app.review_note ? ` Admin note: ${app.review_note}` : ''}
                                    </p>
                                  )}

                                  {app.status === 'rejected' && (
                                    <div className="mt-1 rounded border border-rose-200 bg-rose-50 p-2 text-[11px] leading-relaxed text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                                      <p className="font-bold">Why it was rejected</p>
                                      <p className="mt-0.5 break-words">{app.review_note || 'No reason was recorded.'}</p>
                                      <p className="mt-1 text-[10px] opacity-80">
                                        Fix the issue, then submit a new application from the relevant tab.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* TRACK 5: STORE OWNER ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && (
            <div className="space-y-4 text-xs">
              {/* Export Toast Banner */}
              {exportToast && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/50 p-2.5 rounded-lg flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-xs font-semibold animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{exportToast}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setExportToast('')}
                    className="text-emerald-600 dark:text-emerald-400 hover:opacity-75"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Store & Timeframe Controls Toolbar */}
              <div className="bg-slate-50 dark:bg-[#152533] p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-[#223749] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#00875A] shrink-0" />
                    <span className="font-bold text-[#002541] dark:text-white text-xs">Store View:</span>
                  </div>
                  <select
                    value={selectedAnalyticsStore}
                    onChange={(e) => setSelectedAnalyticsStore(e.target.value)}
                    className="h-8 px-2.5 bg-white dark:bg-[#0B151F] border border-slate-300 dark:border-[#2A4257] rounded-md text-xs font-semibold text-[#002541] dark:text-slate-100 focus:outline-none focus:border-[#00875A] cursor-pointer"
                  >
                    <option value="all">🌐 All Stores (Consolidated Performance)</option>
                    {availableStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        🏪 {store.name} ({store.locationHub})
                      </option>
                    ))}
                  </select>

                  {/* Store Context Chip */}
                  {currentStoreObj && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#0E1B26] border border-slate-200 dark:border-[#25394A] rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
                      <span className="truncate max-w-[140px] font-semibold text-[#00875A]">
                        {currentStoreObj.name}
                      </span>
                      <span>·</span>
                      <span className="text-amber-500 font-bold">{currentStoreObj.rating} ★</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  {/* Timeframe Selector Pills */}
                  <div className="inline-flex p-0.5 bg-slate-200/80 dark:bg-[#0E1A24] rounded-lg border border-slate-300/80 dark:border-[#223545]">
                    <button
                      type="button"
                      onClick={() => setAnalyticsTimeframe('7d')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        analyticsTimeframe === '7d'
                          ? 'bg-white dark:bg-[#00875A] text-[#002541] dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsTimeframe('30d')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        analyticsTimeframe === '30d'
                          ? 'bg-white dark:bg-[#00875A] text-[#002541] dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsTimeframe('90d')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        analyticsTimeframe === '90d'
                          ? 'bg-white dark:bg-[#00875A] text-[#002541] dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      90 Days
                    </button>
                  </div>

                  {/* CSV Export Button */}
                  <button
                    type="button"
                    onClick={handleExportReport}
                    className="h-8 px-2.5 bg-white dark:bg-[#0E1A24] hover:bg-slate-100 dark:hover:bg-[#1A2C3C] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2A4257] rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Export complete analytics dataset to CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5 text-[#00875A]" />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>
                </div>
              </div>

              {/* 4 Executive KPI Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {/* 1. Total Sales */}
                <div className="bg-white dark:bg-[#13222F] p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-[#223749] shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Total Sales
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#00875A]">
                      <DollarSign className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black text-[#002541] dark:text-white tracking-tight">
                      SLE {summaryMetrics.totalSales.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>+18.4%</span>
                      <span className="text-slate-400 font-normal">vs prev {analyticsTimeframe}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-white/5 pt-1">
                    {summaryMetrics.totalOrders} completed orders
                  </div>
                </div>

                {/* 2. Visitor Count */}
                <div className="bg-white dark:bg-[#13222F] p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-[#223749] shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Store Visitors
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black text-[#002541] dark:text-white tracking-tight">
                      {summaryMetrics.totalVisitors.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                      <Eye className="w-3 h-3" />
                      <span>+12.6%</span>
                      <span className="text-slate-400 font-normal">store footfall</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-white/5 pt-1">
                    Avg. {Math.round(summaryMetrics.totalVisitors / (timeSeriesData.length || 1)).toLocaleString()} daily shoppers
                  </div>
                </div>

                {/* 3. Top-Selling Product */}
                <div className="bg-white dark:bg-[#13222F] p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-[#223749] shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Top Product
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
                      <Award className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#002541] dark:text-white line-clamp-1 leading-snug" title={topProductsChartData[0]?.fullName}>
                      {topProductsChartData[0]?.fullName || 'Verified Merchandise'}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                      <span>{topProductsChartData[0]?.unitsSold || 0} sold</span>
                      <span>·</span>
                      <span>SLE {(topProductsChartData[0]?.revenueSLE || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-white/5 pt-1">
                    #1 revenue generator
                  </div>
                </div>

                {/* 4. Conversion & AOV */}
                <div className="bg-white dark:bg-[#13222F] p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-[#223749] shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Conversion Rate
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black text-[#002541] dark:text-white tracking-tight">
                      {summaryMetrics.conversionRate}%
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                      <span>AOV:</span>
                      <span className="font-bold">SLE {summaryMetrics.avgOrderValue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 border-t border-slate-100 dark:border-white/5 pt-1">
                    High buyer checkout intent
                  </div>
                </div>
              </div>

              {/* RECHARTS BAR CHART 1: Total Sales & Visitor Trends */}
              <div className="bg-white dark:bg-[#13222F] p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#223749] shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#002541] dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#00875A]" />
                      <span>Sales & Visitor Traffic Trends</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Visualizing daily merchandise sales revenue (SLE) against shopper traffic footfall
                    </p>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="inline-flex p-0.5 bg-slate-100 dark:bg-[#0E1A24] rounded-lg border border-slate-200 dark:border-[#223545] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setAnalyticsMetricView('all')}
                      className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        analyticsMetricView === 'all'
                          ? 'bg-[#00875A] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Combined
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsMetricView('sales')}
                      className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        analyticsMetricView === 'sales'
                          ? 'bg-[#00875A] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Sales (SLE)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsMetricView('visitors')}
                      className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                        analyticsMetricView === 'visitors'
                          ? 'bg-[#00875A] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Visitors
                    </button>
                  </div>
                </div>

                {/* Recharts Bar Chart Container */}
                <div className="h-64 sm:h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timeSeriesData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1', opacity: 0.3 }}
                      />

                      {/* Dual Y-Axes if Combined, Single Y-Axis otherwise */}
                      {analyticsMetricView === 'all' ? (
                        <>
                          <YAxis
                            yAxisId="sales"
                            orientation="left"
                            tick={{ fontSize: 10, fill: '#00875A' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `SLE ${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                          />
                          <YAxis
                            yAxisId="visitors"
                            orientation="right"
                            tick={{ fontSize: 10, fill: '#0B3B60' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                          />
                        </>
                      ) : analyticsMetricView === 'sales' ? (
                        <YAxis
                          orientation="left"
                          tick={{ fontSize: 10, fill: '#00875A' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `SLE ${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                        />
                      ) : (
                        <YAxis
                          orientation="left"
                          tick={{ fontSize: 10, fill: '#2563EB' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                        />
                      )}

                      <Tooltip content={<CustomTrendsTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
                      />

                      {/* Render Bars based on view mode */}
                      {analyticsMetricView === 'all' && (
                        <>
                          <Bar
                            yAxisId="sales"
                            dataKey="sales"
                            name="Total Sales (SLE)"
                            fill="#00875A"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                          <Bar
                            yAxisId="visitors"
                            dataKey="visitors"
                            name="Visitor Count"
                            fill="#0B3B60"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                        </>
                      )}

                      {analyticsMetricView === 'sales' && (
                        <Bar
                          dataKey="sales"
                          name="Total Sales (SLE)"
                          fill="#00875A"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={50}
                        >
                          {timeSeriesData.map((entry, index) => {
                            const isMax = entry.sales === Math.max(...timeSeriesData.map((d) => d.sales));
                            return (
                              <Cell
                                key={`cell-sales-${index}`}
                                fill={isMax ? '#00A86B' : '#00875A'}
                              />
                            );
                          })}
                        </Bar>
                      )}

                      {analyticsMetricView === 'visitors' && (
                        <Bar
                          dataKey="visitors"
                          name="Visitor Count"
                          fill="#2563EB"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={50}
                        >
                          {timeSeriesData.map((entry, index) => {
                            const isMax = entry.visitors === Math.max(...timeSeriesData.map((d) => d.visitors));
                            return (
                              <Cell
                                key={`cell-visitors-${index}`}
                                fill={isMax ? '#3B82F6' : '#2563EB'}
                              />
                            );
                          })}
                        </Bar>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RECHARTS BAR CHART 2: Top-Selling Products Visualization */}
              <div className="bg-white dark:bg-[#13222F] p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#223749] shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#002541] dark:text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-amber-500" />
                      <span>Top-Selling Products by Demand & Units</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Comparing units sold and commercial performance across store inventory
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-500/20 self-start sm:self-auto">
                    Ranked by Units Sold
                  </span>
                </div>

                {/* Horizontal Recharts Bar Chart */}
                <div className="h-56 sm:h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topProductsChartData}
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: '#64748B' }}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1', opacity: 0.3 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 11, fill: '#002541' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomProductTooltip />} />
                      <Bar
                        dataKey="unitsSold"
                        name="Units Sold"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={22}
                      >
                        {topProductsChartData.map((_, index) => {
                          const rankColors = ['#00875A', '#0B3B60', '#D97706', '#6366F1', '#0D9488'];
                          return (
                            <Cell
                              key={`cell-top-${index}`}
                              fill={rankColors[index % rankColors.length]}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top-Selling Products Detailed Ranking Table */}
              <div className="bg-white dark:bg-[#13222F] rounded-xl border border-slate-200 dark:border-[#223749] shadow-2xs overflow-hidden">
                <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-[#203445] flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#002541] dark:text-white">
                      Itemized Product Revenue & Stock Health
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Live store catalog breakdown with asking price, volume, and gross sales
                    </p>
                  </div>
                  {onOpenCMS && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCMS();
                      }}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Manage Inventory</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#0E1A24] text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200 dark:border-[#203445]">
                      <tr>
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Product Title & Category</th>
                        <th className="py-2.5 px-3">Unit Price</th>
                        <th className="py-2.5 px-3">Units Sold</th>
                        <th className="py-2.5 px-3">Gross Sales</th>
                        <th className="py-2.5 px-3">Stock Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1C2C3A]">
                      {topProductsChartData.map((product, index) => (
                        <tr
                          key={`row-${index}`}
                          className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                index === 0
                                  ? 'bg-[#00875A]'
                                  : index === 1
                                  ? 'bg-[#0B3B60]'
                                  : index === 2
                                  ? 'bg-amber-500'
                                  : 'bg-slate-500'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={product.image}
                                alt={product.fullName}
                                className="w-9 h-9 object-cover rounded-md border border-slate-200 dark:border-white/10 shrink-0"
                                onError={(e) => {
                                  // Fallback image if broken
                                  (e.target as HTMLImageElement).src = '/products/ankara_kaftan_suit_1791544077747.webp';
                                }}
                              />
                              <div>
                                <div className="font-bold text-[#002541] dark:text-white line-clamp-1 max-w-[200px] sm:max-w-xs">
                                  {product.fullName}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {product.category}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#002541] dark:text-slate-200">
                            SLE {Number(product.priceSLE).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200">
                            {product.unitsSold} units
                          </td>
                          <td className="py-2.5 px-3 font-black text-emerald-700 dark:text-[#8df7c1]">
                            SLE {Number(product.revenueSLE).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (product.stock || 10) > 3
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {(product.stock || 10) > 3 ? `${product.stock || 12} in stock` : 'Low stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Traffic Acquisition & Growth Channels */}
              <div className="bg-slate-50 dark:bg-[#13222F] p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-[#223749] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#002541] dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#00875A]" />
                    <span>Shopper Traffic Acquisition Channels</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Sierra Leone Consumer Inbound Sources
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
                  <div className="bg-white dark:bg-[#0E1A24] p-2.5 rounded-lg border border-slate-200 dark:border-white/5">
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Marketplace Search</span>
                      <span className="text-[#00875A]">52%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#00875A] rounded-full" style={{ width: '52%' }} />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#0E1A24] p-2.5 rounded-lg border border-slate-200 dark:border-white/5">
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">WhatsApp Shares</span>
                      <span className="text-blue-600 dark:text-blue-400">28%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '28%' }} />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#0E1A24] p-2.5 rounded-lg border border-slate-200 dark:border-white/5">
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Flash Deals & Banners</span>
                      <span className="text-amber-500">14%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '14%' }} />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#0E1A24] p-2.5 rounded-lg border border-slate-200 dark:border-white/5">
                    <div className="flex justify-between font-bold mb-1">
                      <span className="text-slate-700 dark:text-slate-300">Direct Hub Pickup</span>
                      <span className="text-indigo-600 dark:text-indigo-400">6%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: '6%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-[#223749]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('single_product')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2C3C] dark:hover:bg-[#253D52] text-[#002541] dark:text-white rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-[#00875A]" />
                    <span>List Another Product</span>
                  </button>

                  {onOpenCMS && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCMS();
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-400/30 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-500" />
                      <span>Open Full Store CMS</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportReport}
                  className="px-3.5 py-1.5 bg-[#00875A] hover:bg-[#00704A] text-white rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#8df7c1]" />
                  <span>Download Full Analytics Report (CSV)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
