import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function GET(request){
    try {
        const session = await getSessionFromRequest(request)
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const isAdmin = await authAdmin(session.user.id)

        if(!isAdmin){
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        return NextResponse.json({isAdmin})
    } catch (error) {
        console.error("[is-admin] error:", error);
        return NextResponse.json({ error: "Unable to verify admin access." }, { status: 400 })
    }
}
