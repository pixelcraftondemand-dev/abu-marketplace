import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request){
    try {
        const { userId } = getAuth(request)
        
        console.log("[is-admin] userId from Clerk:", userId)
        
        const isAdmin = await authAdmin(userId)
        
        console.log("[is-admin] isAdmin result:", isAdmin)

        if(!isAdmin){
            return NextResponse.json({ error: 'not authorized', userId, isAdmin }, { status: 401 })
        }

        return NextResponse.json({isAdmin})
    } catch (error) {
        console.error("[is-admin] error:", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}