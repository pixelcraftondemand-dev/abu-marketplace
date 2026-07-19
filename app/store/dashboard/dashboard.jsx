"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";
import Loading from "@/components/Loading";
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
  Calendar,
  Eye,
} from "lucide-react";

function StatCard({ label, value, icon: Icon, trend, trendUp, delay = 0 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`relative rounded-2xl p-5 border border-white/[0.06] bg-[#111827]/60 backdrop-blur-sm transition-all duration-500 hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-2">{value}</p>
      {trend && (
        <div
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
            trendUp
              ? "text-green-400 bg-green-500/10"
              : "text-red-400 bg-red-500/10"
          }`}
        >
          {trendUp ? (
            <ArrowUpRight size={12} />
          ) : (
            <ArrowDownRight size={12} />
          )}
          {trend}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, index, onViewProduct }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="flex max-sm:flex-col gap-4 sm:items-center justify-between p-5 bg-[#111827]/60 border border-white/[0.06] rounded-2xl backdrop-blur-sm hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20 transition-all"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          {review.user?.image ? (
            <Image
              src={review.user.image}
              alt={review.user.name || "User"}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/[0.06]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-sm font-bold text-black">
              {(review.user?.name || "U").charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-white">
              {review.user?.name || "Anonymous"}
            </p>
            <p className="text-xs text-slate-500">
              {review.createdAt
                ? new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Recently"}
            </p>
          </div>
        </div>
        <p
          className={`text-sm text-slate-400 leading-relaxed ${
            !expanded && review.review?.length > 120 ? "line-clamp-2" : ""
          }`}
        >
          {review.review || "No review text provided."}
        </p>
        {review.review?.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-500 hover:text-amber-400 mt-1 transition"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
      <div className="sm:text-right space-y-3 shrink-0">
        <p className="text-xs text-slate-500">
          {review.product?.category || "General"}
        </p>
        <p className="text-sm font-medium text-white">
          {review.product?.name || "Unknown Product"}
        </p>
        <div className="flex sm:justify-end gap-0.5">
          {Array(5)
            .fill(null)
            .map((_, idx) => (
              <StarIcon
                key={idx}
                size={14}
                className={
                  review.rating >= idx + 1
                    ? "text-amber-500 fill-amber-500"
                    : "text-slate-700"
                }
              />
            ))}
        </div>
        <button
          onClick={() =>
            review.product?.id && onViewProduct(review.product.id)
          }
          className="inline-flex items-center gap-1 text-xs bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition border border-white/[0.06]"
        >
          <Eye size={12} />
          View Product
        </button>
      </div>
    </div>
  );
}

export default function StoreDashboard() {
  const router = useRouter();
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "SLe";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalProducts: 0,
    totalEarnings: 0,
    totalOrders: 0,
    ratings: [],
  });
  const [timeRange, setTimeRange] = useState("all");

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
    {
      label: "Total Products",
      value: data.totalProducts.toLocaleString(),
      icon: ShoppingBasketIcon,
      trend: "+12%",
      trendUp: true,
    },
    {
      label: "Total Earnings",
      value: `${currency}${data.totalEarnings.toLocaleString()}`,
      icon: CircleDollarSignIcon,
      trend: "+8.5%",
      trendUp: true,
    },
    {
      label: "Total Orders",
      value: data.totalOrders.toLocaleString(),
      icon: TagsIcon,
      trend: "+23%",
      trendUp: true,
    },
    {
      label: "Total Reviews",
      value: data.ratings.length.toLocaleString(),
      icon: StarIcon,
      trend: data.ratings.length > 0 ? "+5%" : "0%",
      trendUp: data.ratings.length > 0,
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Seller{" "}
            <span className="text-amber-500">Dashboard</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your store performance at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-500" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-[#111827]/60 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/30 transition"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={i * 100} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <button
          onClick={() => router.push("/store/add-product")}
          className="group flex items-center gap-3 p-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl transition-all hover:shadow-lg hover:shadow-amber-500/20 font-medium text-sm"
        >
          <PackagePlusIcon size={20} />
          Add New Product
          <ArrowUpRight
            size={16}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
        <button
          onClick={() => router.push("/store/orders")}
          className="group flex items-center gap-3 p-4 bg-[#111827]/60 border border-white/[0.06] hover:border-white/[0.1] text-white rounded-2xl transition-all hover:shadow-lg hover:shadow-black/20 font-medium text-sm"
        >
          <ClipboardListIcon size={20} />
          View Orders
          <ArrowUpRight
            size={16}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="p-6 rounded-2xl bg-[#111827]/60 border border-white/[0.06] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            Performance Overview
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-green-400">+18.2%</span>
            <span>vs last period</span>
          </div>
        </div>
        <div className="h-48 flex items-end justify-between gap-2">
          {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72].map((height, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg bg-gradient-to-t from-amber-500/20 to-amber-500/60 hover:from-amber-500/30 hover:to-amber-500/80 transition-all cursor-pointer group relative"
              style={{ height: `${height}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#111827] text-white text-xs px-2 py-1 rounded-lg border border-white/[0.06] whitespace-nowrap">
                {height} orders
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 text-xs text-slate-500">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
            (month) => (
              <span key={month}>{month}</span>
            )
          )}
        </div>
      </div>

      {/* Recent Reviews */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Recent Reviews</h2>
          {data.ratings.length > 0 && (
            <button
              onClick={() => router.push("/store/reviews")}
              className="text-sm text-amber-500 hover:text-amber-400 transition"
            >
              View All
            </button>
          )}
        </div>

        {data.ratings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-white/[0.06] rounded-2xl text-slate-500 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <StarIcon size={28} className="text-amber-500/50" />
            </div>
            <p className="font-medium text-white mb-1">No reviews yet</p>
            <p className="text-sm">
              Reviews appear once customers rate your products
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {data.ratings.map((review, i) => (
              <ReviewCard
                key={i}
                review={review}
                index={i}
                onViewProduct={handleViewProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

print("store-dashboard.jsx created!")