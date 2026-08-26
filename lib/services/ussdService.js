// ─── AMBER PAY — USSD Payment Processing (Monime Style) ──────────────────────
//
// Two USSD flows:
//
// 1. CODE REDEMPTION (primary flow):
//    - Web app generates a payment code (e.g. "7X3K9M")
//    - User dials *123*7X3K9M# on their phone
//    - USSD prompts: "1. Orange Money  2. Afrimoney"
//    - User picks provider → enters mobile money PIN
//    - Transaction completes → wallet credited
//
// 2. BALANCE CHECK:
//    - User dials *123# (no code)
//    - USSD shows wallet balance in USD + SLL
//
// Architecture:
//   User phone → Carrier → USSD Gateway → POST /api/ussd → This service → Response

import crypto from "node:crypto";
import { roundMoney } from "./walletService";
import { creditWallet, InsufficientFundsError } from "./amberPayService";
import prisma from "@/lib/prisma";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Code expiry: 10 minutes */
const CODE_TTL_MS = 10 * 60 * 1000;

/** USSD session timeout (180 seconds) */
const SESSION_TTL_MS = 180_000;

/** Session store — in production, use Redis */
const sessions = new Map();

// ─── Session Management ───────────────────────────────────────────────────────

export function getSession(phoneNumber) {
    const existing = sessions.get(phoneNumber);
    if (existing && Date.now() - existing.lastAccess < SESSION_TTL_MS) {
        existing.lastAccess = Date.now();
        return existing;
    }
    const session = {
        phoneNumber,
        state: "idle",
        data: {},
        lastAccess: Date.now(),
    };
    sessions.set(phoneNumber, session);
    return session;
}

export function clearSession(phoneNumber) {
    sessions.delete(phoneNumber);
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

export function ussdContinue(text) {
    return `CON ${text}`;
}

export function ussdEnd(text) {
    return `END ${text}`;
}

// ─── Code Generation ──────────────────────────────────────────────────────────

/**
 * Generate a 10-digit numeric payment code for USSD redemption.
 * Called by the web app when user wants to deposit/pay via mobile money.
 * Format: *914*XXXXXXXXXX# (e.g. *914*8372910456#)
 */
export async function generatePaymentCode(userId, { amount, type = "DEPOSIT", currency = "USD" } = {}) {
    const code = generateCode();

    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    const paymentCode = await prisma.paymentCode.create({
        data: {
            code,
            userId,
            amount: roundMoney(amount),
            currency,
            type,
            status: "pending",
            expiresAt,
        },
    });

    return {
        code: paymentCode.code,
        amount: paymentCode.amount,
        type: paymentCode.type,
        expiresAt: paymentCode.expiresAt,
        dialCode: `*914*${paymentCode.code}#`,
    };
}

/**
 * Generate a 10-digit numeric code.
 * Easy to type on any phone.
 */
function generateCode() {
    // Numeric only — 10 digits
    const bytes = crypto.randomBytes(10);
    let code = "";
    for (let i = 0; i < 10; i++) {
        code += String(bytes[i] % 10);
    }
    return code;
}

// ─── Code Status Check (for web app polling) ──────────────────────────────────

/**
 * Check if a payment code has been completed.
 * The web app polls this after showing the code to the user.
 */
export async function getPaymentCodeStatus(code) {
    const paymentCode = await prisma.paymentCode.findUnique({
        where: { code },
        select: {
            code: true,
            amount: true,
            status: true,
            provider: true,
            mobileRef: true,
            completedAt: true,
            expiresAt: true,
        },
    });

    if (!paymentCode) return null;

    // Auto-expire
    if (paymentCode.status === "pending" && new Date() > paymentCode.expiresAt) {
        await prisma.paymentCode.update({
            where: { code },
            data: { status: "expired" },
        });
        paymentCode.status = "expired";
    }

    return paymentCode;
}

// ─── USSD Router ──────────────────────────────────────────────────────────────

/**
 * Process a USSD request from the gateway.
 *
 * Two entry points:
 *   - *123# (no code) → balance check
 *   - *123*CODE# → code redemption flow
 */
export async function processUssdRequest({ phoneNumber, text, sessionId, serviceCode }) {
    const session = getSession(phoneNumber);
    const inputParts = text ? text.split("*") : [];
    const currentInput = inputParts[inputParts.length - 1] || "";

    // Detect code redemption: text contains a 6-char code
    // Pattern: "7X3K9M" or "123*7X3K9M" depending on gateway
    const codeFromInput = extractCode(inputParts);

    if (codeFromInput) {
        return await handleCodeRedemption(session, codeFromInput, currentInput);
    }

    // No code → balance check or main menu
    if (!text || text === serviceCode) {
        return await handleBalanceCheck(session);
    }

    // If we're in a state machine flow, continue it
    if (session.state === "select_sim") {
        return await handleSimSelection(session, currentInput);
    }

    if (session.state === "enter_pin") {
        return await handlePinEntry(session, currentInput);
    }

    // Default: show balance
    return await handleBalanceCheck(session);
}

/**
 * Extract a payment code from USSD input parts.
 * Looks for a 10-digit numeric code.
 */
function extractCode(inputParts) {
    for (const part of inputParts) {
        const cleaned = part.replace(/[^0-9]/g, "");
        if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
            return cleaned;
        }
    }
    return null;
}

