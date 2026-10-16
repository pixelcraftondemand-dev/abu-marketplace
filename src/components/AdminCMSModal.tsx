import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Package, 
  Store, 
  Wrench, 
  Image as ImageIcon, 
  Download, 
  Upload, 
  RotateCcw, 
  Sliders, 
  Filter, 
  Eye, 
  ArrowUpDown,
  Check,
  ShieldCheck,
  ExternalLink,
  Save,
  Tag
} from 'lucide-react';
import { Product, Category, VendorStore, BlueCollarService } from '../types';
import { api } from '../services/api';

interface AdminCMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stores: VendorStore[];
  services: BlueCollarService[];
  onUpdateProduct: (product: Product) => void;
  onCreateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onResetCatalog: () => void;
  onShowToast: (msg: string) => void;
}

type CMSTab = 'overview' | 'products' | 'media' | 'stores' | 'services' | 'backup';

const ALL_CATEGORIES: Category[] = [
  'Solar & Power',
  'Phones & Tablets',
  'Electronics & Audio',
  'Home & Living',
  'Fashion & Footwear',
  'Groceries & Non-Perishables',
  'Home & Office Furniture',
  'Appliances & Utensils',
  'Beauty, Perfumes & Hygiene',
  'Baby & Kids Toys',
  'Sports Gears & Jerseys',
  'Power Tools & Safety Gear',
  'Vehicles & E-Bikes',
  'Books, Art & Stationery',
];

