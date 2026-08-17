'use client'
import ProductCard from "@/components/ProductCard"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { MailIcon, MapPinIcon, RotateCcw, BadgeCheck, Star, Package } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import axios from "axios"

export default function StoreShopPage() {

    const { username } = useParams()
    const [products, setProducts] = useState([])
    const [storeInfo, setStoreInfo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)

    const fetchStoreData = async () => {
        setLoading(true)
        try {
            setLoadError(false)
            const { data } = await axios.get(`/api/store/data?username=${username}`)
            setStoreInfo(data.store)
            setProducts(data.store.Product)
        } catch (error) {
            // Temporary API failure — show the inline retry panel instead of
            // leaving the page empty with only a toast.
            setLoadError(true)
        }
        setLoading(false)
    }

    // Jumia-style store stats: product count + average rating across reviews.
    const productCount = products.length
    const allRatings = products.flatMap((p) => Array.isArray(p.rating) ? p.rating : [])
    const avgRating = allRatings.length
        ? (allRatings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / allRatings.length).toFixed(1)
        : null

    useEffect(() => {
        fetchStoreData()
    }, [])

    return !loading ? (
        loadError ? (
            <div className="min-h-[70vh] mx-6 flex items-center justify-center">
                <div className="text-center">
                    <p className="font-display text-2xl text-[#1A1A1A] mb-2">Failed to load this store</p>
                    <p className="text-[#9B9590] mb-8">We couldn&apos;t load this store right now. Please try again.</p>
                    <button
                        type="button"
                        onClick={fetchStoreData}
                        className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A96E]"
                    >
                        <RotateCcw size={16} />
                        Retry
                    </button>
                </div>
            </div>
        ) : (
            <div className="min-h-[70vh] mx-6">
                {/* Store Info Banner */}
                {storeInfo && (
                    <div className="max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs">
                        <Image
                            src={storeInfo.logo}
                            alt={storeInfo.name}
                            className="size-32 sm:size-38 object-cover border-2 border-slate-100 rounded-md"
                            width={200}
                            height={200}
                        />
                        <div className="text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                                <h1 className="text-3xl font-semibold text-slate-800">{storeInfo.name}</h1>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase text-white">
                                    <BadgeCheck size={13} />
                                    Official Store
                                </span>
                                {storeInfo.halalCertified && (
                                    <span className="rounded-full bg-[#C9A96E] px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase text-white">
                                        Halal Certified
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-600 mt-2 max-w-lg">{storeInfo.description}</p>
                            {/* Jumia-style store stats row */}
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm md:justify-start">
                                <span className="inline-flex items-center gap-1.5 text-slate-600">
                                    <Package size={15} className="text-[#C9A96E]" />
                                    {productCount} products
                                </span>
                                {avgRating && (
                                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                                        <Star size={15} className="fill-amber-400 text-amber-400" />
                                        {avgRating} ({allRatings.length})
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2 text-sm text-slate-500 mt-3">
                                <div className="flex items-center">
                                    <MapPinIcon className="w-4 h-4 text-gray-500 mr-2" />
                                    <span>{storeInfo.address}</span>
                                </div>
                                <div className="flex items-center">
                                    <MailIcon className="w-4 h-4 text-gray-500 mr-2" />
                                    <span>{storeInfo.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Products */}
                <div className="max-w-7xl mx-auto mb-40">
                    <h1 className="text-2xl mt-12">Shop <span className="text-slate-800 font-medium">Products</span></h1>
                    <div className="mt-5 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto">
                        {products.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                </div>
            </div>
        )
    ) : <Loading />
}
