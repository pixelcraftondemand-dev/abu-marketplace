import React, { useState, useMemo, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  MinimalHeroBanner 
} from './components/MinimalHeroBanner';
import { 
  CategoryIconRow 
} from './components/CategoryIconRow';
import { 
  CategoryChips 
} from './components/CategoryChips';
import { 
  ProductCard 
} from './components/ProductCard';
import { 
  ProductDetailModal 
} from './components/ProductDetailModal';
import { 
  CartDrawer 
} from './components/CartDrawer';
import { 
  CheckoutModal 
} from './components/CheckoutModal';
import { 
  OrderConfirmationModal 
} from './components/OrderConfirmationModal';
import { 
  OrderTrackingModal 
} from './components/OrderTrackingModal';
import { 
  MerchantHubModal 
} from './components/MerchantHubModal';
import { 
  LocationPickerModal 
} from './components/LocationPickerModal';
import { 
  WishlistDrawer 
} from './components/WishlistDrawer';
import { 
  BlueCollarServicesView 
} from './components/BlueCollarServicesView';
import { 
  ServiceBookingModal 
} from './components/ServiceBookingModal';
import { 
  StoresDirectoryView 
} from './components/StoresDirectoryView';
import { 
  ChatbotWidget 
} from './components/ChatbotWidget';
import { 
  Footer 
} from './components/Footer';
import { 
  WhatsAppAuthModal 
} from './components/WhatsAppAuthModal';

