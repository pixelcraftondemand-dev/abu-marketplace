'use client'
import Link from "next/link";

const categoryItems = [
    'Headphones',
    'Speakers',
    'Watch',
    'Earbuds',
    'Mouse',
    'Decoration',
];

const CategoriesMarquee = () => {
    return (
        <nav aria-label="Shop by category" className="max-w-7xl mx-auto my-8 sm:my-14">
            <div className="flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar sm:justify-center">
                {categoryItems.map((category) => (
                    <Link key={category} href={`/shop?category=${encodeURIComponent(category)}`} className="group flex min-w-17 flex-col items-center gap-2 text-center text-xs font-medium text-[var(--text-secondary)]">
                        <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-[var(--border-primary)] bg-[var(--bg-muted)] transition group-hover:border-[var(--accent)] group-hover:ring-2 group-hover:ring-[var(--accent)]/20 sm:size-20">
                            <span className="text-lg font-semibold text-[var(--accent)]">{category.charAt(0)}</span>
                        </span>
                        <span>{category}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
};

export default CategoriesMarquee;
