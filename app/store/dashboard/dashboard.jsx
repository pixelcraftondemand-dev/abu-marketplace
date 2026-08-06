"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";
import Loading from "@/components/Loading";
import CurrencyAmount from '@/components/CurrencyAmount'
import {
  ShoppingBasketIcon,
  CircleDollarSignIcon,
  TagsIcon,
  StarIcon,
  PackagePlusIcon,
  ClipboardListIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  BadgeCheck,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function StatCard({ label, value, icon: Icon, trend, trendUp, delay = 0 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-[#111827]/60 p-5 backdrop-blur-sm transition-all duration-500 hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20 ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
          <Icon size={18} />
        </div>
      </div>
      <p className="mb-2 text-3xl font-bold text-white">{value}</p>
      {trend && (
        <div className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${trendUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, index, onViewProduct }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex max-sm:flex-col gap-4 sm:items-center justify-between rounded-2xl border border-white/[0.06] bg-[#111827]/60 p-5 backdrop-blur-sm transition-all hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-3">
          {review.user?.image ? (
            <Image src={review.user.image} alt={review.user.name || "User"} width={40} height={40} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/[0.06]" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-black">
              {(review.user?.name || "U").charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white">{review.user?.name || "Anonymous"}</p>
            <p className="text-xs text-slate-500">{review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Recently"}</p>
          </div>
        </div>
        <p className={`text-sm leading-relaxed text-slate-400 ${!expanded && review.review?.length > 120 ? "line-clamp-2" : ""}`}>
          {review.review || "No review text provided."}
        </p>
        {review.review?.length > 120 && (
          <button onClick={() => setExpanded(!expanded)} className="mt-1 text-xs text-amber-500 transition hover:text-amber-400">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
      <div className="shrink-0 space-y-3 sm:text-right">
        <p className="text-xs text-slate-500">{review.product?.category || "General"}</p>
        <p className="text-sm font-medium text-white">{review.product?.name || "Unknown Product"}</p>
        <div className="flex gap-0.5 sm:justify-end">
          {Array(5).fill(null).map((_, idx) => (
            <StarIcon key={idx} size={14} className={review.rating >= idx + 1 ? "fill-amber-500 text-amber-500" : "text-slate-700"} />
          ))}
        </div>
        <button onClick={() => review.product?.id && onViewProduct(review.product.id)} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
          <Eye size={12} />
          View Product
        </button>
      </div>
    </div>
  );
}

export default function StoreDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalProducts: 0,
    totalEarnings: 0,
    totalOrders: 0,
    averageRating: 0,
    monthlyRevenue: 0,
    monthlyOrders: 0,
    averageOrderValue: 0,
    ratings: [],
    recentOrders: [],
    topCategory: "General",
    revenueSeries: [],
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("/api/store/dashboard");
        setData(res.data.dashboardData);
      } catch (err) {
        toast.error(err?.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleViewProduct = (productId) => {
    router.push(`/product/${productId}`);
  };

  if (loading) return <Loading />;

  const stats = [
    { label: "Total Products", value: data.totalProducts.toLocaleString(), icon: ShoppingBasketIcon, trend: "+12%", trendUp: true },
    { label: "Total Earnings", value: <CurrencyAmount amount={data.totalEarnings} />, icon: CircleDollarSignIcon, trend: "+8.5%", trendUp: true },
    { label: "Monthly Orders", value: data.monthlyOrders.toLocaleString(), icon: TagsIcon, trend: "+4.2%", trendUp: true },
    { label: "Average Rating", value: data.averageRating.toFixed(1), icon: StarIcon, trend: data.averageRating > 0 ? "+0.3" : "0.0", trendUp: data.averageRating > 0 },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Seller <span className="text-amber-500">Dashboard</span></h1>
          <p className="mt-1 text-sm text-slate-500">Your store performance, orders, and customer signals in one place.</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#111827]/60 px-4 py-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <BadgeCheck size={16} className="text-amber-500" />
            <span>Top category: {data.topCategory}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={i * 100} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[2rem] border border-white/[0.06] bg-[#111827]/60 p-6 backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue overview</h2>
              <p className="text-sm text-slate-500">This month: <CurrencyAmount amount={data.monthlyRevenue} /></p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-green-400">Healthy momentum</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B3447" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                    <Tooltip formatter={(value) => [<CurrencyAmount key="revenue" amount={value} />, "Revenue"]} />
                <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="#C9A96E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/[0.06] bg-[#111827]/60 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Quick actions</h3>
              <TrendingUp size={18} className="text-amber-500" />
            </div>
            <div className="mt-4 grid gap-3">
              <button onClick={() => router.push("/store/add-product")} className="group flex items-center gap-3 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-black transition hover:bg-amber-400">
                <PackagePlusIcon size={18} />
                Add New Product
                <ArrowUpRight size={16} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
              <button onClick={() => router.push("/store/orders")} className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]">
                <ClipboardListIcon size={18} />
                Review Orders
                <ArrowUpRight size={16} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.06] bg-[#111827]/60 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white">Recent orders</h3>
            <div className="mt-4 space-y-3">
              {data.recentOrders.length > 0 ? data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Order #{order.id.slice(0, 6)}</p>
                    <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white"><CurrencyAmount amount={Number(order.total)} /></p>
                    <p className="text-xs text-slate-500">{order.status}</p>
                  </div>
                </div>
              )) : (
                <p className="rounded-2xl border border-dashed border-white/[0.06] px-4 py-6 text-sm text-slate-500">No orders yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Reviews</h2>
          {data.ratings.length > 0 && (
            <button onClick={() => router.push("/store/reviews")} className="text-sm text-amber-500 transition hover:text-amber-400">View All</button>
          )}
        </div>

        {data.ratings.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.06] py-16 text-center text-slate-500">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
              <StarIcon size={28} className="text-amber-500/50" />
            </div>
            <p className="mb-1 font-medium text-white">No reviews yet</p>
            <p className="text-sm">Reviews appear once customers rate your products.</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            {data.ratings.map((review, i) => (
              <ReviewCard key={review.id ?? i} review={review} index={i} onViewProduct={handleViewProduct} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
