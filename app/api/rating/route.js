import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/security";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// Add new rating
export async function POST(request){
    try {
        const { userId } = getAuth(request)
        if(!userId){
            return NextResponse.json({error: "Unauthorized"}, { status: 401 })
        }
        const {orderId, productId, rating, review} = await request.json()
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

         const isAlreadyRated = await prisma.rating.findFirst({where: {productId, orderId}})

         if(isAlreadyRated){
            return NextResponse.json({ error: "Product already rated" }, { status: 400 })
         }

         const response = await prisma.rating.create({
            data: {userId, productId, rating, review: cleanReview, orderId}
         })

         return NextResponse.json({message: "Rating added successfully", rating: response})

      
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "Unable to add rating"}, { status: 400 })
    }
}

// Get all ratings for a user
export async function GET(request){
    try {
        const {userId} = getAuth(request)
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
