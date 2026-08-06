import prisma from "@/lib/prisma";
import { isValidId, sanitizeText, ratingRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";


// Add new rating
export async function POST(request){
    try {
        const session = await getSessionFromRequest(request)
        const userId = session?.user?.id
        if(!userId){
            return NextResponse.json({error: "Unauthorized"}, { status: 401 })
        }

        const rl = ratingRateLimiter.check(userId)
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many ratings. Please wait a moment and try again." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
            )
        }

        const {orderId, productId, rating, review} = await request.json()
        if(!isValidId(orderId) || !isValidId(productId)){
            return NextResponse.json({ error: "Invalid order or product id." }, { status: 422 })
        }
        if(!Number.isInteger(rating) || rating < 1 || rating > 5){
            return NextResponse.json({ error: "Rating must be from 1 to 5." }, { status: 422 })
        }
        const cleanReview = sanitizeText(review, 1000)
        if(cleanReview.length < 3){
            return NextResponse.json({ error: "Review must be at least 3 characters." }, { status: 422 })
        }
        const order = await prisma.order.findFirst({
            where: {id: orderId, userId, orderItems: { some: { productId } }},
            select: { id: true }
        })

        if(!order){
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        // Enforce one rating per (product, order) atomically. The check-then-
        // create pattern alone is racy; the unique DB constraint is the final
        // gate, and a P2002 from a concurrent duplicate is mapped to the same
        // "already rated" response instead of a generic 500.
        try {
            const response = await prisma.rating.create({
                data: {userId, productId, rating, review: cleanReview, orderId}
            })
            return NextResponse.json({message: "Rating added successfully", rating: response})
        } catch (error) {
            if (error?.code === "P2002") {
                return NextResponse.json({ error: "Product already rated" }, { status: 400 })
            }
            throw error
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "Unable to add rating"}, { status: 400 })
    }
}

// Get all ratings for a user
export async function GET(request){
    try {
        const session = await getSessionFromRequest(request)
        const userId = session?.user?.id
        if(!userId){
            return NextResponse.json({error: "Unauthorized"}, { status: 401 })
        }
        const ratings = await prisma.rating.findMany({
            where: {userId}
        })

        return NextResponse.json({ratings})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "Unable to fetch ratings"}, { status: 400 })
    }
}
