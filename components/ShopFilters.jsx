'use client'
import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'New Arrivals' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'discount', label: 'Biggest Discount' },
]

const ShopFilters = ({ filters, onChange, resultCount }) => {
    const [open, setOpen] = useState(false)

    const update = (key, value) => onChange({ ...filters, [key]: value })

    const activeCount = [
        filters.minPrice,
        filters.maxPrice,
        filters.minRating,
        filters.inStockOnly,
    ].filter(Boolean).length

    const clearFilters = () => {
        onChange({
            ...filters,
            minPrice: '',
            maxPrice: '',
            minRating: '',
            inStockOnly: false,
            sortBy: 'relevance',
        })
    }

    return (
        <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{resultCount} products found</p>
                <div className="flex items-center gap-2">
                    <select
                        value={filters.sortBy}
                        onChange={(e) => update('sortBy', e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setOpen(!open)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                        <SlidersHorizontal size={16} />
                        Filters
                        {activeCount > 0 && (
                            <span className="rounded-full bg-green-600 px-1.5 text-xs text-white">{activeCount}</span>
                        )}
                    </button>
                </div>
            </div>

            {open && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-medium text-slate-800">Filter products</h3>
                        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Min price</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={filters.minPrice}
                                onChange={(e) => update('minPrice', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Max price</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="Any"
                                value={filters.maxPrice}
                                onChange={(e) => update('maxPrice', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Min rating</label>
                            <select
                                value={filters.minRating}
                                onChange={(e) => update('minRating', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                            >
                                <option value="">Any rating</option>
                                <option value="3">3+ stars</option>
                                <option value="4">4+ stars</option>
                                <option value="5">5 stars</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={filters.inStockOnly}
                                    onChange={(e) => update('inStockOnly', e.target.checked)}
                                    className="size-4 rounded border-slate-300"
                                />
                                In stock only
                            </label>
                        </div>
                    </div>
                    {activeCount > 0 && (
                        <button onClick={clearFilters} className="mt-4 text-sm text-green-600 hover:text-green-700">
                            Clear all filters
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default ShopFilters