// ─── Balance Check ────────────────────────────────────────────────────────────

async function handleBalanceCheck(session) {
    session.state = "idle";

    const user = await findUserByPhone(session.phoneNumber);
    if (!user) {
        return ussdEnd(
            "AMBER PAY\n" +
            "─────────────────\n" +
            "No account found.\n" +
            "Register at any AMBER PAY agent."
        );
    }

    const wallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
        select: { balance: true, status: true },
    });

    if (!wallet || wallet.status !== "active") {
        return ussdEnd(
            "AMBER PAY\n" +
            "─────────────────\n" +
            "Wallet not active.\n" +
            "Contact support."
        );
    }

    return ussdEnd(
        `AMBER PAY Balance\n` +
        `─────────────────\n` +
        `USD: $${wallet.balance.toFixed(2)}\n` +
        `SLL: SLe ${(wallet.balance * 22500).toLocaleString()}\n` +
        `\nDial *123*CODE# to pay.`
    );
}

// ─── Code Redemption Flow ─────────────────────────────────────────────────────

async function handleCodeRedemption(session, code, currentInput) {
    // Look up the payment code
    const paymentCode = await prisma.paymentCode.findUnique({
        where: { code },
        select: {
            id: true,
            code: true,
            amount: true,
            type: true,
            status: true,
            expiresAt: true,
            userId: true,
            provider: true,
        },
    });

    if (!paymentCode) {
        return ussdEnd(
            "AMBER PAY\n" +
            "─────────────────\n" +
            "Invalid code.\n" +
            "Please check and try again."
        );
    }

    // Check expiry
    if (new Date() > paymentCode.expiresAt) {
        await prisma.paymentCode.update({
            where: { code },
            data: { status: "expired" },
        });
        return ussdEnd(
            "AMBER PAY\n" +
            "─────────────────\n" +
            "Code expired.\n" +
            "Generate a new code on the app."
        );
    }

    // Check if already completed
    if (paymentCode.status === "completed") {
        return ussdEnd(
            "AMBER PAY\n" +
            "─────────────────\n" +
            "This code was already used.\n" +
            "Transaction complete."
        );
    }

    // Check if phone matches the code owner
    const phoneUser = await findUserByPhone(session.phoneNumber);
    if (!phoneUser || phoneUser.id !== paymentCode.userId) {
        return ussdEnd(
            "AMBER PAY\n" +
            "─────────────────\n" +
            "This code belongs to another account.\n" +
            "Dial from your registered phone."
        );
    }

    // If already processing or provider_selected, go straight to PIN
    if (paymentCode.status === "provider_selected" || paymentCode.status === "processing") {
        session.state = "enter_pin";
        session.data.paymentCodeId = paymentCode.id;
        session.data.code = code;
        session.data.amount = paymentCode.amount;
        session.data.provider = paymentCode.provider;

        return ussdContinue(
            `AMBER PAY — ${paymentCode.type}\n` +
            `─────────────────\n` +
            `Amount: $${paymentCode.amount.toFixed(2)}\n` +
            `Provider: ${formatProvider(paymentCode.provider)}\n` +
            `\nEnter your ${formatProvider(paymentCode.provider)} PIN:`
        );
    }

    // Step 1: SIM selection (determines provider)
    // SIM 1 = Orange Money, SIM 2 = Afrimoney
    if (paymentCode.status === "pending") {
        session.state = "select_sim";
        session.data.paymentCodeId = paymentCode.id;
        session.data.code = code;
        session.data.amount = paymentCode.amount;

        return ussdContinue(
            `AMBER PAY — ${paymentCode.type}\n` +
            `─────────────────\n` +
            `Code: ${code}\n` +
            `Amount: $${paymentCode.amount.toFixed(2)}\n` +
            `\nSelect SIM to pay with:\n` +
            `1. SIM 1 (Orange Money)\n` +
            `2. SIM 2 (Afrimoney)`
        );
    }

    return ussdEnd("Unknown code status. Try again.");
}

