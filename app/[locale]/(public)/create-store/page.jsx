// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/[locale]/(public)/create-store/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import axios from "axios"

const STATUS_COPY = {
    approved: "Your store has been approved! You can now add products from your dashboard.",
    rejected: "Your store request has been rejected. Please contact the admin for more details.",
    pending: "Your store request is pending. Please wait for admin to approve your store.",
}

const EMPTY_FORM = {
    name: "",
    username: "",
    description: "",
    email: "",
    contact: "",
    address: "",
    image: null,
}

export default function CreateStore() {
    const { user, isLoaded: userLoaded } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState(null)
    const [storeInfo, setStoreInfo] = useState(EMPTY_FORM)
    const [previewUrl, setPreviewUrl] = useState("")
    const [agreedToTerms, setAgreedToTerms] = useState(false)

    const fetchStatus = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get("/api/store/create", {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (data.status && ["approved", "rejected", "pending"].includes(data.status)) {
                setStatus(data.status)
                setAlreadySubmitted(true)
                if (data.status === "approved") {
                    setTimeout(() => router.push(data.storeUsername ? `/shop/${data.storeUsername}` : "/store"), 5000)
                }
            }
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!userLoaded) return

        if (!user) {
            setLoading(false)
            return
        }

        fetchStatus()
    }, [user, userLoaded])

    useEffect(() => {
        return () => {
            if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    const onChangeHandler = (e) => {
        setStoreInfo((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0] || null

        if (previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl)
        }

        const nextPreview = file ? URL.createObjectURL(file) : ""
        setPreviewUrl(nextPreview)
        setStoreInfo((prev) => ({ ...prev, image: file }))
    }

    const validate = () => {
        if (!storeInfo.image) return "Please upload a store logo."
        if (storeInfo.image.size > 2 * 1024 * 1024) return "Logo must be under 2 MB."
        if (!storeInfo.name.trim() || storeInfo.name.length < 2) return "Store name must be at least 2 characters."
        if (!/^[a-z0-9_]{3,30}$/.test(storeInfo.username)) return "Username must be 3–30 characters: lowercase letters, numbers, and underscores only."
        if (!storeInfo.description.trim() || storeInfo.description.length < 10) return "Description must be at least 10 characters."
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeInfo.email)) return "Please enter a valid store email address."
        if (!storeInfo.contact.trim()) return "Contact number is required."
        if (!storeInfo.address.trim() || storeInfo.address.length < 5) return "Please enter a full store address."
        if (!agreedToTerms) return "Please confirm that you agree to the seller agreement."
        return null
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()

        const validationError = validate()
        if (validationError) return toast.error(validationError)

        setSubmitting(true)
        try {
            const token = await getToken()
            const formData = new FormData()

            formData.append("name", storeInfo.name.trim())
            formData.append("username", storeInfo.username.trim().toLowerCase())
            formData.append("description", storeInfo.description.trim())
            formData.append("email", storeInfo.email.trim())
            formData.append("contact", storeInfo.contact.trim())
            formData.append("address", storeInfo.address.trim())
            formData.append("image", storeInfo.image)

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

    if (!userLoaded) return <Loading />

    if (!user) {
        return (
            <div className="mx-6 flex min-h-[80vh] items-center justify-center">
                <div className="max-w-lg rounded-[2rem] border border-[#E8DCC8] bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">Access required</p>
                    <h1 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">Please sign in to continue</h1>
                    <p className="mt-3 text-sm leading-6 text-[#6A6053]">Create your account first and then return to submit your store application.</p>
                </div>
            </div>
        )
    }

    if (loading) return <Loading />

    if (alreadySubmitted) {
        return (
            <div className="mx-6 flex min-h-[80vh] items-center justify-center">
                <div className="max-w-2xl rounded-[2rem] border border-[#E8DCC8] bg-white p-8 text-center shadow-[0_25px_70px_rgba(34,34,34,0.08)]">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">Application status</p>
                    <h1 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">{STATUS_COPY[status]}</h1>
                    <div className="mt-6 rounded-3xl bg-[#FCF7EE] p-6 text-left text-sm leading-7 text-[#5B5245]">
                        <p>• Your submission is now with the admin team for review.</p>
                        <p>• You will receive a decision once your store details have been verified.</p>
                        <p>• Approved stores can start adding products immediately from the seller dashboard.</p>
                    </div>
                    {status === "approved" && (
                        <p className="mt-6 text-sm text-[#6A6053]">
                            Redirecting to your dashboard in <span className="font-semibold">5 seconds</span>…
                        </p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="mx-6 my-16">
            <div className="mx-auto grid max-w-7xl gap-10 xl:grid-cols-[1.3fr_0.9fr]">
                <section className="space-y-8 rounded-[2rem] bg-[#F9F6F0] p-8 shadow-[0_30px_80px_rgba(34,34,34,0.08)]">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F0E3D1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#7B6446]">
                        Store onboarding
                    </div>
                    <div className="space-y-4">
                        <div className="max-w-3xl">
                            <h1 className="text-4xl font-semibold tracking-tight text-[#1A1A1A]">Create your store on ABU Marketplace</h1>
                            <p className="mt-3 max-w-2xl text-base leading-7 text-[#5B5245]">
                                Share your products with a growing halal-conscious audience. Submit your store details for review and get listed after admin approval.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                "Verified seller support",
                                "Fast approval review",
                                "Secure payment onboarding",
                                "Built for halal marketplaces",
                            ].map((feature) => (
                                <div key={feature} className="rounded-3xl border border-[#E8DCC8] bg-white p-5 shadow-sm">
                                    <p className="text-sm font-semibold text-[#1A1A1A]">{feature}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-8 sm:grid-cols-2">
                        <div className="rounded-3xl bg-white p-6 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#A2825F]">Why list on ABU</p>
                            <h2 className="mt-4 text-xl font-semibold text-[#1A1A1A]">Your store gets premium exposure.</h2>
                            <p className="mt-3 text-sm leading-6 text-[#6A6053]">
                                Every approved store is shown to buyers searching for trusted halal-certified products.
                            </p>
                        </div>
                        <div className="rounded-3xl border border-[#E8DCC8] bg-[#FFF9EB] p-6">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#A2825F]">Quick facts</p>
                            <ul className="mt-4 space-y-3 text-sm text-[#5B5245]">
                                <li>• One store application per account.</li>
                                <li>• Admin review usually completes in 24–48 hours.</li>
                                <li>• Logo and contact details are required.</li>
                                <li>• Approved stores can immediately add products.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <form
                    onSubmit={onSubmitHandler}
                    className="space-y-8 rounded-[2rem] bg-white p-8 shadow-[0_30px_80px_rgba(34,34,34,0.08)]"
                    encType="multipart/form-data"
                    noValidate
                >
                    <div className="grid gap-6">
                        <div className="rounded-3xl bg-[#f7efe5] p-6">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#A2825F]">Store details</p>
                            <h2 className="mt-3 text-2xl font-semibold text-[#1A1A1A]">Submit your application</h2>
                            <p className="mt-2 text-sm leading-6 text-[#6B6560]">
                                Provide accurate shop information and a logo so the admin can approve your storefront quickly.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm font-medium text-[#4B4538]">
                                Store username
                                <input
                                    name="username"
                                    onChange={onChangeHandler}
                                    value={storeInfo.username}
                                    type="text"
                                    placeholder="e.g. my_store_123"
                                    maxLength={30}
                                    className="mt-2 w-full rounded-2xl border border-[#E4D8C6] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#C9A96E] focus:ring-2 focus:ring-[#F6E8C6]"
                                />
                                <span className="mt-2 block text-xs text-[#8C8071]">Lowercase letters, numbers, underscores only.</span>
                            </label>

                            <label className="block text-sm font-medium text-[#4B4538]">
                                Store name
                                <input
                                    name="name"
                                    onChange={onChangeHandler}
                                    value={storeInfo.name}
                                    type="text"
                                    placeholder="Your store name"
                                    maxLength={100}
                                    className="mt-2 w-full rounded-2xl border border-[#E4D8C6] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#C9A96E] focus:ring-2 focus:ring-[#F6E8C6]"
                                />
                            </label>
                        </div>

                        <label className="block text-sm font-medium text-[#4B4538]">
                            Store logo
                            <div className="mt-3 flex items-start gap-5 rounded-3xl border border-dashed border-[#D8C8B2] bg-[#FCF7EE] p-4">
                                <div className="relative h-24 w-24 overflow-hidden rounded-3xl bg-white shadow-sm">
                                    <Image
                                        src={previewUrl || assets.upload_area}
                                        alt="Store logo preview"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-[#4B4538]">Upload your store logo</p>
                                    <p className="text-sm text-[#7B6955]">JPEG, PNG, WebP or GIF. Max 2 MB.</p>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleLogoChange}
                                        hidden
                                        id="store-logo-input"
                                    />
                                    <label
                                        htmlFor="store-logo-input"
                                        className="inline-flex cursor-pointer rounded-full border border-[#C9A96E] bg-[#F6E0B9] px-4 py-2 text-sm font-semibold text-[#5D4B2C] transition hover:bg-[#E5CA92]"
                                    >
                                        Choose logo
                                    </label>
                                </div>
                            </div>
                        </label>

                        <label className="block text-sm font-medium text-[#4B4538]">
                            Store description
                            <textarea
                                name="description"
                                onChange={onChangeHandler}
                                value={storeInfo.description}
                                rows={5}
                                placeholder="Tell customers what makes your store special"
                                maxLength={1000}
                                className="mt-2 w-full resize-none rounded-3xl border border-[#E4D8C6] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#C9A96E] focus:ring-2 focus:ring-[#F6E8C6]"
                            />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm font-medium text-[#4B4538]">
                                Store email
                                <input
                                    name="email"
                                    onChange={onChangeHandler}
                                    value={storeInfo.email}
                                    type="email"
                                    placeholder="contact@yourstore.com"
                                    maxLength={254}
                                    className="mt-2 w-full rounded-2xl border border-[#E4D8C6] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#C9A96E] focus:ring-2 focus:ring-[#F6E8C6]"
                                />
                            </label>

                            <label className="block text-sm font-medium text-[#4B4538]">
                                Contact number
                                <input
                                    name="contact"
                                    onChange={onChangeHandler}
                                    value={storeInfo.contact}
                                    type="text"
                                    placeholder="e.g. +123 456 7890"
                                    maxLength={20}
                                    className="mt-2 w-full rounded-2xl border border-[#E4D8C6] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#C9A96E] focus:ring-2 focus:ring-[#F6E8C6]"
                                />
                            </label>
                        </div>

                        <label className="block text-sm font-medium text-[#4B4538]">
                            Store address
                            <textarea
                                name="address"
                                onChange={onChangeHandler}
                                value={storeInfo.address}
                                rows={4}
                                placeholder="Your store or office address"
                                maxLength={300}
                                className="mt-2 w-full resize-none rounded-3xl border border-[#E4D8C6] bg-white px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#C9A96E] focus:ring-2 focus:ring-[#F6E8C6]"
                            />
                        </label>
                    </div>

                    <div className="rounded-3xl border border-[#E8DCC8] bg-[#FCF7EE] p-4 text-sm text-[#5B5245]">
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={() => setAgreedToTerms((prev) => !prev)}
                                className="mt-1 h-4 w-4 rounded border-[#C9A96E] text-[#1A1A1A] focus:ring-[#C9A96E]"
                            />
                            <span>
                                I confirm that I have reviewed the seller agreement and agree to the standards for operating a store on ABU Marketplace.
                                <Link href="/seller-agreement" className="ml-1 font-semibold text-[#1A1A1A] underline underline-offset-2">Read agreement</Link>
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !agreedToTerms}
                        className="w-full rounded-3xl bg-[#1A1A1A] px-7 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? "Submitting…" : "Submit Store Application"}
                    </button>
                </form>
            </div>
        </div>
    )
}

