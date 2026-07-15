'use client'
import Banner from "@/components/Banner";
import CookieConsent from "@/components/CookieConsent";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "@/lib/features/product/productSlice";
import { useUser } from "@clerk/nextjs";
import { fetchCart, uploadCart } from "@/lib/features/cart/cartSlice";
import { fetchAddress } from "@/lib/features/address/addressSlice";
import { fetchUserRatings } from "@/lib/features/rating/ratingSlice";
import { hydrateWishlist, loadWishlistFromStorage } from "@/lib/features/wishlist/wishlistSlice";

export default function PublicLayout({ children }) {

    const dispatch = useDispatch()
    const { user } = useUser()

    const {cartItems} = useSelector((state)=>state.cart)

    useEffect(()=>{
        dispatch(fetchProducts({}))
        dispatch(hydrateWishlist(loadWishlistFromStorage()))
    },[])

    useEffect(()=>{
        if(user){
            dispatch(fetchCart({}))
            dispatch(fetchAddress({}))
            dispatch(fetchUserRatings({}))
        }
    },[user])

    useEffect(()=>{
        if(user){
            dispatch(uploadCart({}))
        }
    },[cartItems])




    return (
        <>
            <Banner />
            <Navbar />
            <main className="pb-20 sm:pb-0">{children}</main>
            <CookieConsent />
            <Footer />
            <BottomNav />
        </>
    );
}

    const {cartItems} = useSelector((state)=>state.cart)

    useEffect(()=>{
        dispatch(fetchProducts({}))
        dispatch(hydrateWishlist(loadWishlistFromStorage()))
    },[])

    useEffect(()=>{
        if(user){
            dispatch(fetchCart({}))
            dispatch(fetchAddress({}))
            dispatch(fetchUserRatings({}))
        }
    },[user])

    useEffect(()=>{
        if(user){
            dispatch(uploadCart({}))
        }
    },[cartItems])




    return (
        <>
            <Banner />
            <Navbar />
            <main className="pb-20 sm:pb-0">{children}</main>
            <CookieConsent />
            <Footer />
            <BottomNav />
        </>
    );
}
