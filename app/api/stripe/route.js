import prisma from "@/lib/prisma"
import { isValidId } from "@/lib/security"
import { NextResponse } from "next/server"
import Stripe from "stripe"

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request){
    try {
        const stripe = getStripe()
        const body = await request.text()
        const sig = request.headers.get('stripe-signature')
        if(!sig){
            return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
        }
        const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
        const handlePaymentIntent = async (paymentIntentId, isPaid) => {
            const session = await stripe.checkout.sessions.list({
                payment_intent: paymentIntentId
            })
            const metadata = session.data[0]?.metadata || {}
            const {orderIds, userId, appId} = metadata
            
            if(appId !== 'abu-marketplace' || !isValidId(userId) || !orderIds){
                return
            }
            const orderIdsArray = orderIds.split(',').filter(isValidId)
            if(orderIdsArray.length === 0){
                return
            }
            const existingOrders = await prisma.order.findMany({
                where: { id: { in: orderIdsArray }, userId },
                select: { id: true },
            })
            if(existingOrders.length !== orderIdsArray.length){
                console.error("[Stripe webhook] Order metadata mismatch.")
                return
            }
            if(isPaid){
                await prisma.order.updateMany({
                    where: { id: { in: orderIdsArray }, userId },
                    data: {isPaid: true}
                })
                await prisma.user.update({
                    where: {id: userId},
                    data: {cart : {}}
                })
            }else{
                await prisma.order.deleteMany({
                    where: { id: { in: orderIdsArray }, userId, isPaid: false }
                })
            }
        }
        switch (event.type) {
            case 'payment_intent.succeeded': {
                await handlePaymentIntent(event.data.object.id, true)
                break;
            }
            case 'payment_intent.canceled': {
                await handlePaymentIntent(event.data.object.id, false)
                break;
            }
            default:
                break;
        }
        return NextResponse.json({received: true})
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
    }
}
