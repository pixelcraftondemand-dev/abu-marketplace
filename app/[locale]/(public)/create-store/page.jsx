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
    rejected: "Your store request needs changes before we can approve it.",
    pending: "Your store request is pending. Please wait for admin to approve your store.",
}

const EMPTY_FORM = {
    name: "",
    username: "",
    description: "",
    email: "",
    contact: "",
    whatsappNumber: "",
    address: "",
    image: null,
}

export default function CreateStore() {
    const { user, isLoaded: userLoaded } = useUser()
    const { getToken } = useAuth()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(false)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState(null)
    const [storeInfo, setStoreInfo] = useState(EMPTY_FORM)
    const [previewUrl, setPreviewUrl] = useState("")
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    // Set when the admin rejected the application: the reason to fix, and the
    // existing logo so a resubmission doesn't force another upload.
    const [rejectionReason, setRejectionReason] = useState("")
    const [existingLogo, setExistingLogo] = useState("")

    const fetchStatus = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get("/api/store/create", {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (data.status && ["approved", "rejected", "pending"].includes(data.status)) {
                setStatus(data.status)
                setAlreadySubmitted(true)
                setRejectionReason(data.rejectionReason || "")
                setExistingLogo(data.store?.logo || "")
                // Everything the seller already wrote is loaded back, so fixing
                // a rejected application is an edit rather than a retype.
                if (data.canResubmit && data.store) {
                    setStoreInfo((prev) => ({
                        ...prev,
                        name:        data.store.name || "",
                        username:    data.store.username || "",
                        description: data.store.description || "",
                        email:       data.store.email || "",
                        contact:     data.store.contact || "",
                        whatsappNumber: data.store.whatsappNumber || "",
                        address:     data.store.address || "",
                    }))
                }
                if (data.status === "approved") {
                    setTimeout(() => router.push("/store/dashboard"), 5000)
                }
            }
            return true
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const refreshApplicationStatus = async () => {
        setCheckingStatus(true)
        try {
            const refreshed = await fetchStatus()
            if (refreshed) toast.success("Application status refreshed.")
        } finally {
            setCheckingStatus(false)
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
        // On a resubmission the existing logo is kept unless a new file is chosen.
        if (!storeInfo.image && !(status === "rejected" && existingLogo)) return "Please upload a store logo."
        if (storeInfo.image && storeInfo.image.size > 2 * 1024 * 1024) return "Logo must be under 2 MB."
        if (!storeInfo.name.trim() || storeInfo.name.length < 2) return "Store name must be at least 2 characters."
        if (!/^[a-z0-9_]{3,30}$/.test(storeInfo.username)) return "Username must be 3–30 characters: lowercase letters, numbers, and underscores only."
        if (!storeInfo.description.trim() || storeInfo.description.length < 10) return "Description must be at least 10 characters."
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storeInfo.email)) return "Please enter a valid store email address."
        if (!storeInfo.contact.trim()) return "Contact number is required."
        if (!storeInfo.whatsappNumber.trim()) return "WhatsApp number is required so buyers can contact you."
        if (!/^[+]?[0-9\s\-().]{8,20}$/.test(storeInfo.whatsappNumber.trim())) return "Please enter a valid WhatsApp number."
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
            formData.append("whatsappNumber", storeInfo.whatsappNumber.trim())
            formData.append("address", storeInfo.address.trim())
            if (storeInfo.image) formData.append("image", storeInfo.image)

            const { data } = await axios.post("/api/store/create", formData, {
                headers: { Authorization: `Bearer ${token}` },
            })

            toast.success(data.message)
            setStatus("pending")
            setRejectionReason("")
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
                    <h1 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">Sell on ABU Marketplace</h1>
                    <p className="mt-3 text-sm leading-6 text-[#6A6053]">Create an account to submit your store for approval. Already have an account? Sign in to continue.</p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link href="/sign-up" className="rounded-full bg-[#1A1A1A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#333]">
                            Create account
                        </Link>
                        <Link href="/sign-in" className="rounded-full border border-[#D8CCBC] px-6 py-3 text-sm font-semibold text-[#5B5245] transition hover:bg-[#FCF7EE]">
                            Sign in
                        </Link>
                    </div>
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
                    {status === "rejected" && rejectionReason && (
                        <div className="mt-6 rounded-2xl border border-[#E8B98A] bg-[#FFF7ED] p-5 text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A5B1E]">
                                What to fix
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#5B5245]">{rejectionReason}</p>
                        </div>
                    )}

                    <div className="mt-6 rounded-3xl bg-[#FCF7EE] p-6 text-left text-sm leading-7 text-[#5B5245]">
                        {status === "rejected" ? (
                            <>
                                <p>• Fix the details above and resubmit — nothing is lost, your application stays on file.</p>
                                <p>• Your logo is kept unless you choose a new one.</p>
                                <p>• You&apos;ll get an email as soon as the decision is made.</p>
                            </>
                        ) : (
                            <>
                                <p>• Your submission is now with the admin team for review.</p>
                                <p>• You will receive a decision once your store details have been verified.</p>
                                <p>• Approved stores can start adding products immediately from the seller dashboard.</p>
                            </>
                        )}
                    </div>

                    {status === "rejected" && (
                        <button
                            onClick={() => {
                                setAlreadySubmitted(false)
                                setPreviewUrl("")
                            }}
                            className="mt-6 rounded-full bg-[#1A1A1A] px-8 py-3 text-sm font-semibold text-[#F6E0B9] transition hover:bg-[#333]"
                        >
                            Fix and resubmit
                        </button>
                    )}

                    {status === "approved" && (
                        <div className="mt-6">
                            <Link
                                href="/store/dashboard"
                                className="inline-flex rounded-full bg-[#1A1A1A] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#333]"
                            >
                                Open seller dashboard
                            </Link>
                            <p className="mt-3 text-sm text-[#6A6053]">
                                Redirecting automatically in <span className="font-semibold">5 seconds</span>…
                            </p>
                        </div>
                    )}

                    {status === "pending" && (
                        <button
                            type="button"
                            onClick={refreshApplicationStatus}
                            disabled={checkingStatus}
                            className="mt-6 rounded-full border border-[#D8CCBC] px-6 py-3 text-sm font-semibold text-[#5B5245] transition hover:bg-[#FCF7EE] disabled:cursor-wait disabled:opacity-60"
                        >
                            {checkingStatus ? "Checking…" : "Check application status"}
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="mx-4 my-10 sm:mx-6 sm:my-16">
            <div className="mx-auto max-w-3xl">
                <form
                    onSubmit={onSubmitHandler}
                    className="relative isolate space-y-8 overflow-hidden rounded-[2rem] border border-[#E8DCC8] bg-[#FCF7EE] p-5 shadow-[0_24px_64px_rgba(34,34,34,0.08)] sm:p-8"
                    encType="multipart/form-data"
                    noValidate
                >
                    <svg
                        aria-hidden="true"
                        focusable="false"
                        viewBox="0 0 600 1000"
                        preserveAspectRatio="xMidYMid slice"
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
                    >
                        <defs>
                            <pattern id="seller-shopping-doodles" width="64" height="58" patternUnits="userSpaceOnUse">
                                <g fill="none" stroke="#B88D62" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" opacity=".68">
                                    <path d="M7 9h14l-1.5 12h-11L7 9Zm3 0c0-5 8-5 8 0" />
                                    <path d="m37 8 5-3 5 3v12H34V8l5 3 3-3 3 3 2-3M42 8v12M37 13h10" />
                                    <path d="m5 37 3 1 1 3 1-3 3-1-3-1-1-3-1 3-3 1Z" />
                                    <path d="M35 38h3l2 9h11l2-7H40m1 10h.1m8 0h.1" />
                                    <path d="M5 54c2-2 4-2 6 0m1-2 2 2-2 2" />
                                    <path d="m25 28 1.2 3.3 3.3 1.2-3.3 1.2L25 37l-1.2-3.3-3.3-1.2 3.3-1.2L25 28Z" />
                                </g>
                            </pattern>
                        </defs>
                        <rect width="600" height="1000" fill="url(#seller-shopping-doodles)" />
                    </svg>
                    <div className="relative z-10 grid gap-6">
                        <div className="flex items-center justify-between gap-3 border-b border-[#EEE7DE] pb-5">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2457A6]">Sell on ABU</p>
                                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1A1A1A] sm:text-3xl">Create your store</h1>
                                <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                                    Add your store details to submit an application for approval.
                                </p>
                            </div>
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
                                    className="mt-2 w-full rounded-2xl border border-[#CBD8EB] bg-[#EFF4FC] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#2457A6] focus:ring-2 focus:ring-[#DCE8FA]"
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
                                    className="mt-2 w-full rounded-2xl border border-[#CBD8EB] bg-[#EFF4FC] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#2457A6] focus:ring-2 focus:ring-[#DCE8FA]"
                                />
                            </label>
                        </div>

                        <label className="block text-sm font-medium text-[#4B4538]">
                            Store logo
                            <div className="mt-3 flex items-start gap-5 rounded-3xl border border-dashed border-[#D8C8B2] bg-[#FCF7EE] p-4">
                                <div className="relative h-24 w-24 overflow-hidden rounded-3xl bg-white shadow-sm">
                                    <Image
                                        src={previewUrl || (status === "rejected" ? existingLogo : "") || assets.upload_area}
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
                                        className="inline-flex cursor-pointer rounded-full border border-[#EA580C] bg-[#F6E0B9] px-4 py-2 text-sm font-semibold text-[#5D4B2C] transition hover:bg-[#E5CA92]"
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
                                className="mt-2 w-full resize-none rounded-3xl border border-[#CBD8EB] bg-[#EFF4FC] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#2457A6] focus:ring-2 focus:ring-[#DCE8FA]"
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
                                    className="mt-2 w-full rounded-2xl border border-[#CBD8EB] bg-[#EFF4FC] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#2457A6] focus:ring-2 focus:ring-[#DCE8FA]"
                                />
                            </label>

                            <label className="block text-sm font-medium text-[#4B4538]">
                                Contact number
                                <input
                                    name="contact"
                                    onChange={onChangeHandler}
                                    value={storeInfo.contact}
                                    type="text"
                                    placeholder="e.g. +232 76 123 456"
                                    maxLength={20}
                                    className="mt-2 w-full rounded-2xl border border-[#CBD8EB] bg-[#EFF4FC] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#2457A6] focus:ring-2 focus:ring-[#DCE8FA]"
                                />
                            </label>

                            <label className="block text-sm font-medium text-[#4B4538]">
                                WhatsApp number <span className="text-red-500">*</span>
                                <input
                                    name="whatsappNumber"
                                    onChange={onChangeHandler}
                                    value={storeInfo.whatsappNumber}
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    placeholder="e.g. 076 123 456"
                                    maxLength={20}
                                    required
                                    className="mt-2 w-full rounded-2xl border border-[#CBD8EB] bg-[#EFF4FC] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#2457A6] focus:ring-2 focus:ring-[#DCE8FA]"
                                />
                                <span className="mt-2 block text-xs text-[#8C8071]">Required. The Contact Vendor button opens a direct WhatsApp chat with you.</span>
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
                                className="mt-2 w-full resize-none rounded-3xl border border-[#CBD8EB] bg-[#EFF4FC] px-4 py-3 text-sm text-[#1A1A1A] outline-none focus:border-[#2457A6] focus:ring-2 focus:ring-[#DCE8FA]"
                            />
                        </label>
                    </div>

                    <div className="rounded-3xl border border-[#E8DCC8] bg-[#FCF7EE] p-4 text-sm text-[#5B5245]">
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={() => setAgreedToTerms((prev) => !prev)}
                                className="mt-1 h-4 w-4 rounded border-[#EA580C] text-[#1A1A1A] focus:ring-[#EA580C]"
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
