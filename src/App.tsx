import React, { useState, useMemo, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  CategoryIconRow 
} from './components/CategoryIconRow';
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
import { LegalModal } from './components/LegalModal';
import { MobileBottomBar } from './components/MobileBottomBar';
import { getActiveBetterAuthSession } from './lib/auth-client';
import { getInitialTheme, applyTheme, ThemeMode } from './lib/theme';

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
  ShieldCheck,
  Armchair,
  Baby,
  Trophy,
  Hammer,
  Bike,
  BookOpen,
  ShoppingBag
} from 'lucide-react';

export default function App() {
  // Theme state (persisted in localStorage and synced with HTML document)
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  };

  // WhatsApp Authentication state (persisted)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('abu_marketplace_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // Direct URL Path Routing (/login, /register, /auth, /account, /signin, /signup)
  const [isWhatsAppAuthOpen, setIsWhatsAppAuthOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      return ['/login', '/register', '/auth', '/account', '/signin', '/signup'].includes(path);
    }
    return false;
  });

  const [authInitialTab, setAuthInitialTab] = useState<'phone' | 'email'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (['/login', '/register', '/signin', '/signup'].includes(path)) return 'email';
    }
    return 'phone';
  });

  const [authInitialEmailMode, setAuthInitialEmailMode] = useState<'signin' | 'signup'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/register' || path === '/signup') return 'signup';
    }
    return 'signin';
  });

  const handleOpenAuth = (mode: 'login' | 'register' | 'phone' = 'phone') => {
    if (mode === 'login') {
      setAuthInitialTab('email');
      setAuthInitialEmailMode('signin');
      if (typeof window !== 'undefined') window.history.pushState({}, '', '/login');
    } else if (mode === 'register') {
      setAuthInitialTab('email');
      setAuthInitialEmailMode('signup');
      if (typeof window !== 'undefined') window.history.pushState({}, '', '/register');
    } else {
      setAuthInitialTab('phone');
      if (typeof window !== 'undefined') window.history.pushState({}, '', '/auth');
    }
    setIsWhatsAppAuthOpen(true);
  };

  const handleCloseAuth = () => {
    setIsWhatsAppAuthOpen(false);
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (['/login', '/register', '/auth', '/account', '/signin', '/signup'].includes(path)) {
        window.history.pushState({}, '', '/');
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/login' || path === '/signin') {
        setAuthInitialTab('email');
        setAuthInitialEmailMode('signin');
        setIsWhatsAppAuthOpen(true);
      } else if (path === '/register' || path === '/signup') {
        setAuthInitialTab('email');
        setAuthInitialEmailMode('signup');
        setIsWhatsAppAuthOpen(true);
      } else if (path === '/auth' || path === '/account') {
        setAuthInitialTab('phone');
        setIsWhatsAppAuthOpen(true);
      } else {
        setIsWhatsAppAuthOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // User's approved shop state (persisted)
  const [userStore, setUserStore] = useState<VendorStore | null>(() => {
    try {
      const saved = localStorage.getItem('abu_user_shop');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isShopApproved = Boolean(userStore || currentUser?.role === 'merchant');

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
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDocId, setActiveLegalDocId] = useState('terms-of-service');
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

        // Hydrate active Better Auth session from server
        const activeUser = await getActiveBetterAuthSession();
        if (activeUser) {
          setCurrentUser(activeUser);
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
    'Groceries & Non-Perishables',
    'Home & Office Furniture',
    'Appliances & Utensils',
    'Beauty, Perfumes & Hygiene',
    'Baby & Kids Toys',
    'Fashion & Footwear',
    'Sports Gears & Jerseys',
    'Power Tools & Safety Gear',
    'Vehicles & E-Bikes',
    'Books, Art & Stationery',
    'Solar & Power',
    'Phones & Tablets',
    'Electronics & Audio',
    'Home & Living',
  ];

  // Product counts per category
  const productCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      'All': products.length,
      'Groceries & Non-Perishables': 0,
      'Home & Office Furniture': 0,
      'Appliances & Utensils': 0,
      'Beauty, Perfumes & Hygiene': 0,
      'Baby & Kids Toys': 0,
      'Fashion & Footwear': 0,
      'Sports Gears & Jerseys': 0,
      'Power Tools & Safety Gear': 0,
      'Vehicles & E-Bikes': 0,
      'Books, Art & Stationery': 0,
      'Solar & Power': 0,
      'Phones & Tablets': 0,
      'Electronics & Audio': 0,
      'Home & Living': 0,
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
  const groceryProducts = useMemo(() => products.filter((p) => p.category === 'Groceries & Non-Perishables'), [products]);
  const furnitureProducts = useMemo(() => products.filter((p) => p.category === 'Home & Office Furniture'), [products]);
  const applianceProducts = useMemo(() => products.filter((p) => p.category === 'Appliances & Utensils'), [products]);
  const beautyProducts = useMemo(() => products.filter((p) => p.category === 'Beauty, Perfumes & Hygiene'), [products]);
  const babyProducts = useMemo(() => products.filter((p) => p.category === 'Baby & Kids Toys'), [products]);
  const sportsProducts = useMemo(() => products.filter((p) => p.category === 'Sports Gears & Jerseys'), [products]);
  const toolsProducts = useMemo(() => products.filter((p) => p.category === 'Power Tools & Safety Gear'), [products]);
  const vehicleProducts = useMemo(() => products.filter((p) => p.category === 'Vehicles & E-Bikes'), [products]);
  const booksArtProducts = useMemo(() => products.filter((p) => p.category === 'Books, Art & Stationery'), [products]);

  // Authentication Handlers (WhatsApp, Google, Apple)
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('abu_marketplace_user', JSON.stringify(user));
    } catch {}
    const providerLabel = user.provider === 'google' ? 'Google' : user.provider === 'apple' ? 'Apple' : 'WhatsApp';
    showToast(`Signed in via ${providerLabel} as ${user.name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('abu_marketplace_user');
    } catch {}
    showToast('Signed out of account session');
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
    setUserStore(newStore);
    try {
      localStorage.setItem('abu_user_shop', JSON.stringify(newStore));
    } catch (e) {
      console.error(e);
    }
    showToast(`Store "${newStore.name}" approved! Access it anytime via "My Shop".`);
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
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#091118] text-[#1A242D] dark:text-[#F1F5F9] flex flex-col font-sans antialiased relative transition-colors duration-200 w-full max-w-full overflow-x-hidden pb-16 md:pb-0">
      {/* 1. Header with ABU Logo and 3-Track Mode navigation */}
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
        isShopApproved={isShopApproved}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Primary Semantic H1 for SEO Ranking (#1 for ABU, abu, Marketplace) */}
      <h1 className="sr-only">ABU Marketplace (abu) — Sierra Leone&apos;s #1 Online Marketplace</h1>

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

      {/* VIEW: MARKETPLACE PRODUCTS (CLEAN, MINIMALIST SHOP-BY-CATEGORY LAYOUT) */}
      {activeView === 'marketplace' && (
        <>
          {/* "Shop by Category" Only - Clean, Distraction-Free Navigation */}
          <CategoryIconRow
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            activeView={activeView}
            onSelectView={setActiveView}
          />

          {/* Active Store Filter Notice if selected */}
          {selectedStoreFilter && (
            <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-6 pt-2">
              <div className="bg-white dark:bg-[#111D27] border border-[#E7ECF0] dark:border-[#1E2E3D] p-3 rounded flex items-center justify-between text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#0B3B60] dark:text-[#38BDF8]" />
                  <span className="font-bold text-[#0B3B60] dark:text-[#38BDF8]">
                    Storefront: {selectedStoreFilter.name}
                  </span>
                  <span className="text-[#5A6872] dark:text-slate-400 hidden sm:inline">
                    · {selectedStoreFilter.locationHub}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStoreFilter(null)}
                  className="bg-[#F4F6F8] dark:bg-[#1E2E3D] hover:bg-slate-200 dark:hover:bg-[#2A3E50] text-[#1A242D] dark:text-slate-200 px-2.5 py-1 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All Products</span>
                </button>
              </div>
            </div>
          )}

          {/* Sectioned Feed matching Screenshot */}
          {isSectionedHome ? (
            <div className="max-w-[1440px] mx-auto w-full px-3 sm:px-6 py-4 space-y-6 sm:space-y-8 overflow-hidden">
              {/* SECTION 1: Top Picks */}
              <section className="w-full">
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight min-w-0 truncate">
                    Top Picks & Best Sellers
                  </h2>
                  <button
                    onClick={() => setSortBy('sold')}
                    className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    View All
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                  {products.slice(0, 6).map((prod) => (
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
              <section className="w-full">
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <Sparkles className="w-4 h-4 text-[#D84315] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                      Fashion & Footwear Spotlight
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Fashion & Footwear')}
                    className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    View All ({fashionProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                  {fashionProducts.slice(0, 6).map((prod) => (
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
              <section className="w-full">
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <Sun className="w-4 h-4 text-[#FF6600] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                      Solar & Power Backup Systems
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Solar & Power')}
                    className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    View All ({solarProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                  {solarProducts.slice(0, 6).map((prod) => (
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
              <section className="w-full">
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <Smartphone className="w-4 h-4 text-[#00875A] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                      Phones & Mobile Tech
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Phones & Tablets')}
                    className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    View All ({phoneProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                  {phoneProducts.slice(0, 6).map((prod) => (
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
              <section className="w-full">
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <Headphones className="w-4 h-4 text-[#7A1CAC] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                      Electronics & Audio Gear
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Electronics & Audio')}
                    className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    View All ({techProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                  {techProducts.slice(0, 6).map((prod) => (
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
              <section className="w-full">
                <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <UtensilsCrossed className="w-4 h-4 text-[#0B3B60] dark:text-[#38BDF8] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                      Home & Kitchen Living
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Home & Living')}
                    className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    View All ({homeProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                  {homeProducts.slice(0, 6).map((prod) => (
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

              {/* SECTION: Groceries & Non-Perishable Foods */}
              {groceryProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <ShoppingBag className="w-4 h-4 text-[#059669] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Groceries, Pantry Foods & Beverages
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Groceries & Non-Perishables')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({groceryProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {groceryProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION: Appliances, Kitchen Utensils & Cleaning */}
              {applianceProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <UtensilsCrossed className="w-4 h-4 text-[#EA580C] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Kitchen Utensils, Cookware & Home Appliances
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Appliances & Utensils')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({applianceProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {applianceProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION: Home & Office Furniture */}
              {furnitureProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <Armchair className="w-4 h-4 text-[#B45309] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Home & Office Furniture (Lumbar Chairs & Desks)
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Home & Office Furniture')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({furnitureProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {furnitureProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION: Vehicles & E-Mobility */}
              {vehicleProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <Bike className="w-4 h-4 text-[#0D9488] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Vehicles, E-Bikes & Electric Scooters
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Vehicles & E-Bikes')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({vehicleProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {vehicleProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION: Power Tools & Construction Safety */}
              {toolsProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <Hammer className="w-4 h-4 text-[#E11D48] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Power Tools & Certified Safety Gear (Boots & Vests)
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Power Tools & Safety Gear')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({toolsProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {toolsProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION: Sports Gears & Jerseys */}
              {sportsProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <Trophy className="w-4 h-4 text-[#10B981] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Sports Gears & Official Leone Stars Match Jerseys
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Sports Gears & Jerseys')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({sportsProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {sportsProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION: Books, Art & Stationery */}
              {booksArtProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <BookOpen className="w-4 h-4 text-[#4F46E5] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Books, Sierra Leone Fine Art & Stationery Supplies
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Books, Art & Stationery')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({booksArtProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {booksArtProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION: Beauty, Perfumes & Personal Hygiene */}
              {beautyProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <Sparkles className="w-4 h-4 text-[#EC4899] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Skincare, Arabian Oud Perfumes & Hygiene
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Beauty, Perfumes & Hygiene')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({beautyProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {beautyProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION: Baby Care & STEM Kids Toys */}
              {babyProducts.length > 0 && (
                <section className="w-full">
                  <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <Baby className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                      <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                        Baby Essentials & Educational Kids Toys
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedCategory('Baby & Kids Toys')}
                      className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      View All ({babyProducts.length})
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 w-full">
                    {babyProducts.slice(0, 6).map((prod) => (
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
              )}

              {/* SECTION 7: Certified Blue-Collar Technicians Strip */}
              <section className="bg-white dark:bg-[#111D27] rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D] p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <Wrench className="w-4 h-4 text-[#0B3B60] dark:text-[#38BDF8] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
                      Blue-Collar Artisans On Call
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveView('services')}
                    className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <span>View All Artisans</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {services.slice(0, 3).map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3 rounded border border-[#E7ECF0] dark:border-[#1E2E3D] bg-[#FAF9F6] dark:bg-[#0E1720] flex items-center justify-between gap-3 hover:border-[#0B3B60] dark:hover:border-[#38BDF8] transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-[#0B3B60] dark:text-[#38BDF8] bg-white dark:bg-[#15222E] px-1.5 py-0.5 rounded border border-[#E7ECF0] dark:border-[#223547]">
                          {srv.tradeCategory}
                        </span>
                        <h4 className="font-bold text-xs text-[#1A242D] dark:text-[#F1F5F9] mt-1 truncate">
                          {srv.providerName}
                        </h4>
                        <div className="text-[11px] text-[#5A6872] dark:text-slate-400">
                          Callout: <strong className="text-[#0B3B60] dark:text-[#38BDF8]">SLE {srv.calloutFeeSLE}</strong> · {srv.locationHub}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedServiceToBook(srv)}
                        className="px-2.5 py-1.5 bg-[#0B3B60] hover:bg-[#002541] dark:bg-[#00875A] dark:hover:bg-[#00704A] text-white rounded text-xs font-bold shrink-0 transition-colors cursor-pointer"
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
              <div className="flex items-center justify-between mb-3 text-xs text-[#5A6872] dark:text-slate-400">
                <div>
                  Showing <strong className="text-[#0B3B60] dark:text-[#38BDF8]">{filteredProducts.length}</strong> items in{' '}
                  <span className="font-semibold text-[#1A242D] dark:text-slate-200">{selectedCategory}</span>
                </div>
                {selectedCategory !== 'All' && (
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-white dark:bg-[#111D27] rounded border border-[#E7ECF0] dark:border-[#1E2E3D] p-12 text-center my-4">
                  <PackageSearch className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                  <h3 className="font-bold text-sm text-[#1A242D] dark:text-[#F1F5F9] mb-1">
                    No items found matching criteria
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                      setSelectedStoreFilter(null);
                    }}
                    className="px-3.5 py-1.5 bg-[#0B3B60] dark:bg-[#00875A] text-white rounded text-xs font-bold hover:bg-[#002541] dark:hover:bg-[#00704A] mt-2 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
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

      {/* Floating Mobile Cart (Positioned above MobileBottomBar on mobile) */}
      {cartItems.length > 0 && (
        <div 
          className="md:hidden fixed bottom-14 left-0 right-0 z-30 bg-[#002541]/95 dark:bg-[#091118]/95 backdrop-blur-md text-white px-3 sm:px-4 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.2)] flex items-center justify-between border-t border-[#144b77] transition-all"
        >
          <div>
            <div className="text-[10px] text-[#7fa6d0] font-semibold uppercase tracking-wide">
              {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart
            </div>
            <div className="text-xs sm:text-sm font-extrabold tabular-nums text-white">
              SLE {new Intl.NumberFormat('en-US').format(totalCartAmount)}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-[#082d49] border border-[#144b77] hover:bg-[#0b3b60] rounded text-xs font-bold transition-colors cursor-pointer"
            >
              View Cart
            </button>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-3.5 sm:px-4 py-1.5 bg-[#00875A] hover:bg-[#00704a] text-white rounded text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
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
        onOpenLegal={(docId) => {
          if (docId) setActiveLegalDocId(docId);
          setIsLegalModalOpen(true);
        }}
      />

      {/* Mobile Bottom Navigation Dock */}
      <MobileBottomBar
        activeView={activeView}
        onSelectView={setActiveView}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        currentUser={currentUser}
        onOpenWhatsAppAuth={() => setIsWhatsAppAuthOpen(true)}
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
        onClose={handleCloseAuth}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        initialTab={authInitialTab}
        initialEmailMode={authInitialEmailMode}
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

      {/* Legal & Trust Center Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialDocId={activeLegalDocId}
        onClose={() => setIsLegalModalOpen(false)}
      />

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
