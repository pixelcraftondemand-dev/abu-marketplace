'use client'
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { SparklesIcon, UploadCloudIcon, XIcon } from "lucide-react"

const categories = [
    'Electronics', 'Clothing', 'Home & Kitchen', 'Beauty & Health',
    'Toys & Games', 'Sports & Outdoors', 'Books & Media',
    'Food & Drink', 'Hobbies & Crafts', 'Others'
]

export default function StoreAddProduct() {
    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [productInfo, setProductInfo] = useState({
        name: "", description: "", mrp: "", price: "", category: "",
    })
    const [loading, setLoading] = useState(false)
    const [aiUsed, setAiUsed] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)

    const { getToken } = useAuth()

    const onChangeHandler = (e) => {
        setProductInfo({ ...productInfo, [e.target.name]: e.target.value })
    }

    const handleImageUpload = async (key, file) => {
        if (!file) return
        setImages(prev => ({ ...prev, [key]: file }))

        if (key === "1" && !aiUsed) {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onloadend = async () => {
                const base64String = reader.result.split(",")[1]
                const mimeType = file.type
                const token = await getToken()
                setAiLoading(true)
                try {
                    const res = await axios.post(
                        "/api/store/ai",
                        { base64Image: base64String, mimeType },
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                    const data = res.data
                    if (data.name && data.description) {
                        setProductInfo(prev => ({ ...prev, name: data.name, description: data.description }))
                        setAiUsed(true)
                        toast.success("AI filled product info")
                    }
                } catch (error) {
                    console.error(error)
                } finally {
                    setAiLoading(false)
                }
            }
        }
    }

    const removeImage = (key) => {
        setImages(prev => ({ ...prev, [key]: null }))
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        const hasImage = Object.values(images).some(Boolean)
        if (!hasImage) return toast.error('Please upload at least one image')

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('name', productInfo.name)
            formData.append('description', productInfo.description)
            formData.append('mrp', productInfo.mrp)
            formData.append('price', productInfo.price)
            formData.append('category', productInfo.category)
            Object.values(images).forEach(img => img && formData.append('images', img))

            const token = await getToken()
            const { data } = await axios.post('/api/store/product', formData, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(data.message)
            setProductInfo({ name: "", description: "", mrp: "", price: "", category: "" })
            setImages({ 1: null, 2: null, 3: null, 4: null })
            setAiUsed(false)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mb-28 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-800">
                    Add New <span className="text-green-600">Product</span>
                </h1>
                <p className="text-sm text-slate-400 mt-1">Fill in the details below to list a new product</p>
            </div>

            <form onSubmit={onSubmitHandler} className="space-y-6">

                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-700">Product Images</p>
                        {aiLoading && (
                            <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <SparklesIcon size={12} className="animate-pulse" />
                                AI analyzing...
                            </span>
                        )}
                        {aiUsed && !aiLoading && (
                            <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <SparklesIcon size={12} />
                                AI filled details
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mb-4">Upload up to 4 images. First image will be analyzed by AI to auto-fill product details.</p>
                    <div className="grid grid-cols-4 gap-3">
                        {Object.keys(images).map((key) => (
                            <div key={key} className="relative group aspect-square">
                                <label
                                    htmlFor={`image-${key}`}
                                    className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-xl cursor-pointer transition
                                        ${images[key] ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-green-300 hover:bg-green-50'}`}
                                >
                                    {images[key] ? (
                                        <Image src={URL.createObjectURL(images[key])} alt="" fill className="object-cover rounded-xl" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-slate-400">
                                            <UploadCloudIcon size={20} />
                                            <span className="text-xs">{key === "1" ? "Main" : `Photo ${key}`}</span>
                                        </div>
                                    )}
                                </label>
                                <input type="file" accept="image/*" id={`image-${key}`} onChange={e => handleImageUpload(key, e.target.files[0])} hidden />
                                {images[key] && (
                                    <button type="button" onClick={() => removeImage(key)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                                        <XIcon size={10} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
                    <p className="text-sm font-semibold text-slate-700">Product Details</p>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Product Name</label>
                        <input type="text" name="name" onChange={onChangeHandler} value={productInfo.name} placeholder="e.g. Wireless Bluetooth Headphones" className="w-full p-2.5 px-4 text-sm outline-none border border-slate-200 rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-50 transition" required />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Description</label>
                        <textarea name="description" onChange={onChangeHandler} value={productInfo.description} placeholder="Describe your product in detail..." rows={4} className="w-full p-2.5 px-4 text-sm outline-none border border-slate-200 rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-50 transition resize-none" required />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Category</label>
                        <select onChange={e => setProductInfo({ ...productInfo, category: e.target.value })} value={productInfo.category} className="w-full p-2.5 px-4 text-sm outline-none border border-slate-200 rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-50 transition bg-white" required>
                            <option value="">Select a category</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
                    <p className="text-sm font-semibold text-slate-700">Pricing</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-slate-500">Original Price (MRP)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'SLe'}</span>
                                <input type="number" name="mrp" onChange={onChangeHandler} value={productInfo.mrp} placeholder="0.00" className="w-full p-2.5 pl-10 text-sm outline-none border border-slate-200 rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-50 transition" required min="0" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-slate-500">Selling Price</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'SLe'}</span>
                                <input type="number" name="price" onChange={onChangeHandler} value={productInfo.price} placeholder="0.00" className="w-full p-2.5 pl-10 text-sm outline-none border border-slate-200 rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-50 transition" required min="0" />
                            </div>
                        </div>
                    </div>
                    {productInfo.mrp && productInfo.price && Number(productInfo.mrp) > Number(productInfo.price) && (
                        <p className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg inline-block">
                            {Math.round(((productInfo.mrp - productInfo.price) / productInfo.mrp) * 100)}% discount applied
                        </p>
                    )}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                    {loading ? 'Adding Product...' : 'Add Product'}
                </button>
            </form>
        </div>
    )
}