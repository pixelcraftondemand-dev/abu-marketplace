'use client'
import { addAddress } from "@/lib/features/address/addressSlice"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import { X, MapPin } from "lucide-react"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"

const AddressModal = ({ setShowAddressModal }) => {
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false)

    const [address, setAddress] = useState({
        name: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        // Sierra Leone pilot: deliveries are within Sierra Leone only.
        country: 'Sierra Leone',
        phone: ''
    })

    const handleAddressChange = (e) => {
        setAddress({ ...address, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/address', { address }, { headers: { Authorization: `Bearer ${token}` } })
            dispatch(addAddress(data.newAddress))
            toast.success(data.message)
            setShowAddressModal(false)
        } catch (error) {
            if (process.env.NODE_ENV !== "production") console.log(error)
            toast.error(error?.response?.data?.message || error.message)
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 outline-none transition-all duration-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-400"
    const labelClass = "text-xs text-gray-500 font-medium mb-1.5 block"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowAddressModal(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scale-in_0.2s_ease-out]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <MapPin size={18} className="text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Add Address</h2>
                            <p className="text-xs text-gray-400">Where should we deliver?</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddressModal(false)}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className={labelClass}>Full Name</label>
                        <input
                            name="name"
                            onChange={handleAddressChange}
                            value={address.name}
                            className={inputClass}
                            type="text"
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Email</label>
                        <input
                            name="email"
                            onChange={handleAddressChange}
                            value={address.email}
                            className={inputClass}
                            type="email"
                            placeholder="john@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Street Address</label>
                        <input
                            name="street"
                            onChange={handleAddressChange}
                            value={address.street}
                            className={inputClass}
                            type="text"
                            placeholder="123 Main Street"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>City</label>
                            <input
                                name="city"
                                onChange={handleAddressChange}
                                value={address.city}
                                className={inputClass}
                                type="text"
                                placeholder="Freetown"
                                required
                            />
                        </div>
                        <div>
                            <label className={labelClass}>State</label>
                            <input
                                name="state"
                                onChange={handleAddressChange}
                                value={address.state}
                                className={inputClass}
                                type="text"
                                placeholder="Western Area"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Zip Code</label>
                            <input
                                name="zip"
                                onChange={handleAddressChange}
                                value={address.zip}
                                className={inputClass}
                                type="text"
                                placeholder="00000"
                                required
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Country</label>
                            <input
                                name="country"
                                value={address.country}
                                className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
                                type="text"
                                readOnly
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Phone</label>
                        <input
                            name="phone"
                            onChange={handleAddressChange}
                            value={address.phone}
                            className={inputClass}
                            type="tel"
                            placeholder="+232 XX XXX XXXX"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--color-primary)] text-white py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                    >
                        {loading ? 'Saving...' : 'Save Address'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default AddressModal
