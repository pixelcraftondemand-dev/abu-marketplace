import { getOpenAI } from "@/configs/openai";
import { ALLOWED_IMAGE_TYPES, sanitizeText } from "@/lib/security";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

async function main(base64Image, mimeType) {
    const openai = getOpenAI();

    const messages = [
        {
            role: "system",
            content: `
                        You are a product listing assistant for an e-commerce store.
                        Your job is to analyze an image of a product and generate structured data.

                        Respond ONLY with raw JSON (no code block, no markdown, no explanation).
                        The JSON must strictly follow this schema:

                        {
                        "name": string,               // Short product name
                        "description": string,         // Marketing-friendly description of the product
                        }
                   `
        },
        {
            role: "user",
            content: [
                { type: "text", text: "Analyze this image and return name + description." },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
        },
    ];

    const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL,
        messages,
    });

    const raw = response.choices[0].message.content;

    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error("AI did not return valid JSON");
    }

    return {
        name: sanitizeText(parsed.name, 120),
        description: sanitizeText(parsed.description, 2000),
    };
}


export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }
        const { base64Image, mimeType } = await request.json();
        if(!ALLOWED_IMAGE_TYPES.includes(mimeType) || typeof base64Image !== "string" || base64Image.length > 7_000_000){
            return NextResponse.json({ error: "Invalid image payload." }, { status: 422 })
        }
        const result = await main(base64Image, mimeType);
        return NextResponse.json({ ...result });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to analyze product image." }, { status: 400 });
    }
}
