import React, { useState, useMemo, useEffect } from 'react';
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
  Filter,
  Layers,
  ExternalLink,
  FileSpreadsheet,
  Award
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
import { Category, Product, VendorStore, BlueCollarService, TradeCategory, ItemCondition } from '../types';
import { detectCarrier, INITIAL_PRODUCTS, INITIAL_STORES } from '../data/mockData';
import { api } from '../services/api';
import { AbuLogo } from './AbuLogo';

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

interface MerchantHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  onAddStore?: (store: VendorStore) => void;
  onAddService?: (service: BlueCollarService) => void;
  onOpenCMS?: () => void;
  products?: Product[];
  stores?: VendorStore[];
  initialTab?: 'store' | 'single_product' | 'service' | 'analytics';
}

export const MerchantHubModal: React.FC<MerchantHubModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  onAddStore,
  onAddService,
  onOpenCMS,
  products = [],
  stores = [],
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'single_product' | 'service' | 'analytics'>(initialTab || 'store');
  const [successMessage, setSuccessMessage] = useState('');
  const [exportToast, setExportToast] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initialTab when modal opens or initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

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
    if (!storeName || !storePhone) return;

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
      logo: '/src/assets/images/flagship_smartphone_device_1791485459581.jpg',
    };

    const createdStore = await api.createStore(storePayload);
    const finalStore: VendorStore = createdStore || {
      id: `store-${Date.now()}`,
      name: storeName.trim(),
      slug: storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      tagline: storeTagline.trim() || 'Verified Merchant Store',
      description: storeDesc.trim() || 'Authorized storefront on ABU Marketplace.',
      locationHub: storeHub,
      province: 'Western Area',
      streetAddress: storeStreet.trim() || 'Freetown',
      phone: storePhone.trim(),
      payoutProvider: detection.carrier || 'orange',
      payoutPhone: storePhone.trim(),
      isVerified: true,
      rating: 5.0,
      reviewsCount: 1,
      totalSales: 0,
      establishedYear: new Date().getFullYear(),
      logo: '/src/assets/images/flagship_smartphone_device_1791485459581.jpg',
      productCount: 0,
    };

    if (onAddStore) onAddStore(finalStore);
    setIsSubmitting(false);
    setSuccessMessage(`Store "${finalStore.name}" created successfully!`);
    setStoreName('');
    setStoreTagline('');
    setStoreDesc('');
  };

  const handleSingleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTitle || !singlePrice) return;

    setIsSubmitting(true);
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

    const createdProd = await api.createProduct(productPayload);
    const finalProduct: Product = createdProd || {
      id: `prod-single-${Date.now()}`,
      title: singleTitle.trim(),
      category: singleCategory,
      priceSLE: price,
      originalPriceSLE: originalPrice,
      discountPercent: 15,
      rating: 5.0,
      reviewCount: 1,
      soldCount: 0,
      stockCount: 1,
      image: assignedImage,
      sellerName: singleSellerName.trim() || 'Individual Seller',
      sellerLocation: `${singleLocation} (Verified)`,
      isVerifiedSeller: true,
      sellerRating: 5.0,
      isFlashDeal: false,
      condition: singleCondition,
      sellerType: 'individual',
      sellerPhone: singlePhone,
      description: singleDesc.trim() || `Condition: ${singleCondition}. Direct seller sale.`,
      specifications: {
        'Condition': singleCondition.replace('_', ' ').toUpperCase(),
        'Seller Contact': `+232 ${singlePhone}`,
        'Location': singleLocation,
      },
      features: [
        'Single verified inventory item',
        'Direct inquiry or instant ABU courier checkout',
      ],
    };

    onAddProduct(finalProduct);
    setIsSubmitting(false);
    setSuccessMessage(`Single item "${finalProduct.title}" is now listed live on ABU Marketplace!`);
    setSingleTitle('');
    setSinglePrice('');
    setSingleDesc('');
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle || !providerName || !servicePhone) return;

    setIsSubmitting(true);
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

    const createdService = await api.createService(servicePayload);
    const finalService: BlueCollarService = createdService || {
      id: `srv-${Date.now()}`,
      title: serviceTitle.trim(),
      tradeCategory,
      providerName: providerName.trim(),
      phone: servicePhone.trim(),
      whatsapp: servicePhone.trim(),
      payoutProvider: detection.carrier || 'orange',
      experienceYears: parseInt(experienceYears, 10) || 5,
      locationHub: serviceHub,
      province: 'Western Area',
      coverageAreas: ['Western Area', serviceHub],
      calloutFeeSLE: parseFloat(calloutFeeSLE) || 100,
      pricingModel: 'flat_callout',
      rating: 5.0,
      completedJobs: 0,
      isAvailableNow: true,
      avatar: '/src/assets/images/solar_inverter_power_station_1791485447453.jpg',
      description: 'Professional trade technician available across Sierra Leone.',
      skills: skills.length > 0 ? skills : ['On-site diagnosis', 'Standard tools supplied'],
      certification: certification.trim() || 'Certified Guild Artisan SL',
    };

    if (onAddService) onAddService(finalService);
    setIsSubmitting(false);
    setSuccessMessage(`Artisan "${finalService.providerName}" registered under ${finalService.tradeCategory}!`);
    setServiceTitle('');
    setProviderName('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/75 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className={`relative bg-white dark:bg-[#111D27] text-[#1A242D] dark:text-[#F1F5F9] rounded-t-2xl sm:rounded-lg shadow-2xl ${activeTab === 'analytics' ? 'max-w-4xl' : 'max-w-2xl'} w-full border border-[#DCE1E5] dark:border-[#1E2E3D] overflow-hidden max-h-[92vh] flex flex-col transition-all duration-200`}
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
                Stores · Single Product Listings · Artisan Services · Store Analytics
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

        {/* 4-Track Selector Bar */}
        <div className="grid grid-cols-4 bg-[#eaf5ff] dark:bg-[#152738] border-b border-[#DCE1E5] dark:border-[#1E2E3D] p-1.5 gap-1.5 text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('store');
              setSuccessMessage('');
            }}
            className={`py-2 px-1 sm:px-1.5 rounded font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'store'
                ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1720] text-[#1A242D] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Create Store</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('single_product');
              setSuccessMessage('');
            }}
            className={`py-2 px-1 sm:px-1.5 rounded font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'single_product'
                ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1720] text-[#1A242D] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">List Product</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('service');
              setSuccessMessage('');
            }}
            className={`py-2 px-1 sm:px-1.5 rounded font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeTab === 'service'
                ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1720] text-[#1A242D] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">Offer Service</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('analytics');
              setSuccessMessage('');
            }}
            className={`py-2 px-1 sm:px-1.5 rounded font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer relative ${
              activeTab === 'analytics'
                ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white shadow-xs'
                : 'bg-white dark:bg-[#0E1720] text-[#1A242D] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-[#8df7c1]" />
            <span className="truncate text-[11px] sm:text-xs">Analytics</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1.5 right-1.5 animate-pulse" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-4">
          {successMessage && (
            <div className="bg-[#eaf5ff] border border-[#00875A] p-3 rounded flex items-center gap-2 text-xs text-[#00875A] font-bold">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TRACK 1: CREATE A STORE */}
          {activeTab === 'store' && (
            <form onSubmit={handleStoreSubmit} className="space-y-3.5 text-xs">
              <div className="bg-[#f5faff] p-3 rounded border border-[#DCE1E5]">
                <h4 className="font-bold text-[#0B3B60] mb-1">
                  Full Merchant Storefront
                </h4>
                <p className="text-[11px] text-[#5A6872]">
                  For shop owners and wholesale distributors. Get your dedicated branded storefront with product collections and verified merchant badge.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Store / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Lumley Solar Hub SL"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Store Catchphrase / Tagline
                  </label>
                  <input
                    type="text"
                    value={storeTagline}
                    onChange={(e) => setStoreTagline(e.target.value)}
                    placeholder="e.g. Genuine Solar & Power Backup Systems"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Fulfillment Hub / City *
                  </label>
                  <select
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
                  <label className="block font-bold text-[#1A242D] mb-1">
                    Merchant Contact Phone (+232) *
                  </label>
                  <input
                    type="text"
                    required
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="076 123 456"
                    className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A242D] mb-1">
                  Physical Showroom Address
                </label>
                <input
                  type="text"
                  value={storeStreet}
                  onChange={(e) => setStoreStreet(e.target.value)}
                  placeholder="e.g. 18 Lumley Beach Road, Freetown"
                  className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A242D] mb-1">
                  Store Description
                </label>
                <textarea
                  rows={2}
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  placeholder="Tell buyers about your products, warranties, and store history..."
                  className="w-full p-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !storeName}
                className="w-full h-10 bg-[#0B3B60] hover:bg-[#002541] disabled:opacity-50 text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#8df7c1]" />
                <span>
                  {isSubmitting ? 'Registering Storefront...' : 'Launch Verified Storefront'}
                </span>
              </button>
            </form>
          )}

          {/* TRACK 2: LIST SINGLE ITEM */}
          {activeTab === 'single_product' && (
            <form onSubmit={handleSingleProductSubmit} className="space-y-3.5 text-xs">
              <div className="bg-[#f5faff] p-3 rounded border border-[#DCE1E5]">
                <h4 className="font-bold text-[#0B3B60] mb-1">
                  Quick Single-Item Listing
                </h4>
                <p className="text-[11px] text-[#5A6872]">
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
            <form onSubmit={handleServiceSubmit} className="space-y-3.5 text-xs">
              <div className="bg-[#f5faff] p-3 rounded border border-[#DCE1E5]">
                <h4 className="font-bold text-[#0B3B60] mb-1">
                  Blue-Collar Artisan & Technician Registration
                </h4>
                <p className="text-[11px] text-[#5A6872]">
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

          {/* TRACK 4: STORE OWNER ANALYTICS DASHBOARD */}
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
