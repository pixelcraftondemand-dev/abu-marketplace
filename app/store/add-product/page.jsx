'use client'
import { useState } from "react"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import Image from "next/image"
import { UploadCloudIcon, XIcon, SparklesIcon, CheckCircleIcon } from "lucide-react"

const CATEGORIES = [
    'Electronics', 'Clothing', 'Home & Kitchen', 'Beauty & Health',
    'Toys & Games', 'Sports & Outdoors', 'Books & Media',
    'Food & Drink', 'Hobbies & Crafts', 'Others'
]

const EMPTY_FORM = { name: '', description: '', mrp: '', price: '', category: '' }

export default function AddProduct() {
    const { getToken } = useAuth()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'SLe'

    const [form, setForm] = useState(EMPTY_FORM)
    const [images, setImages] = useState([null, null, null, null])
    const [submitting, setSubmitting] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [aiDone, setAiDone] = useState(false)

    const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

    const handleImage = async (index, file) => {
        if (!file) return
        const updated = [...images]
        updated[index] = file
        setImages(updated)

        if (index === 0 && !aiDone) {
            setAiLoading(true)
            try {
                const reader = new FileReader()
                reader.readAsDataURL(file)
                reader.onloadend = async () => {
                    const base64 = reader.result.split(',')[1]
                    const token = await getToken()
                    const { data } = await axios.post('/api/store/ai',
                        { base64Image: base64, mimeType: file.type },
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                    if (data?.name) {
                        setForm(f => ({ ...f, name: data.name || f.name, description: data.description || f.description }))
                        setAiDone(true)
                        toast.success('AI filled product details')
                    }
                }
            } catch (e) {
                console.error('[AI]', e)
            } finally {
                setAiLoading(false)
            }
        }
    }

    const removeImage = index => {
        const updated = [...images]
        updated[index] = null
        setImages(updated)
        if (index === 0) setAiDone(false)
    }

    const onSubmit = async e => {
        e.preventDefault()
        const validImages = images.filter(Boolean)
        if (validImages.length === 0) return toast.error('Upload at least one image')
        if (Number(form.price) > Number(form.mrp)) return toast.error('Selling price cannot exceed MRP')

        setSubmitting(true)
        try {
            const fd = new FormData()
            Object.entries(form).forEach(([k, v]) => fd.append(k, v))
            validImages.forEach(img => fd.append('images', img))

            const token = await getToken()
            const { data } = await axios.post('/api/store/product', fd, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(data.message)
            setForm(EMPTY_FORM)
            setImages([null, null, null, null])
            setAiDone(false)
        } catch (err) {
            toast.error(err?.response?.data?.error || err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const discount = form.mrp && form.price && Number(form.mrp) > Number(form.price)
        ? Math.round(((form.mrp - form.price) / form.mrp) * 100)
        : 0

    return (
        <div className="max-w-2xl pb-20">

            <div className="mb-7">
                <h1 className="text-2xl font-bold text-slate-800">Add New <span className="text-green-600">Product</span></h1>
                <p className="text-sm text-slate-400 mt-1">Upload your first image to let AI fill in the details automatically</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">

                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-slate-700">Product Images</p>
                        {aiLoading && (
                            <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse">
                                <SparklesIcon size={12} /> AI analyzing...
                            </span>
                        )}
                        {aiDone && !aiLoading && (
                            <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                                <CheckCircleIcon size={12} /> AI filled details
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mb-4">Upload up to 4 images. Minimum 1 required.</p>
                    <div className="grid grid-cols-4 gap-3">
                        {images.map((img, i) => (
                            <div key={i} className="relative group aspect-square">
                                <label
                                    htmlFor={`img-${i}`}
                                    className={`flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed cursor-pointer transition
                                        ${img ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-green-300 hover:bg-green-50'}`}
                                >
                                    {img ? (
                                        <Image src={URL.createObjectURL(img)} alt="" fill className="object-cover rounded-xl" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-slate-400">
                                            <UploadCloudIcon size={18} />
                                            <span className="text-xs">{i === 0 ? 'Main' : `Photo ${i + 1}`}</span>
                                        </div>
                                    )}
                                </label>
                                <input type="file" id={`img-${i}`} accept="image/*" hidden onChange={e => handleImage(i, e.target.files[0])} />
                                {img && (
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                                    >
                                        <XIcon size={10} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <p className="text-sm font-semibold text-slate-700">Product Details</p>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Product Name *</label>
                        <input
                            name="name" value={form.name} onChange={onChange} required
                            placeholder="e.g. Wireless Bluetooth Headphones"
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Description *</label>
                        <textarea
                            name="description" value={form.description} onChange={onChange} required rows={4}
                            placeholder="Describe your product clearly..."
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 transition resize-none"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Category *</label>
                        <select
                            name="category" value={form.category} required
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 transition bg-white"
                        >
                            <option value="">Select a category</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <p className="text-sm font-semibold text-slate-700">Pricing</p>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Original Price (MRP)', name: 'mrp' },
                            { label: 'Selling Price', name: 'price' },
                        ].map(({ label, name }) => (
                            <div key={name} className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-500">{label} *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currency}</span>
                                    <input
                                        type="number" name={name} value={form[name]} onChange={onChange}
                                        required min="0" placeholder="0.00"
                                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50 transition"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    {discount > 0 && (
                        <p className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg inline-block">
                            {discount}% discount will be shown to customers
                        </p>
                    )}
                </section>

                <button
                    type="submit" disabled={submitting}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-semibold text-sm transition shadow-sm active:scale-95"
                >
                    {submitting ? 'Adding Product...' : 'Add Product'}
                </button>

            </form>
        </div>
    )
}