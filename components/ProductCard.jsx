'use client'
import { StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const ProductCard = ({ product }) => {

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

    const ratingCount = product.rating?.length || 0;
    const rating = ratingCount ? Math.round(product.rating.reduce((acc, curr) => acc + curr.rating, 0) / ratingCount) : 0;
    const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

    return (
        <Link href={`/product/${product.id}`} className=' group max-xl:mx-auto'>
            <div className='relative bg-[#F5F5F5] h-40 sm:w-60 sm:h-68 rounded-lg flex items-center justify-center overflow-hidden'>
                {discount > 0 && (
                    <span className='absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-medium text-white'>
                        -{discount}%
                    </span>
                )}
                <span className='absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-green-600'>
                    Free delivery
                </span>
                <Image width={500} height={500} className='max-h-30 sm:max-h-40 w-auto group-hover:scale-115 transition duration-300' src={product.images[0]} alt="" />
            </div>
            <div className='flex justify-between gap-3 text-sm text-slate-800 pt-2 max-w-60'>
                <div className='min-w-0'>
                    <p className='truncate'>{product.name}</p>
                    <div className='flex'>
                        {Array(5).fill('').map((_, index) => (
                            <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={rating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                        ))}
                    </div>
                    <p className='mt-1 text-xs text-slate-500'>7-day returns</p>
                </div>
                <div className='text-right'>
                    <p>{currency}{product.price}</p>
                    {discount > 0 && <p className='text-xs text-slate-400 line-through'>{currency}{product.mrp}</p>}
                </div>
            </div>
        </Link>
    )
}

export default ProductCard
