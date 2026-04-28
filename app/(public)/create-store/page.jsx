// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/(public)/create-store/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import axios from "axios"

// Messages shown after submission depending on admin decision
const STATUS_COPY = {
    approved: "Your store has been approved! You can now add products from your dashboard.",
    rejected:  "Your store request has been rejected. Please contact the admin for more details.",
    pending:   "Your store request is pending. Please wait for admin to approve your store.",
}

const EMPTY_FORM = {
    name:        "",
    username:    "",
    description: "",
    email:       "",
    contact:     "",
    address:     "",
    image:       null,
}

export default function CreateStore() {
    const { user }     = useUser()
    const router       = useRouter()
    const { getToken } = useAuth()

    const [loading,          setLoading]          = useState(true)
    const [submitting,       setSubmitting]        = useState(false)
    const [alreadySubmitted, setAlreadySubmitted]  = useState(false)
    const [status,           setStatus]            = useState(null)
    const [storeInfo,        setStoreInfo]         = useState(EMPTY_FORM)

    // ── Fetch existing application status on mount ─────────────────────────────
    const fetchStatus = async () => {
        try {
            const token    = await getToken()
            const { data } = await axios.get("/api/store/create", {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (data.status && ["approved", "rejected", "pending"].includes(data.status)) {
                setStatus(data.status)
                setAlreadySubmitted(true)
                if (data.status === "approved") {
                    setTimeout(() => router.push("/store"), 5000)
                }
            }
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchStatus()
    }, [user])

    // ── Field change handler ───────────────────────────────────────────────────
    const onChangeHandler = (e) => {
        setStoreInfo((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    // ── Client-side pre-validation (mirrors server rules) ─────────────────────
    const validate = () => {
        if (!storeInfo.image)
            return "Please upload a store logo."
        if (storeInfo.image.size > 2 * 1024 * 1024)
            return "Logo must be under 2 MB."
        if (!storeInfo.name.trim() || storeInfo.name.length < 2)
            return "Store name must be at least 2 characters."
        if (!/^[a-z0-9_]{3,30}$/.test(storeInfo.username))
            return "Username must be 3–30 characters: lowercase letters, numbers, and underscores only."
        if (!storeInfo.description.trim() || storeInfo.description.length < 10)
            return "Description must be at least 10 characters."
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeInfo.email))
            return "Please enter a valid store email address."
        if (!storeInfo.contact.trim())
            return "Contact number is required."
        if (!storeInfo.address.trim() || storeInfo.address.length < 5)
            return "Please enter a full store address."
        return null
    }

    // ── Submit handler ─────────────────────────────────────────────────────────
    const onSubmitHandler = async (e) => {
        e.preventDefault()

        const validationError = validate()
        if (validationError) return toast.error(validationError)

        setSubmitting(true)
        try {
            const token    = await getToken()
            const formData = new FormData()

            formData.append("name",        storeInfo.name.trim())
            formData.append("username",    storeInfo.username.trim().toLowerCase())
            formData.append("description", storeInfo.description.trim())
            formData.append("email",       storeInfo.email.trim())
            formData.append("contact",     storeInfo.contact.trim())
            formData.append("address",     storeInfo.address.trim())
            formData.append("image",       storeInfo.image)

            const { data } = await axios.post("/api/store/create", formData, {
                headers: { Authorization: `Bearer ${token}` },
            })

            toast.success(data.message)
            setStatus("pending")
            setAlreadySubmitted(true)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setSubmitting(false)
        }
    }

    // ── Not logged in ──────────────────────────────────────────────────────────
    if (!user) {
        return (
            <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
                <h1 className="text-2xl sm:text-4xl font-semibold">
                    Please <span className="text-slate-500">Login</span> to continue
                </h1>
            </div>
        )
    }

    if (loading) return <Loading />

    // ── Already submitted — show status message ────────────────────────────────
    if (alreadySubmitted) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center">
                <p className="sm:text-2xl lg:text-3xl mx-5 font-semibold text-slate-500 text-center max-w-2xl">
                    {STATUS_COPY[status]}
                </p>
                {status === "approved" && (
                    <p className="mt-5 text-slate-400">
                        Redirecting to dashboard in <span className="font-semibold">5 seconds</span>…
                    </p>
                )}
            </div>
        )
    }

    // ── Store creation form ────────────────────────────────────────────────────
    return (
        <div className="mx-6 min-h-[70vh] my-16">
            <form
                onSubmit={onSubmitHandler}
                className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500"
                encType="multipart/form-data"
                noValidate
            >
                {/* Title */}
                <div>
                    <h1 className="text-3xl">
                        Add Your <span className="text-slate-800 font-medium">Store</span>
                    </h1>
                    <p className="max-w-lg">
                        To become a seller on ABU Marketplace, submit your store details for review.
                        Your store will be activated after admin verification.
                    </p>
                </div>

                {/* Logo upload */}
                <label className="mt-10 cursor-pointer">
                    Store Logo
                    <Image
                        src={storeInfo.image ? URL.createObjectURL(storeInfo.image) : assets.upload_area}
                        className="rounded-lg mt-2 h-16 w-auto"
                        alt="Store logo preview"
                        width={150}
                        height={100}
                    />
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) =>
                            setStoreInfo((prev) => ({ ...prev, image: e.target.files[0] || null }))
                        }
                        hidden
                    />
                </label>

                <p>Username</p>
                <input
                    name="username"
                    onChange={onChangeHandler}
                    value={storeInfo.username}
                    type="text"
                    placeholder="e.g. my_store_123"
                    maxLength={30}
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                />

                <p>Name</p>
                <input
                    name="name"
                    onChange={onChangeHandler}
                    value={storeInfo.name}
                    type="text"
                    placeholder="Enter your store name"
                    maxLength={100}
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                />

                <p>Description</p>
                <textarea
                    name="description"
                    onChange={onChangeHandler}
                    value={storeInfo.description}
                    rows={5}
                    placeholder="Enter your store description"
                    maxLength={1000}
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
                />

                <p>Email</p>
                <input
                    name="email"
                    onChange={onChangeHandler}
                    value={storeInfo.email}
                    type="email"
                    placeholder="Enter your store email"
                    maxLength={254}
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                />

                <p>Contact Number</p>
                <input
                    name="contact"
                    onChange={onChangeHandler}
                    value={storeInfo.contact}
                    type="text"
                    placeholder="Enter your store contact number"
                    maxLength={20}
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
                />

                <p>Address</p>
                <textarea
                    name="address"
                    onChange={onChangeHandler}
                    value={storeInfo.address}
                    rows={5}
                    placeholder="Enter your store address"
                    maxLength={300}
                    className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
                />

                <button
                    type="submit"
                    disabled={submitting}
                    className="bg-slate-800 text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-slate-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? "Submitting…" : "Submit"}
                </button>
            </form>
        </div>
    )
}
