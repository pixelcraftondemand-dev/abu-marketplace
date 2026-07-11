'use client'
import { assets } from "@/assets/assets";
import Link from "next/link";

const categoryItems = [
    { label: 'Headphones', image: assets.product_img4 },
    { label: 'Speakers', image: assets.product_img2 },
    { label: 'Watch', image: assets.product_img3 },
    { label: 'Earbuds', image: assets.product_img9 },
    { label: 'Mouse', image: assets.product_img11 },
    { label: 'Decoration', image: assets.product_img1 },
];

const CategoriesMarquee = () => {
    return (
        <nav aria-label="Shop by category" className="max-w-7xl mx-auto my-8 sm:my-14">
            <div className="flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar sm:justify-center">
                {categoryItems.map((category) => (
                    <Link key={category.label} href={`/shop?category=${encodeURIComponent(category.label)}`} className="group flex min-w-17 flex-col items-center gap-2 text-center text-xs font-medium text-slate-600">
                        <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 transition group-hover:border-green-500 group-hover:ring-2 group-hover:ring-green-100 sm:size-20">
                            <img src={category.image.src} alt="" className="size-full object-cover" />
                        </span>
                        <span>{category.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
};

export default CategoriesMarquee;
