import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s().-]{7,20}$/;

function normalizeAddress(address) {
    if (!address || typeof address !== "object" || Array.isArray(address)) {
        return { error: "Address is required." };
    }

    const normalized = {
        name: sanitizeText(address.name, 100),
        email: sanitizeText(address.email, 254).toLowerCase(),
        street: sanitizeText(address.street, 200),
        city: sanitizeText(address.city, 100),
        state: sanitizeText(address.state, 100),
        zip: sanitizeText(address.zip, 30),
        country: sanitizeText(address.country, 100),
        phone: sanitizeText(address.phone, 20),
    };

    if (!normalized.name || !normalized.street || !normalized.city || !normalized.state || !normalized.zip || !normalized.country) {
        return { error: "Please complete all required address fields." };
    }
    if (!EMAIL_REGEX.test(normalized.email)) {
        return { error: "A valid email address is required." };
    }
    if (!PHONE_REGEX.test(normalized.phone)) {
        return { error: "A valid phone number is required." };
    }

    return { address: normalized };
}

// Add new address
export async function POST(request){
    try {
        const session = await getSessionFromRequest(request)
        const userId = session?.user?.id
        if(!userId){
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        const { address } = await request.json()
        const normalized = normalizeAddress(address);
        if(normalized.error){
            return NextResponse.json({ error: normalized.error }, { status: 422 })
        }

        const newAddress = await prisma.address.create({
            data: { ...normalized.address, userId }
        })

        return NextResponse.json({newAddress, message: 'Address added successfully' })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to add address." }, { status: 400 })
    }
}

// Get all addresses for a user
export async function GET(request){
    try {
        const session = await getSessionFromRequest(request)
        const userId = session?.user?.id
        if(!userId){
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const addresses = await prisma.address.findMany({
            where: { userId }
        })

        return NextResponse.json({addresses})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to fetch addresses." }, { status: 400 })
    }
}
