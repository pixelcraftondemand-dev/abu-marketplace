'use client'
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { SearchIcon, PackageXIcon } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ManageProducts() {
    const { getToken } = useAuth()
    const router = useRouter()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'SLe'

    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [toggling, setToggling] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const token = await getToken()
                const { data } = await axios.get('/api/store/product', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setProducts(data.products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
            } catch (err) {
                toast.error(err?.response?.data?.error || err.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const toggleStock = async (productId, current) => {
        setToggling(productId)
        try {
            const token = await getToken()
            await axios.post('/api/store/stock-toggle', { productId }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, inStock: !current } : p))
            toast.success(`Product marked as ${!current ? 'in stock' : 'out of stock'}`)
        } catch (err) {
            toast.error(err?.response?.data?.error || err.message)
        } finally {
            setToggling(null)
        }
    }

    if (loading) return <Loading />

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="pb-20">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Manage <span className="text-green-600">Products</span></h1>
                    <p className="text-sm text-slate-400 mt-1">{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 transition w-48"
                        />
                    </div>
                    <button
                        onClick={() => router.push('/store/add-product')}
                        className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition font-medium"
                    >
                        + Add Product
                    </button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-center">
                    <PackageXIcon size={30} className="mb-3 text-slate-300" />
                    <p className="font-medium">No products found</p>
                    <p className="text-sm mt-1">Try a different search or add your first product</p>
                    <button
                        onClick={() => router.push('/store/add-product')}
                        className="mt-4 text-sm text-green-600 underline underline-offset-2"
                    >
                        Add a product
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
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
                                {filtered.map(product => {
                                    const disc = product.mrp > product.price
                                        ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                                        : 0
                                    return (
                                        <tr key={product.id} className="hover:bg-slate-50 transition">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Image
                                                        src={product.images[0]}
                                                        alt={product.name}
                                                        width={40} height={40}
                                                        className="w-10 h-10 rounded-xl object-cover border border-slate-100"
                                                    />
                                                    <span className="font-medium text-slate-800 max-w-[150px] truncate">{product.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{product.category}</span>
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell text-slate-400 line-through text-xs">
                                                {currency}{product.mrp.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-slate-800">
                                                {currency}{product.price.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                {disc > 0
                                                    ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{disc}% off</span>
                                                    : <span className="text-slate-300 text-xs">—</span>
                                                }
                                            </td>
                                            <td className="px-5 py-3">
                                                <button
                                                    disabled={toggling === product.id}
                                                    onClick={() => toggleStock(product.id, product.inStock)}
                                                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none
                                                        ${product.inStock ? 'bg-green-500' : 'bg-slate-300'}
                                                        ${toggling === product.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
                                                        ${product.inStock ? 'translate-x-5' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}