import { 
  Category, 
  Product, 
  CartItem, 
  LocationNode, 
  Order, 
  MobileMoneyProvider,
  VendorStore,
  BlueCollarService,
  UserProfile
} from './types';
import { 
  INITIAL_PRODUCTS, 
  SIERRA_LEONE_LOCATIONS,
  INITIAL_STORES,
  INITIAL_SERVICES
} from './data/mockData';
import { api } from './services/api';
import { 
  PackageSearch,
  CheckCircle2,
  Building2,
  Wrench,
  ArrowRight,
  X,
  Sparkles,
  Sun,
  Smartphone,
  Headphones,
  UtensilsCrossed,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  // WhatsApp Authentication state (persisted)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('abu_marketplace_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isWhatsAppAuthOpen, setIsWhatsAppAuthOpen] = useState(false);

  // 1. Navigation View Mode ('marketplace' | 'services' | 'stores')
  const [activeView, setActiveView] = useState<'marketplace' | 'services' | 'stores'>('marketplace');


  // 2. Core Datasets
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [stores, setStores] = useState<VendorStore[]>(INITIAL_STORES);
  const [services, setServices] = useState<BlueCollarService[]>(INITIAL_SERVICES);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState<LocationNode>(SIERRA_LEONE_LOCATIONS[0]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<VendorStore | null>(null);
  
  // Filtering & Sorting
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating' | 'sold'>('featured');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Cart & Wishlist
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedServiceToBook, setSelectedServiceToBook] = useState<BlueCollarService | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutInitialMethod, setCheckoutInitialMethod] = useState<MobileMoneyProvider>('orange');
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isMerchantHubOpen, setIsMerchantHubOpen] = useState(false);
  const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with backend API on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [remoteProducts, remoteLocations, remoteStores, remoteServices] = await Promise.all([
          api.getProducts(),
          api.getLocations(),
          api.getStores(),
          api.getServices(),
        ]);
        if (remoteProducts && remoteProducts.length > 0) {
          setProducts(remoteProducts);
        }
        if (remoteLocations && remoteLocations.length > 0) {
          const matched = remoteLocations.find((l) => l.id === currentLocation.id);
          if (matched) setCurrentLocation(matched);
        }
        if (remoteStores && remoteStores.length > 0) {
          setStores(remoteStores);
        }
        if (remoteServices && remoteServices.length > 0) {
          setServices(remoteServices);
        }
      } catch (e) {
        console.warn('Backend hydration notice:', e);
      }
    }
    loadBackendData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Categories list
  const categories: Category[] = [
    'All',
    'Solar & Power',
    'Phones & Tablets',
    'Electronics & Audio',
    'Home & Living',
    'Fashion & Footwear',
  ];

  // Product counts per category
  const productCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      'All': products.length,
      'Solar & Power': 0,
      'Phones & Tablets': 0,
      'Electronics & Audio': 0,
      'Home & Living': 0,
      'Fashion & Footwear': 0,
      'Blue Collar Services': services.length,
    };
    products.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category] += 1;
      }
    });
    return counts;
  }, [products, services]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Store filter if set
      if (selectedStoreFilter) {
        const matchesStore = p.sellerName.toLowerCase().includes(selectedStoreFilter.name.toLowerCase().slice(0, 6));
        if (!matchesStore) return false;
      }
      // Category filter
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesSeller = p.sellerName.toLowerCase().includes(q) || p.sellerLocation.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSeller) return false;
      }
      // Verified only
      if (onlyVerified && !p.isVerifiedSeller) return false;
      // In stock only
      if (inStockOnly && p.stockCount <= 0) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.priceSLE - b.priceSLE;
      if (sortBy === 'price-desc') return b.priceSLE - a.priceSLE;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'sold') return b.soldCount - a.soldCount;
      return 0;
    });
  }, [products, selectedCategory, searchQuery, onlyVerified, inStockOnly, sortBy, selectedStoreFilter]);

  // Sections for Minimalist Screenshot Layout when on default "All" view without active search/store filter
  const isSectionedHome = activeView === 'marketplace' && selectedCategory === 'All' && !searchQuery.trim() && !selectedStoreFilter && !onlyVerified && !inStockOnly && sortBy === 'featured';

  const fashionProducts = useMemo(() => products.filter((p) => p.category === 'Fashion & Footwear'), [products]);
  const solarProducts = useMemo(() => products.filter((p) => p.category === 'Solar & Power'), [products]);
  const phoneProducts = useMemo(() => products.filter((p) => p.category === 'Phones & Tablets'), [products]);
  const homeProducts = useMemo(() => products.filter((p) => p.category === 'Home & Living'), [products]);
  const techProducts = useMemo(() => products.filter((p) => p.category === 'Electronics & Audio'), [products]);

  // WhatsApp Auth Handlers
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('abu_marketplace_user', JSON.stringify(user));
    } catch {}
    showToast(`Signed in via WhatsApp as ${user.name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('abu_marketplace_user');
    } catch {}
    showToast('Logged out of WhatsApp session');
  };

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(product.stockCount, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    showToast(`Added "${product.title.slice(0, 24)}..." to cart`);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleFastBuy = (product: Product, quantity: number, paymentMethod: MobileMoneyProvider) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity } : item
        );
      }
      return [{ product, quantity }];
    });
    setCheckoutInitialMethod(paymentMethod);
    setIsCheckoutOpen(true);
  };

  // Wishlist Handlers
  const isWishlisted = (product: Product) => {
    return wishlist.some((p) => p.id === product.id);
  };

  const handleToggleWishlist = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isWishlisted(product)) {
      setWishlist((prev) => prev.filter((p) => p.id !== product.id));
      showToast('Removed from wishlist');
    } else {
      setWishlist((prev) => [...prev, product]);
      showToast('Saved to wishlist');
    }
  };

  const handleRemoveFromWishlist = (product: Product) => {
    setWishlist((prev) => prev.filter((p) => p.id !== product.id));
  };

  // Order Placement Success
  const handleOrderSuccess = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    setCartItems([]);
    setIsCheckoutOpen(false);
    setConfirmedOrder(newOrder);
  };

  // Creation track handlers
  const handleAddNewProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    showToast(`"${newProd.title.slice(0, 24)}..." is now listed live!`);
  };

  const handleAddNewStore = (newStore: VendorStore) => {
    setStores((prev) => [newStore, ...prev]);
    showToast(`Store "${newStore.name}" created successfully!`);
    setActiveView('stores');
  };

  const handleAddNewService = (newSrv: BlueCollarService) => {
    setServices((prev) => [newSrv, ...prev]);
    showToast(`Artisan "${newSrv.providerName}" registered!`);
    setActiveView('services');
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cartItems.reduce(
    (sum, item) => sum + item.product.priceSLE * item.quantity,
    0
  );

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex flex-col font-sans antialiased text-[#1A242D] relative [&>*]:min-w-0">
      {/* 1. Header with Abu Logo and 3-Track Mode navigation */}
      <Header
        currentLocation={currentLocation}
        onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
        cartCount={totalCartCount}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenMerchantHub={() => setIsMerchantHubOpen(true)}
        onOpenOrderTracking={() => setIsOrderTrackingOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        activeView={activeView}
        onSelectView={setActiveView}
        currentUser={currentUser}
        onOpenWhatsAppAuth={() => setIsWhatsAppAuthOpen(true)}
      />

      {/* VIEW: BLUE-COLLAR SERVICES */}
      {activeView === 'services' && (
        <BlueCollarServicesView
          services={services}
          onBookService={(srv) => setSelectedServiceToBook(srv)}
          onOpenRegisterModal={() => setIsMerchantHubOpen(true)}
        />
      )}

      {/* VIEW: STORES DIRECTORY */}
      {activeView === 'stores' && (
        <StoresDirectoryView
          stores={stores}
          onSelectStore={(st) => {
            setSelectedStoreFilter(st);
            setActiveView('marketplace');
            showToast(`Viewing storefront: ${st.name}`);
          }}
          onOpenCreateStore={() => setIsMerchantHubOpen(true)}
        />
      )}

      {/* VIEW: MARKETPLACE PRODUCTS (MINIMALIST SCREENSHOT LAYOUT) */}
      {activeView === 'marketplace' && (
        <>
          {/* Subtle Warm Lifestyle Hero Banner */}
          <MinimalHeroBanner 
            onSelectCategory={setSelectedCategory}
            onOpenWhatsAppAuth={() => setIsWhatsAppAuthOpen(true)}
          />

          {/* "Shop by Category" Circular Icons Row */}
          <CategoryIconRow
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            activeView={activeView}
            onSelectView={setActiveView}
          />

          {/* Active Store Filter Notice if selected */}
          {selectedStoreFilter && (
            <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-6 pt-2">
              <div className="bg-white border border-[#E7ECF0] p-3 rounded flex items-center justify-between text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0B3B60]" />
                  <span className="font-bold text-[#0B3B60]">
                    Storefront: {selectedStoreFilter.name}
                  </span>
                  <span className="text-[#5A6872] hidden sm:inline">
                    · {selectedStoreFilter.locationHub}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStoreFilter(null)}
                  className="bg-[#F4F6F8] hover:bg-slate-200 text-[#1A242D] px-2.5 py-1 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All Products</span>
                </button>
              </div>
            </div>
          )}

          {/* Minimal Horizontal Category Pill Filters */}
          <CategoryChips
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            productCounts={productCounts}
          />

          {/* Sectioned Feed matching Screenshot */}
          {isSectionedHome ? (
            <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-6 py-4 space-y-8">
              {/* SECTION 1: Top Picks */}
              <section>
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] pb-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#1A242D] tracking-tight">
                    Top Picks & Best Sellers
                  </h2>
                  <button
                    onClick={() => setSortBy('sold')}
                    className="text-xs text-[#0B3B60] hover:underline font-semibold"
                  >
                    View All
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
                  {products.slice(0, 5).map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                      isWishlisted={isWishlisted(prod)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>

              {/* SECTION 2: Fashion & Footwear (West African Couture & Leather) */}
              <section>
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D84315]" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] tracking-tight">
                      Fashion & Footwear Spotlight (West African Couture & Leather)
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Fashion & Footwear')}
                    className="text-xs text-[#0B3B60] hover:underline font-semibold"
                  >
                    View All Fashion ({fashionProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                  {fashionProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                      isWishlisted={isWishlisted(prod)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>

              {/* SECTION 3: Solar & Power Backup */}
              <section>
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] pb-2">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-[#FF6600]" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] tracking-tight">
                      Solar & Power Backup Systems
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Solar & Power')}
                    className="text-xs text-[#0B3B60] hover:underline font-semibold"
                  >
                    View All Solar ({solarProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {solarProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                      isWishlisted={isWishlisted(prod)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>

              {/* SECTION 4: Phones & Technology */}
              <section>
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] pb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#00875A]" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] tracking-tight">
                      Phones & Mobile Tech
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Phones & Tablets')}
                    className="text-xs text-[#0B3B60] hover:underline font-semibold"
                  >
                    View All ({phoneProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-4">
                  {phoneProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                      isWishlisted={isWishlisted(prod)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>

              {/* SECTION 5: Audio & Gear */}
              <section>
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] pb-2">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-[#7A1CAC]" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] tracking-tight">
                      Electronics & Audio Gear
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Electronics & Audio')}
                    className="text-xs text-[#0B3B60] hover:underline font-semibold"
                  >
                    View All ({techProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-4">
                  {techProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                      isWishlisted={isWishlisted(prod)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>

              {/* SECTION 6: Home & Kitchen Living */}
              <section>
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] pb-2">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#0B3B60]" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] tracking-tight">
                      Home & Kitchen Living
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Home & Living')}
                    className="text-xs text-[#0B3B60] hover:underline font-semibold"
                  >
                    View All ({homeProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-4">
                  {homeProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelect={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                      isWishlisted={isWishlisted(prod)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              </section>


              {/* SECTION 5: Certified Blue-Collar Technicians Strip */}
              <section className="bg-white rounded-lg border border-[#E7ECF0] p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#0B3B60]" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] tracking-tight">
                      Blue-Collar Artisans On Call
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveView('services')}
                    className="text-xs text-[#0B3B60] hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>View All Artisans</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {services.slice(0, 3).map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3 rounded border border-[#E7ECF0] bg-[#FAF9F6] flex items-center justify-between gap-3 hover:border-[#0B3B60] transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-[#0B3B60] bg-white px-1.5 py-0.5 rounded border border-[#E7ECF0]">
                          {srv.tradeCategory}
                        </span>
                        <h4 className="font-bold text-xs text-[#1A242D] mt-1 truncate">
                          {srv.providerName}
                        </h4>
                        <div className="text-[11px] text-[#5A6872]">
                          Callout: <strong className="text-[#0B3B60]">SLE {srv.calloutFeeSLE}</strong> · {srv.locationHub}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedServiceToBook(srv)}
                        className="px-2.5 py-1.5 bg-[#0B3B60] hover:bg-[#002541] text-white rounded text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        Book
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            /* Filtered Catalog Grid */
            <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-6 py-3">
              {/* Filter feedback row */}
              <div className="flex items-center justify-between mb-3 text-xs text-[#5A6872]">
                <div>
                  Showing <strong className="text-[#0B3B60]">{filteredProducts.length}</strong> items in{' '}
                  <span className="font-semibold text-[#1A242D]">{selectedCategory}</span>
                </div>
                {selectedCategory !== 'All' && (
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="text-[#0B3B60] hover:underline font-semibold"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded border border-[#E7ECF0] p-12 text-center my-4">
                  <PackageSearch className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <h3 className="font-bold text-sm text-[#1A242D] mb-1">
                    No items found matching criteria
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                      setSelectedStoreFilter(null);
                    }}
                    className="px-3.5 py-1.5 bg-[#0B3B60] text-white rounded text-xs font-bold hover:bg-[#002541] mt-2 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                      isWishlisted={isWishlisted(product)}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Floating Mobile Cart (Under 15% sticky cap) */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#002541] text-white px-4 py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.15)] flex items-center justify-between border-t border-[#144b77]">
          <div>
            <div className="text-[10px] text-[#7fa6d0] font-semibold uppercase tracking-wide">
              {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart
            </div>
            <div className="text-sm font-extrabold tabular-nums text-white">
              SLE {new Intl.NumberFormat('en-US').format(totalCartAmount)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-3 py-1.5 bg-[#082d49] border border-[#144b77] hover:bg-[#0b3b60] rounded text-xs font-bold transition-colors cursor-pointer"
            >
              View Cart
            </button>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 py-1.5 bg-[#00875A] hover:bg-[#00704a] text-white rounded text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
            >
              Checkout
            </button>
          </div>
        </div>
      )}

      {/* Institutional Trust Footer */}
      <Footer
        onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
        onOpenMerchantHub={() => setIsMerchantHubOpen(true)}
        onOpenOrderTracking={() => setIsOrderTrackingOpen(true)}
      />

      {/* Modals & Slide-Overs */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(prod, qty) => handleAddToCart(prod, qty)}
          onFastBuy={handleFastBuy}
          currentLocation={currentLocation}
          onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
          isWishlisted={isWishlisted(selectedProduct)}
          onToggleWishlist={handleToggleWishlist}
        />
      )}

      {/* Blue-Collar Service Booking Modal */}
      {selectedServiceToBook && (
        <ServiceBookingModal
          service={selectedServiceToBook}
          onClose={() => setSelectedServiceToBook(null)}
          onBookingSuccess={(msg) => showToast(msg)}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        currentLocation={currentLocation}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onAddToCart={(p) => handleAddToCart(p, 1)}
      />

      {/* Multi-Step Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        currentLocation={currentLocation}
        initialPaymentMethod={checkoutInitialMethod}
        onOrderSuccess={handleOrderSuccess}
        currentUser={currentUser}
      />

      {/* WhatsApp Authentication Modal */}
      <WhatsAppAuthModal
        isOpen={isWhatsAppAuthOpen}
        onClose={() => setIsWhatsAppAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      {/* Order Confirmation Receipt Modal */}
      <OrderConfirmationModal
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        onTrackOrder={(order) => {
          setConfirmedOrder(null);
          setIsOrderTrackingOpen(true);
        }}
      />

      {/* Live Order Tracker Modal */}
      {isOrderTrackingOpen && (
        <OrderTrackingModal
          orders={orders}
          activeOrder={confirmedOrder}
          onClose={() => setIsOrderTrackingOpen(false)}
        />
      )}

      {/* 3-Track Merchant Hub: Create Store, Single Item, Blue-Collar Service */}
      <MerchantHubModal
        isOpen={isMerchantHubOpen}
        onClose={() => setIsMerchantHubOpen(false)}
        onAddProduct={handleAddNewProduct}
        onAddStore={handleAddNewStore}
        onAddService={handleAddNewService}
      />

      {/* Location Picker Modal */}
      {isLocationPickerOpen && (
        <LocationPickerModal
          currentLocation={currentLocation}
          onSelectLocation={(loc) => {
            setCurrentLocation(loc);
            showToast(`Delivery destination set to ${loc.name}`);
          }}
          onClose={() => setIsLocationPickerOpen(false)}
        />
      )}

      {/* Functional & Responsive Q&A Chatbot */}
      <ChatbotWidget
        onOpenMerchantHub={() => setIsMerchantHubOpen(true)}
        onOpenOrderTracking={() => setIsOrderTrackingOpen(true)}
        onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setActiveView('marketplace');
        }}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-22 right-4 sm:right-6 z-50 bg-[#002541] text-white px-4 py-2.5 rounded shadow-xl border border-[#144b77] flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#8df7c1] shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
