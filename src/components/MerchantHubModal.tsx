import React, { useState } from 'react';
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
  Phone
} from 'lucide-react';
import { Category, Product, VendorStore, BlueCollarService, TradeCategory, ItemCondition } from '../types';
import { detectCarrier } from '../data/mockData';
import { api } from '../services/api';
import { AbuLogo } from './AbuLogo';

interface MerchantHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  onAddStore?: (store: VendorStore) => void;
  onAddService?: (service: BlueCollarService) => void;
}

export const MerchantHubModal: React.FC<MerchantHubModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  onAddStore,
  onAddService,
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'single_product' | 'service'>('store');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Store Form State
  const [storeName, setStoreName] = useState('');
  const [storeTagline, setStoreTagline] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [storeHub, setStoreHub] = useState('Freetown Central');
  const [storeStreet, setStoreStreet] = useState('');
  const [storePhone, setStorePhone] = useState('076 111 222');

  // 2. Single Product Form State
  const [singleTitle, setSingleTitle] = useState('');
  const [singleCategory, setSingleCategory] = useState<Category>('Phones & Tablets');
  const [singlePrice, setSinglePrice] = useState('');
  const [singleCondition, setSingleCondition] = useState<ItemCondition>('brand_new');
  const [singleSellerName, setSingleSellerName] = useState('');
  const [singlePhone, setSinglePhone] = useState('078 333 444');
  const [singleLocation, setSingleLocation] = useState('Aberdeen, Freetown');
  const [singleDesc, setSingleDesc] = useState('');

  // 3. Service Form State
  const [serviceTitle, setServiceTitle] = useState('');
  const [tradeCategory, setTradeCategory] = useState<TradeCategory>('Solar & Inverter Technician');
  const [providerName, setProviderName] = useState('');
  const [servicePhone, setServicePhone] = useState('076 777 888');
  const [experienceYears, setExperienceYears] = useState('5');
  const [calloutFeeSLE, setCalloutFeeSLE] = useState('100');
  const [serviceHub, setServiceHub] = useState('Lumley & Aberdeen');
  const [skillsText, setSkillsText] = useState('Inverter load calculation, LiFePO4 battery wiring, rooftop mounting');
  const [certification, setCertification] = useState('Certified Energy Technician SL');

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
      description: storeDesc.trim() || 'Authorized distributor on Abu Marketplace.',
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
      description: storeDesc.trim() || 'Authorized storefront on Abu Marketplace.',
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
        'Direct inquiry or instant Abu courier checkout',
      ],
    };

    onAddProduct(finalProduct);
    setIsSubmitting(false);
    setSuccessMessage(`Single item "${finalProduct.title}" is now listed live on Abu Marketplace!`);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-[#DCE1E5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Abu Logo */}
        <div className="bg-[#0B3B60] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AbuLogo size={44} />
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                Abu Merchant & Trade Hub
              </h2>
              <p className="text-[11px] text-[#8df7c1]">
                Stores · Single Product Listings · Blue-Collar Services
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Close merchant hub"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Track Selector Bar */}
        <div className="grid grid-cols-3 bg-[#eaf5ff] border-b border-[#DCE1E5] p-1.5 gap-1.5 text-xs">
          <button
            onClick={() => {
              setActiveTab('store');
              setSuccessMessage('');
            }}
            className={`py-2 px-2 rounded font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'store'
                ? 'bg-[#0B3B60] text-white shadow-xs'
                : 'bg-white text-[#1A242D] hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Create a Store</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('single_product');
              setSuccessMessage('');
            }}
            className={`py-2 px-2 rounded font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'single_product'
                ? 'bg-[#0B3B60] text-white shadow-xs'
                : 'bg-white text-[#1A242D] hover:bg-slate-50'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0" />
            <span className="truncate">List Single Item</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('service');
              setSuccessMessage('');
            }}
            className={`py-2 px-2 rounded font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'service'
                ? 'bg-[#0B3B60] text-white shadow-xs'
                : 'bg-white text-[#1A242D] hover:bg-slate-50'
            }`}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span className="truncate">Offer a Service</span>
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
                  Join Abu Marketplace's verified trade network. Get booked by homeowners and businesses for solar setups, electrical work, plumbing, AC maintenance, and auto diagnostics.
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
                    placeholder="e.g. Osman Kamara"
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
                    Callout Diagnostic Fee (SLE) *
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
        </div>
      </div>
    </div>
  );
};
