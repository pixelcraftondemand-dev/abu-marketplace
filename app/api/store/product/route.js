import getImageKit from "@/configs/imageKit"
import prisma from "@/lib/prisma"
import { isAllowedImage, sanitizeText, sniffImageMagicBytes } from "@/lib/security"
import authSeller from "@/middlewares/authSeller"
import { getSessionFromRequest } from "@/lib/serverAuth"
import { NextResponse } from "next/server";

const MAX_PRODUCT_IMAGES = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PRICE = 1_000_000; // upper bound in USD — prevents absurd/overflow values

export async function POST(request){
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const storeId = await authSeller(userId)
        if(!storeId){
            return NextResponse.json({error: 'not authorized'}, { status: 401 } )
        }
        const formData = await request.formData()
        const name = sanitizeText(formData.get("name"), 120)
        const description = sanitizeText(formData.get("description"), 2000)
        const mrp =  Number(formData.get("mrp"))
        const price = Number(formData.get("price"))
        const category = sanitizeText(formData.get("category"), 60)
        const halalCertified = formData.get("halalCertified") === "on"
        const images = formData.getAll("images")
        if(!name || !description || !Number.isFinite(mrp) || !Number.isFinite(price) || mrp <= 0 || price <= 0 || price > mrp || !category || images.length < 1){
            return NextResponse.json({error: 'missing product details'}, { status: 400 } )
        }
        if (price > MAX_PRICE || mrp > MAX_PRICE) {
            return NextResponse.json({ error: `Prices must not exceed $${MAX_PRICE.toLocaleString()}.` }, { status: 422 })
        }
        if(images.length > MAX_PRODUCT_IMAGES){
            return NextResponse.json({error: `You can upload up to ${MAX_PRODUCT_IMAGES} product images.`}, { status: 422 } )
        }
        for(const image of images){
            const imageValidation = isAllowedImage(image, MAX_IMAGE_BYTES);
            if(imageValidation.error){
                return NextResponse.json({error: imageValidation.error}, { status: 422 } )
            }
            // Never trust the browser MIME type — verify the actual file signature.
            const buffer = Buffer.from(await image.arrayBuffer());
            if(buffer.byteLength > MAX_IMAGE_BYTES){
                return NextResponse.json({ error: "Image file is too large." }, { status: 422 })
            }
            if(!sniffImageMagicBytes(buffer)){
                return NextResponse.json({ error: "Uploaded file is not a valid image." }, { status: 422 } )
            }
        }
        const imagekit = getImageKit();
        const imagesUrl = await Promise.all(images.map(async (image) => {
            const buffer = Buffer.from(await image.arrayBuffer());
            if(buffer.byteLength > MAX_IMAGE_BYTES){
                throw new Error("Image file is too large.");
            }
            const response = await imagekit.upload({
                file: buffer,
                fileName: `product-${storeId}-${Date.now()}`,
                folder: "products",
                useUniqueFileName: true,
            })
            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '1024' }
                ]
            })
            return url
        }))
        await prisma.product.create({
             data: {
                name,
                description,
                mrp,
                price,
                halalCertified,
                category,
                images: imagesUrl,
                storeId
             }
        })
        return NextResponse.json({message: "Product added successfully"})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to add product." }, { status: 400 })
    }
}

export async function GET(request){
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const storeId = await authSeller(userId)
        if(!storeId){
            return NextResponse.json({error: 'not authorized'}, { status: 401 } )
        }
        const products = await prisma.product.findMany({ where: { storeId }})
        return NextResponse.json({products})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to fetch products." }, { status: 400 })
    }
}
