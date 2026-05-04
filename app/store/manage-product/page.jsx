'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { PackageXIcon, SearchIcon } from "lucide-react"

export default function StoreManageProducts() {
    const { getToken } = useAuth()
    const { user } = useUser()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'SLe'

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')

    const fetchProducts = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/product', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProducts(data.products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleStock = async (productId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/store/stock-toggle', { productId }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, inStock: !p.inStock } : p))
            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        if (user) fetchProducts()
    }, [user])

    if (loading) return <Loading />

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="mb-28">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">
                        Manage <span className="text-green-600">Products</span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">{products.length} product{products.length !== 1 ? 's' : ''} in your store</p>
                </div>
                <div className="relative max-w-xs w-full">
                    <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 transition" />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <PackageXIcon size={32} className="mb-3 text-slate-300" />
                    <p className="font-medium">No products found</p>
                    <p className="text-sm mt-1">Try a different search or add a new product</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3">Product</th>
                                <th className="px-5 py-3 hidden md:table-cell">Category</th>
                                <th className="px-5 py-3 hidden md:table-cell">MRP</th>
                                <th className="px-5 py-3">Price</th>
                                <th className="px-5 py-3 hidden md:table-cell">Discount</th>
                                <th className="px-5 py-3">In Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((product) => {
                                const discount = product.mrp > product.price
                                    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                                    : 0
                                return (
                                    <tr key={product.id} className="hover:bg-slate-50 transition">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <Image src={product.images[0]} alt={product.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-slate-100 shadow-sm" />
                                                <span className="font-medium text-slate-700 max-w-[160px] truncate">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 hidden md:table-cell text-slate-500">
                                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{product.category}</span>
                                        </td>
                                        <td className="px-5 py-3 hidden md:table-cell text-slate-400 line-through">{currency}{product.mrp.toLocaleString()}</td>
                                        <td className="px-5 py-3 font-semibold text-slate-800">{currency}{product.price.toLocaleString()}</td>
                                        <td className="px-5 py-3 hidden md:table-cell">
                                            {discount > 0 ? (
                                                <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">{discount}% off</span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={product.inStock} onChange={() => toast.promise(toggleStock(product.id), { loading: 'Updating...' })} />
                                                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-green-500 transition-colors duration-200" />
                                                <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-4 shadow-sm" />
                                            </label>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}