export const AdminCMSModal: React.FC<AdminCMSModalProps> = ({
  isOpen,
  onClose,
  products,
  stores,
  services,
  onUpdateProduct,
  onCreateProduct,
  onDeleteProduct,
  onResetCatalog,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<CMSTab>('overview');
  
  // Products Tab State
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'deals'>('all');
  
  // Product Editor State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'editor' | 'browser'>('editor');
  const [mediaSearch, setMediaSearch] = useState('');

  // Media Assets State
  const [mediaAssets, setMediaAssets] = useState<Array<{ fileName: string; url: string; usedBy: any }>>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Load media assets when needed
  const loadMedia = async () => {
    setLoadingMedia(true);
    const assets = await api.getMediaAssets();
    setMediaAssets(assets);
    setLoadingMedia(false);
  };

  React.useEffect(() => {
    if (isOpen && (activeTab === 'media' || isMediaPickerOpen)) {
      loadMedia();
    }
  }, [isOpen, activeTab, isMediaPickerOpen]);

  // Compute duplicate image mappings
  const imageUsageMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach((p) => {
      const list = map.get(p.image) || [];
      list.push(p);
      map.set(p.image, list);
    });
    return map;
  }, [products]);

  // Duplicate images count
  const duplicateImageCount = useMemo(() => {
    let count = 0;
    imageUsageMap.forEach((list) => {
      if (list.length > 1) count += list.length;
    });
    return count;
  }, [imageUsageMap]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategoryFilter !== 'All' && p.category !== selectedCategoryFilter) return false;
      if (stockFilter === 'in_stock' && p.stockCount <= 0) return false;
      if (stockFilter === 'low_stock' && (p.stockCount > 5 || p.stockCount <= 0)) return false;
      if (stockFilter === 'deals' && !p.isFlashDeal) return false;
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategoryFilter, stockFilter, productSearch]);

  if (!isOpen) return null;

  // Handle saving product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editingProduct.title.trim()) {
      onShowToast('Please enter a product title');
      return;
    }
    if (editingProduct.priceSLE <= 0) {
      onShowToast('Price must be greater than 0');
      return;
    }

    if (isCreatingNew) {
      onCreateProduct(editingProduct);
      await api.createProduct(editingProduct);
      onShowToast(`Created product: "${editingProduct.title.slice(0, 20)}..."`);
    } else {
      onUpdateProduct(editingProduct);
      await api.updateProduct(editingProduct.id, editingProduct);
      onShowToast(`Updated product: "${editingProduct.title.slice(0, 20)}..."`);
    }

    setEditingProduct(null);
    setIsCreatingNew(false);
  };

  // Handle duplicating a product
  const handleDuplicateProduct = async (p: Product) => {
    const duplicated: Product = {
      ...p,
      id: `prod-copy-${Date.now()}`,
      title: `${p.title} (Copy)`,
      soldCount: 0,
      reviewCount: 0,
      rating: 5.0,
    };
    onCreateProduct(duplicated);
    await api.duplicateProduct(p.id);
    onShowToast(`Duplicated: "${duplicated.title.slice(0, 24)}"`);
  };

  // Handle deleting a product
  const handleDeleteProduct = async (p: Product) => {
    if (window.confirm(`Are you sure you want to remove "${p.title}" from the catalog?`)) {
      onDeleteProduct(p.id);
      await api.deleteProduct(p.id);
      onShowToast(`Deleted: "${p.title.slice(0, 20)}..."`);
    }
  };

  // Export Catalog
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `abu_marketplace_catalog_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('Catalog exported as JSON');
  };

  // Import Catalog
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported) && imported.length > 0 && imported[0].id && imported[0].title) {
          localStorage.setItem('abu_cms_products', JSON.stringify(imported));
          window.location.reload();
        } else {
          onShowToast('Invalid catalog JSON format');
        }
      } catch (err) {
        onShowToast('Error reading catalog file');
      }
    };
    reader.readAsText(file);
  };

  // Start creating new item
  const handleStartCreate = () => {
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      title: '',
      category: 'Solar & Power',
      priceSLE: 100,
      originalPriceSLE: 120,
      discountPercent: 17,
      rating: 5.0,
      reviewCount: 1,
      soldCount: 0,
      stockCount: 10,
      image: '/products/solar_inverter_power_station_1791485447453.webp',
      sellerName: 'ABU Verified Merchant',
      sellerLocation: 'Freetown Central Hub',
      isVerifiedSeller: true,
      sellerRating: 5.0,
      isFlashDeal: false,
      description: 'High-quality authentic merchandise inspected for Sierra Leone marketplace standards.',
      specifications: {
        'Origin': 'Authorized Stock',
        'Warranty': '1 Year Replacement',
      },
      features: [
        'Inspected for authentic performance',
        'Eligible for same-day delivery across Western Area',
      ],
    };
    setEditingProduct(newProd);
    setIsCreatingNew(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/75 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white dark:bg-[#0B1520] rounded-xl shadow-2xl max-w-6xl w-full border border-[#DCE1E5] dark:border-[#1E2E3D] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-[#002541] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#0B3B60] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF6600] flex items-center justify-center text-white font-black text-sm shadow-xs">
              CMS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  ABU Content Management System
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Standard Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Manage live catalog, images, stock levels, stores & campus services
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close CMS"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 border-b border-[#E7ECF0] dark:border-[#1E2E3D] bg-[#F8FAFC] dark:bg-[#091118] overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-xs font-bold rounded-t-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-[#0B1520] text-[#0B3B60] dark:text-[#38BDF8] border-t-2 border-t-[#FF6600] border-x border-[#E7ECF0] dark:border-[#1E2E3D]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-2 text-xs font-bold rounded-t-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-white dark:bg-[#0B1520] text-[#0B3B60] dark:text-[#38BDF8] border-t-2 border-t-[#FF6600] border-x border-[#E7ECF0] dark:border-[#1E2E3D]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`px-3 py-2 text-xs font-bold rounded-t-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'media'
                ? 'bg-white dark:bg-[#0B1520] text-[#0B3B60] dark:text-[#38BDF8] border-t-2 border-t-[#FF6600] border-x border-[#E7ECF0] dark:border-[#1E2E3D]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media Library & Uniqueness</span>
            {duplicateImageCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {duplicateImageCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stores')}
            className={`px-3 py-2 text-xs font-bold rounded-t-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stores'
                ? 'bg-white dark:bg-[#0B1520] text-[#0B3B60] dark:text-[#38BDF8] border-t-2 border-t-[#FF6600] border-x border-[#E7ECF0] dark:border-[#1E2E3D]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Vendor Stores ({stores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-2 text-xs font-bold rounded-t-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'services'
                ? 'bg-white dark:bg-[#0B1520] text-[#0B3B60] dark:text-[#38BDF8] border-t-2 border-t-[#FF6600] border-x border-[#E7ECF0] dark:border-[#1E2E3D]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Services ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-2 text-xs font-bold rounded-t-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-[#0B1520] text-[#0B3B60] dark:text-[#38BDF8] border-t-2 border-t-[#FF6600] border-x border-[#E7ECF0] dark:border-[#1E2E3D]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Backup & Reset</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white dark:bg-[#0B1520]">
          
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#F8FAFC] dark:bg-[#111D27] p-3.5 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                    <span>Total Products</span>
                    <Package className="w-4 h-4 text-[#0B3B60] dark:text-[#38BDF8]" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {products.length}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    100% active in catalog
                  </div>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#111D27] p-3.5 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                    <span>Image Health</span>
                    <ImageIcon className="w-4 h-4 text-[#00875A]" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {duplicateImageCount === 0 ? '100%' : `${duplicateImageCount} Dupes`}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                    {duplicateImageCount === 0 ? 'Zero duplicate images' : 'Resolve in Media tab'}
                  </div>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#111D27] p-3.5 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                    <span>Approved Stores</span>
                    <Store className="w-4 h-4 text-[#7A1CAC]" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {stores.length}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Verified campus merchants
                  </div>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#111D27] p-3.5 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D]">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                    <span>Blue-Collar Artisans</span>
                    <Wrench className="w-4 h-4 text-[#FF6600]" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {services.length}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                    Electricians, solar tech & AC
                  </div>
                </div>
              </div>

              {/* Status Alert Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#0c1a29] dark:to-[#122338] p-4 rounded-lg border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#0B3B60] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      High-Performance CMS Synchronized
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      All edits in this CMS update the live catalog immediately. Images are served in modern WebP format with HTTP cache-control headers for instantaneous homepage loads.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="bg-[#0B3B60] hover:bg-[#002541] dark:bg-[#38BDF8] dark:hover:bg-[#0284C7] text-white dark:text-[#002541] text-xs font-bold px-3 py-1.5 rounded cursor-pointer whitespace-nowrap transition-colors"
                >
                  Manage Products →
                </button>
              </div>

              {/* Categories Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  Catalog Distribution by Category
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ALL_CATEGORIES.map((cat) => {
                    const count = products.filter((p) => p.category === cat).length;
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          setSelectedCategoryFilter(cat);
                          setActiveTab('products');
                        }}
                        className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#111D27] border border-[#E7ECF0] dark:border-[#1E2E3D] hover:border-[#0B3B60] dark:hover:border-[#38BDF8] cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {cat}
                        </span>
                        <span className="font-bold text-[#0B3B60] dark:text-[#38BDF8] bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-[10px]">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Product Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex flex-1 items-center gap-2">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by title, seller, ID..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-md text-slate-900 dark:text-white focus:outline-none focus:border-[#0B3B60]"
                    />
                  </div>

                  {/* Category Filter */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="py-1.5 px-2.5 text-xs bg-[#F8FAFC] dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-md text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="All">All Categories ({products.length})</option>
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Stock Filter */}
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="py-1.5 px-2.5 text-xs bg-[#F8FAFC] dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-md text-slate-900 dark:text-white focus:outline-none hidden md:block"
                  >
                    <option value="all">All Inventory</option>
                    <option value="in_stock">In Stock Only</option>
                    <option value="low_stock">Low Stock (≤ 5)</option>
                    <option value="deals">Flash Deals</option>
                  </select>
                </div>

                {/* Add New Product Button */}
                <button
                  onClick={handleStartCreate}
                  className="bg-[#00875A] hover:bg-[#006f4a] text-white text-xs font-bold px-3 py-1.5 rounded-md flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Products Table */}
              <div className="border border-[#E7ECF0] dark:border-[#1E2E3D] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] dark:bg-[#111D27] text-slate-600 dark:text-slate-400 border-b border-[#E7ECF0] dark:border-[#1E2E3D]">
                      <tr>
                        <th className="py-2.5 px-3 font-bold w-12">Image</th>
                        <th className="py-2.5 px-3 font-bold">Product Title & Category</th>
                        <th className="py-2.5 px-3 font-bold w-28">Price (SLE)</th>
                        <th className="py-2.5 px-3 font-bold w-20">Stock</th>
                        <th className="py-2.5 px-3 font-bold hidden sm:table-cell">Seller</th>
                        <th className="py-2.5 px-3 font-bold text-right w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7ECF0] dark:divide-[#1E2E3D]">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No products match your search or filter.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const isDupe = (imageUsageMap.get(p.image)?.length || 0) > 1;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#15222E]/50 transition-colors">
                              {/* Thumbnail */}
                              <td className="py-2 px-3">
                                <div className="w-10 h-10 rounded border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 relative">
                                  <img
                                    src={p.image}
                                    alt={p.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/products/solar_inverter_power_station_1791485447453.webp';
                                    }}
                                  />
                                  {isDupe && (
                                    <span
                                      title="Duplicate image! Multiple products use this image."
                                      className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-tl-sm flex items-center justify-center text-[8px] text-white font-bold"
                                    >
                                      !
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Title & Category */}
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                                  {p.title}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {p.category}
                                  </span>
                                  {p.isFlashDeal && (
                                    <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-[9px] font-bold px-1 rounded">
                                      Deal
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Price */}
                              <td className="py-2 px-3 font-bold text-[#0B3B60] dark:text-[#38BDF8]">
                                SLE {new Intl.NumberFormat('en-US').format(p.priceSLE)}
                              </td>

                              {/* Stock */}
                              <td className="py-2 px-3">
                                <span className={`font-semibold ${
                                  p.stockCount <= 3 
                                    ? 'text-red-500' 
                                    : p.stockCount <= 10 
                                    ? 'text-amber-500' 
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {p.stockCount} in stock
                                </span>
                              </td>

                              {/* Seller */}
                              <td className="py-2 px-3 hidden sm:table-cell text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1">
                                  <span className="truncate max-w-[140px]">{p.sellerName}</span>
                                  {p.isVerifiedSeller && (
                                    <CheckCircle2 className="w-3 h-3 text-[#00875A] shrink-0" />
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingProduct({ ...p });
                                      setIsCreatingNew(false);
                                    }}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                                    title="Edit Product"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDuplicateProduct(p)}
                                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                                    title="Duplicate Product"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(p)}
                                    className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 cursor-pointer"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. MEDIA LIBRARY & IMAGE UNIQUENESS TAB */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Verified Product Media Assets ({mediaAssets.length > 0 ? mediaAssets.length : 105} Verified Files)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All images are stored in optimized WebP format with HTTP caching headers. Every product has a distinct, high-resolution photo.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search images by name..."
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-md text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Duplicate Analysis Card */}
              <div className={`p-3.5 rounded-lg border ${
                duplicateImageCount === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              } flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  {duplicateImageCount === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <div className="text-xs">
                    <span className="font-bold">
                      {duplicateImageCount === 0 
                        ? '100% Unique Image Integrity: No duplicate images detected across the catalog!' 
                        : `Attention: ${duplicateImageCount} products share overlapping images.`}
                    </span>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {duplicateImageCount === 0
                        ? 'Every product displays its own distinct verified product asset.'
                        : 'Click on any product below to assign an unassigned asset.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid of Verified Images */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {products
                  .filter((p) => !mediaSearch || p.title.toLowerCase().includes(mediaSearch.toLowerCase()) || p.image.toLowerCase().includes(mediaSearch.toLowerCase()))
                  .map((p) => {
                    return (
                      <div
                        key={p.id}
                        className="bg-[#F8FAFC] dark:bg-[#111D27] border border-[#E7ECF0] dark:border-[#1E2E3D] rounded-md p-2 flex flex-col justify-between"
                      >
                        <div className="relative aspect-square w-full rounded overflow-hidden bg-white dark:bg-black/20 mb-2">
                          <img
                            src={p.image}
                            alt={p.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1" title={p.title}>
                            {p.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {p.image.replace('/products/', '')}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingProduct({ ...p });
                            setIsCreatingNew(false);
                            setActiveTab('products');
                          }}
                          className="mt-2 w-full py-1 text-[10px] font-bold bg-[#E7ECF0] dark:bg-[#1E2E3D] hover:bg-[#0B3B60] hover:text-white rounded transition-colors cursor-pointer text-center"
                        >
                          Edit Image
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 4. STORES TAB */}
          {activeTab === 'stores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Vendor Stores Directory ({stores.length} Registered Stores)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verified storefronts operating in Freetown, Bo, Makeni, and Kenema.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {stores.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D] bg-[#F8FAFC] dark:bg-[#111D27] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {st.name}
                        </span>
                        {st.isVerified && (
                          <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {st.tagline || st.description}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span>📍 {st.locationHub}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. SERVICES TAB */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Campus Artisans & Blue-Collar Services ({services.length} Registered)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Certified solar technicians, plumbers, electricians, and mechanics for on-demand campus consultations.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3.5 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D] bg-[#F8FAFC] dark:bg-[#111D27] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {srv.providerName}
                        </span>
                        <span className="text-xs font-extrabold text-[#0B3B60] dark:text-[#38BDF8]">
                          SLE {srv.calloutFeeSLE} consultation
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1">
                        {srv.tradeCategory}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {srv.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. BACKUP & SYSTEM RESET TAB */}
          {activeTab === 'backup' && (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              <div className="bg-[#F8FAFC] dark:bg-[#111D27] p-5 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#0B3B60] dark:text-[#38BDF8]" />
                  <span>Export Catalog Backup</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Download the current state of all {products.length} products, categories, and settings as a JSON file.
                </p>
                <button
                  onClick={handleExportJSON}
                  className="bg-[#0B3B60] hover:bg-[#002541] text-white text-xs font-bold px-4 py-2 rounded-md cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Catalog JSON</span>
                </button>
              </div>

              <div className="bg-[#F8FAFC] dark:bg-[#111D27] p-5 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#7A1CAC]" />
                  <span>Import Catalog Backup</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Upload a previously saved JSON backup to replace or restore the catalog.
                </p>
                <label className="inline-flex items-center gap-1.5 bg-[#7A1CAC] hover:bg-[#5b1482] text-white text-xs font-bold px-4 py-2 rounded-md cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Choose JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-lg border border-red-200 dark:border-red-900/40">
                <h3 className="text-sm font-bold text-red-900 dark:text-red-300 mb-1 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span>Factory Reset Catalog</span>
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400 mb-3">
                  Revert all products and inventory back to the verified default 105 products with 100% unique local images.
                </p>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to reset the catalog to standard factory defaults?')) {
                      onResetCatalog();
                      await api.resetCatalog();
                      onShowToast('Catalog reset to standard verified inventory!');
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-md cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Factory Defaults</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Product Edit / Create Modal Sub-Dialog */}
        {editingProduct && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white dark:bg-[#0B1520] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-3 mb-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isCreatingNew ? 'Create New Product' : 'Edit Product'}
                </h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.title}
                    onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] text-slate-900 dark:text-white focus:outline-none focus:border-[#0B3B60]"
                    placeholder="e.g. SolarVolt 2000W Pure Sine Wave Power Station"
                  />
                </div>

                {/* Category & Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as Category })}
                      className="w-full text-xs p-2.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] text-slate-900 dark:text-white focus:outline-none"
                    >
                      {ALL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Stock Count *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editingProduct.stockCount}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stockCount: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Pricing: Price SLE & Original Price SLE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Selling Price (SLE) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingProduct.priceSLE}
                      onChange={(e) => {
                        const price = Number(e.target.value);
                        const orig = Math.max(editingProduct.originalPriceSLE, price);
                        const disc = orig > price ? Math.round(((orig - price) / orig) * 100) : 0;
                        setEditingProduct({
                          ...editingProduct,
                          priceSLE: price,
                          discountPercent: disc,
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] text-slate-900 dark:text-white focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Original Price (SLE) for Strikethrough
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingProduct.originalPriceSLE}
                      onChange={(e) => {
                        const orig = Number(e.target.value);
                        const price = editingProduct.priceSLE;
                        const disc = orig > price ? Math.round(((orig - price) / orig) * 100) : 0;
                        setEditingProduct({
                          ...editingProduct,
                          originalPriceSLE: orig,
                          discountPercent: disc,
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Image URL & Live Preview with Uniqueness Check */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Product Image Path or URL *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsMediaPickerOpen(true)}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Browse Media Library</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={editingProduct.image}
                      onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                      className="flex-1 text-xs p-2 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] text-slate-900 dark:text-white focus:outline-none"
                      placeholder="/products/filename.webp or URL"
                    />
                  </div>

                  {/* Preview Thumbnail */}
                  <div className="mt-2 flex items-center gap-3 p-2 bg-[#F8FAFC] dark:bg-[#111D27] rounded border border-[#E7ECF0] dark:border-[#1E2E3D]">
                    <div className="w-14 h-14 rounded overflow-hidden bg-white dark:bg-black/20 shrink-0 border border-slate-200 dark:border-slate-800">
                      <img
                        src={editingProduct.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/products/solar_inverter_power_station_1791485447453.webp';
                        }}
                      />
                    </div>
                    <div className="text-[11px] flex-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Live Image Preview
                      </span>
                      {imageUsageMap.get(editingProduct.image)?.filter((p) => p.id !== editingProduct.id).length ? (
                        <div className="text-red-500 font-semibold mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Image already used by another item. Please choose a unique image!</span>
                        </div>
                      ) : (
                        <div className="text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Unique verified product image</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seller & Deals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Seller / Merchant Name
                    </label>
                    <input
                      type="text"
                      value={editingProduct.sellerName}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sellerName: e.target.value })}
                      className="w-full text-xs p-2.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={editingProduct.isFlashDeal || false}
                        onChange={(e) => setEditingProduct({ ...editingProduct, isFlashDeal: e.target.checked })}
                        className="rounded text-[#0B3B60]"
                      />
                      <span>Flash Deal Banner</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={editingProduct.isVerifiedSeller}
                        onChange={(e) => setEditingProduct({ ...editingProduct, isVerifiedSeller: e.target.checked })}
                        className="rounded text-[#00875A]"
                      />
                      <span>Verified Merchant</span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full text-xs p-2.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7ECF0] dark:border-[#1E2E3D]">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-[#00875A] hover:bg-[#006f4a] text-white rounded cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isCreatingNew ? 'Create & Publish' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Media Picker Sub-Drawer */}
        {isMediaPickerOpen && (
          <div className="fixed inset-0 z-70 bg-black/75 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white dark:bg-[#0B1520] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-xl max-w-3xl w-full p-4 sm:p-6 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-3 mb-3 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Select Verified Product Image
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose any of the 105 optimized WebP images on the server
                  </p>
                </div>
                <button
                  onClick={() => setIsMediaPickerOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 overflow-y-auto flex-1 p-1">
                {products.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (editingProduct) {
                        setEditingProduct({
                          ...editingProduct,
                          image: item.image,
                        });
                      }
                      setIsMediaPickerOpen(false);
                      onShowToast(`Selected image for "${item.title.slice(0, 16)}..."`);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#0B3B60] dark:hover:border-[#38BDF8] cursor-pointer bg-slate-50 dark:bg-slate-900 flex flex-col items-center group transition-all"
                  >
                    <div className="aspect-square w-full rounded overflow-hidden bg-white dark:bg-black/30 mb-1">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[9px] text-slate-700 dark:text-slate-300 font-semibold line-clamp-1 text-center">
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
