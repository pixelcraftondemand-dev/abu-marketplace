import prisma from "@/lib/prisma";
import { getSafeOrigin, isValidId } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const MAX_ORDER_ITEMS = 50;
const MAX_ITEM_QUANTITY = 99;

export async function POST(request){
    try {
        const session = await getSessionFromRequest(request)
        const userId = session?.user?.id
        if(!userId){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const { addressId, items, couponCode, paymentMethod } = await request.json()

        // Check if all required fields are present
        if(!addressId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0){
           return NextResponse.json({ error: "missing order details." }, { status: 400 }); 
        }

        if(!isValidId(addressId)){
            return NextResponse.json({ error: "Invalid address." }, { status: 422 });
        }

        if(!Object.values(PaymentMethod).includes(paymentMethod)){
            return NextResponse.json({ error: "Invalid payment method." }, { status: 422 });
        }

        if(items.length > MAX_ORDER_ITEMS){
            return NextResponse.json({ error: `Orders cannot contain more than ${MAX_ORDER_ITEMS} products.` }, { status: 422 });
        }

        const address = await prisma.address.findFirst({
            where: { id: addressId, userId },
            select: { id: true },
        });
        if(!address){
            return NextResponse.json({ error: "Address not found." }, { status: 404 });
        }

        const requestedItems = new Map();
        for(const item of items){
            if(!item || !isValidId(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY){
                return NextResponse.json({ error: `Each item must have a valid product id and quantity from 1 to ${MAX_ITEM_QUANTITY}.` }, { status: 422 });
            }
            requestedItems.set(item.id, (requestedItems.get(item.id) || 0) + item.quantity);
        }

        let coupon = null;

        if (couponCode) {
        coupon = await prisma.coupon.findUnique({
                    where: {code: couponCode }
                })
                if (!coupon){
            return NextResponse.json({ error: "Coupon not found" }, { status: 400 })
        }
        if(coupon.expiresAt < new Date()){
            return NextResponse.json({ error: "Coupon has expired" }, { status: 400 })
        }
        if(coupon.discount < 0 || coupon.discount > 100){
            return NextResponse.json({ error: "Coupon is invalid" }, { status: 400 })
        }
        }
         
            // Check if coupon is applicable for new users
        if(couponCode && coupon.forNewUser){
            const userorders = await prisma.order.findMany({where: {userId}})
            if(userorders.length > 0){
                return NextResponse.json({ error: "Coupon valid for new users" }, { status: 400 })
            }
        }

        const isPlusMember = has({plan: 'plus'})

        // Check if coupon is applicable for members
        if (couponCode && coupon.forMember){
            if(!isPlusMember){
                return NextResponse.json({ error: "Coupon valid for members only" }, { status: 400 })
            }
        }

         // Group orders by storeId using a Map
         const ordersByStore = new Map()

         const products = await prisma.product.findMany({
            where: { id: { in: [...requestedItems.keys()] } },
            select: { id: true, price: true, storeId: true, inStock: true },
         });

         if(products.length !== requestedItems.size){
            return NextResponse.json({ error: "One or more products were not found." }, { status: 404 })
         }

         for(const product of products){
            if(!product.inStock){
                return NextResponse.json({ error: "One or more products are out of stock." }, { status: 400 })
            }
            const storeId = product.storeId
            if(!ordersByStore.has(storeId)){
                ordersByStore.set(storeId, [])
            }
            ordersByStore.get(storeId).push({ id: product.id, quantity: requestedItems.get(product.id), price: product.price })
         }

         let orderIds = [];
         let fullAmount = 0;

         let isDeliveryFeeAdded = false

         // Create orders for each seller
         for(const [storeId, sellerItems] of ordersByStore.entries()){
            let total = sellerItems.reduce((acc, item)=>acc + (item.price * item.quantity), 0)

            if(couponCode){
                total -= (total * coupon.discount) / 100;
            }
            if(!isPlusMember && !isDeliveryFeeAdded){
                total += 5;
                isDeliveryFeeAdded = true
            }

            fullAmount += parseFloat(total.toFixed(2))

            const order = await prisma.order.create({
                data: {
                    userId,
                     storeId,
                     addressId,
                     total: parseFloat(total.toFixed(2)),
                     paymentMethod,
                     isCouponUsed: coupon ? true : false,
                     coupon: coupon ? coupon : {},
                      orderItems: {
                        create: sellerItems.map(item => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                      }
                }
            })
            orderIds.push(order.id)
         }

         if(paymentMethod === 'STRIPE'){
            const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
            const origin = getSafeOrigin(request)

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data:{
                        currency: 'usd',
                        product_data:{
                            name: 'Order'
                        },
                        unit_amount: Math.round(fullAmount * 100)
                    },
                    quantity: 1
                }],
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // current time + 30 minutes
                mode: 'payment',
                success_url: `${origin}/loading?nextUrl=orders`,
                cancel_url: `${origin}/cart`,
                metadata: {
                    orderIds: orderIds.join(','),
                    userId,
                    appId: 'abu-marketplace'
                }
            })
            return NextResponse.json({session})
         }

          // clear the cart
          await prisma.user.update({
            where: {id: userId},
            data: {cart : {}}
          })

          return NextResponse.json({message: 'Orders Placed Successfully'})

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to place order." }, { status: 400 })
    }
}

// Get all orders for a user
export async function GET(request){
    try {
        const session = await getSessionFromRequest(request)
        const userId = session?.user?.id
        if(!userId){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const orders = await prisma.order.findMany({
            where: {userId, OR: [
                {paymentMethod: PaymentMethod.COD},
                {AND: [{paymentMethod: PaymentMethod.STRIPE}, {isPaid: true}]}
            ]},
            include: {
                orderItems: {include: {product: true}},
                address: true
            },
            orderBy: {createdAt: 'desc'}
        })

        return NextResponse.json({orders})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to fetch orders." }, { status: 400 })
    }
}