// ─── SIM Selection (determines provider) ─────────────────────────────────────
// SIM 1 = Orange Money, SIM 2 = Afrimoney
// The user's phone tells us which carrier — no need to ask.

async function handleSimSelection(session, input) {
    // SIM 1 → Orange Money, SIM 2 → Afrimoney
    const provider = input === "1" ? "orange_money" : input === "2" ? "afrimoney" : null;

    if (!provider) {
        return ussdContinue(
            `Invalid selection.\n` +
            `1. SIM 1 (Orange Money)\n` +
            `2. SIM 2 (Afrimoney)`
        );
    }

    // Update code with provider based on SIM choice
    await prisma.paymentCode.update({
        where: { id: session.data.paymentCodeId },
        data: { provider, status: "provider_selected" },
    });

    session.data.provider = provider;
    session.state = "enter_pin";

    return ussdContinue(
        `AMBER PAY\n` +
        `─────────────────\n` +
        `Amount: $${session.data.amount.toFixed(2)}\n` +
        `Provider: ${formatProvider(provider)}\n` +
        `\nEnter your ${formatProvider(provider)} PIN:`
    );
}

// ─── PIN Entry + Transaction Processing ───────────────────────────────────────

async function handlePinEntry(session, pin) {
    if (!pin || pin.length < 4) {
        return ussdContinue("Invalid PIN. Enter your 4-6 digit PIN:");
    }

    // Update code status to processing
    await prisma.paymentCode.update({
        where: { id: session.data.paymentCodeId },
        data: { status: "processing" },
    });

    // ─── Process the mobile money transaction ──────────────────────────
    // In production, this calls the Orange Money / Afrimoney API:
    //   - POST to provider API with: phone, amount, PIN, code
    //   - Provider debits user's mobile money wallet
    //   - Provider sends confirmation webhook
    //   - We credit the AMBER PAY wallet
    //
    // For MVP, we simulate the provider call and credit the wallet directly.

    try {
        const paymentCode = await prisma.paymentCode.findUnique({
            where: { id: session.data.paymentCodeId },
            select: { userId: true, amount: true, type: true, code: true },
        });

        if (paymentCode.type === "DEPOSIT") {
            // Credit the AMBER PAY wallet
            const result = await creditWallet(prisma, paymentCode.userId, paymentCode.amount, {
                referenceId: paymentCode.code,
                referenceType: "payment_code",
                description: `Deposit via ${formatProvider(session.data.provider)} (code: ${paymentCode.code})`,
            });

            // Mark code as completed
            await prisma.paymentCode.update({
                where: { id: session.data.paymentCodeId },
                data: {
                    status: "completed",
                    mobileRef: `MM_${Date.now().toString(36).toUpperCase()}`,
                    completedAt: new Date(),
                },
            });

            clearSession(session.phoneNumber);

            return ussdEnd(
                `AMBER PAY — Success\n` +
                `─────────────────\n` +
                `$${paymentCode.amount.toFixed(2)} credited!\n` +
                `Provider: ${formatProvider(session.data.provider)}\n` +
                `New balance: $${result.balance.toFixed(2)}\n` +
                `\nThank you for using AMBER PAY.`
            );
        }

        // For other types (WITHDRAWAL, CHECKOUT), mark as processing
        // The actual debit happens when the webhook confirms
        await prisma.paymentCode.update({
            where: { id: session.data.paymentCodeId },
            data: {
                status: "completed",
                mobileRef: `MM_${Date.now().toString(36).toUpperCase()}`,
                completedAt: new Date(),
            },
        });

        clearSession(session.phoneNumber);

        return ussdEnd(
            `AMBER PAY — Success\n` +
            `─────────────────\n` +
            `$${paymentCode.amount.toFixed(2)} processed!\n` +
            `Provider: ${formatProvider(session.data.provider)}\n` +
            `\nThank you for using AMBER PAY.`
        );
    } catch (error) {
        console.error("[USSD] Transaction error:", error);

        await prisma.paymentCode.update({
            where: { id: session.data.paymentCodeId },
            data: {
                status: "failed",
                failedAt: new Date(),
                failureReason: error.message,
            },
        });

        clearSession(session.phoneNumber);

        return ussdEnd(
            `AMBER PAY — Failed\n` +
            `─────────────────\n` +
            `Transaction could not be completed.\n` +
            `Please try again later.\n` +
            `No money was deducted.`
        );
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatProvider(provider) {
    if (provider === "orange_money") return "Orange Money";
    if (provider === "afrimoney") return "Afrimoney";
    return provider;
}

async function findUserByPhone(phoneNumber) {
    return prisma.user.findFirst({
        where: { phone: phoneNumber },
        select: { id: true, name: true },
    });
}
