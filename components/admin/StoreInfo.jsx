'use client'
import Image from "next/image"
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"

const StoreInfo = ({store}) => {
    const sellerName = store.user?.name || "Store owner"

    return (
        <div className="flex-1 space-y-2 text-sm">
            {store.logo ? (
                <Image width={100} height={100} src={store.logo} alt={`${store.name} logo`} className="max-w-20 max-h-20 object-contain shadow rounded-full max-sm:mx-auto" />
            ) : (
                <div aria-label={`${store.name} logo unavailable`} className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-500 max-sm:mx-auto">
                    {(store.name || "S").charAt(0).toUpperCase()}
                </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <h3 className="text-xl font-semibold text-slate-800"> {store.name} </h3>
                <span className="text-sm">@{store.username}</span>

                {/* Status Badge */}
                <span
                    className={`text-xs font-semibold px-4 py-1 rounded-full ${store.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : store.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                        }`}
                >
                    {store.status}
                </span>
            </div>

            <p className="text-slate-600 my-5 max-w-2xl">{store.description}</p>
            <p className="flex items-center gap-2"> <MapPin size={16} /> {store.address}</p>
            <p className="flex items-center gap-2"><Phone size={16} /> {store.contact}</p>
            {store.whatsappNumber && <p className="flex items-center gap-2"><MessageCircle size={16} /> {store.whatsappNumber}</p>}
            <p className="flex items-center gap-2"><Mail size={16} />  {store.email}</p>
            <p className="text-slate-700 mt-5">Applied  on <span className="text-xs">{new Date(store.createdAt).toLocaleDateString()}</span> by</p>
            <div className="flex items-center gap-2 text-sm ">
                {store.user?.image ? (
                    <Image width={36} height={36} src={store.user.image} alt="" className="w-9 h-9 rounded-full" />
                ) : (
                    <div aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-500">
                        {sellerName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div>
                    <p className="text-slate-600 font-medium">{sellerName}</p>
                    <p className="text-slate-400">{store.user?.email || "No owner email"}</p>
                </div>
            </div>
        </div>
    )
}

export default StoreInfo