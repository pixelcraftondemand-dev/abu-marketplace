// AMBER PAY — USSD Payment Processing

import crypto from "node:crypto";
import { roundMoney } from "./walletService";
import { creditWallet } from "./walletService";
import prisma from "@/lib/prisma";

const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 180_000;

interface Session {
  phoneNumber: string;
  state: string;
  data: Record<string, unknown>;
  lastAccess: number;
}

const sessions = new Map<string, Session>();

export function getSession(phoneNumber: string): Session {
  const existing = sessions.get(phoneNumber);
  if (existing && Date.now() - existing.lastAccess < SESSION_TTL_MS) {
    existing.lastAccess = Date.now();
    return existing;
  }
  const session: Session = { phoneNumber, state: "idle", data: {}, lastAccess: Date.now() };
  sessions.set(phoneNumber, session);
  return session;
}

export function clearSession(phoneNumber: string): void {
  sessions.delete(phoneNumber);
}

export function ussdContinue(text: string): string {
  return `CON ${text}`;
}

export function ussdEnd(text: string): string {
  return `END ${text}`;
}

function generateCode(): string {
  const bytes = crypto.randomBytes(10);
  let code = "";
  for (let i = 0; i < 10; i++) { code += String(bytes[i] % 10); }
  return code;
}

export async function generatePaymentCode(userId: string, { amount = 0, type = "DEPOSIT", currency = "USD" }: { amount?: number; type?: string; currency?: string } = {}): Promise<{ code: string; amount: number; type: string; expiresAt: Date; dialCode: string }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const paymentCode = await prisma.paymentCode.create({ data: { code, userId, amount: roundMoney(amount), currency, type, status: "pending", expiresAt } });
  return { code: paymentCode.code, amount: paymentCode.amount, type: paymentCode.type, expiresAt: paymentCode.expiresAt, dialCode: `*914*${paymentCode.code}#` };
}

export async function getPaymentCodeStatus(code: string): Promise<Record<string, unknown> | null> {
  const paymentCode = await prisma.paymentCode.findUnique({ where: { code }, select: { code: true, amount: true, status: true, provider: true, mobileRef: true, completedAt: true, expiresAt: true } });
  if (!paymentCode) return null;
  if (paymentCode.status === "pending" && new Date() > paymentCode.expiresAt) {
    await prisma.paymentCode.update({ where: { code }, data: { status: "expired" } });
    paymentCode.status = "expired";
  }
  return paymentCode;
}

function extractCode(inputParts: string[]): string | null {
  for (const part of inputParts) {
    const cleaned = part.replace(/[^0-9]/g, "");
    if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) return cleaned;
  }
  return null;
}

function formatProvider(provider: string): string {
  if (provider === "orange_money") return "Orange Money";
  if (provider === "afrimoney") return "Afrimoney";
  return provider;
}

async function findUserByPhone(phoneNumber: string): Promise<{ id: string; name: string } | null> {
  return prisma.user.findFirst({ where: { phone: phoneNumber }, select: { id: true, name: true } });
}

async function handleBalanceCheck(session: Session): Promise<string> {
  session.state = "idle";
  const user = await findUserByPhone(session.phoneNumber);
  if (!user) return ussdEnd("AMBER PAY\n─────────────────\nNo account found.\nRegister at any AMBER PAY agent.");
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id }, select: { balance: true, status: true } });
  if (!wallet || wallet.status !== "active") return ussdEnd("AMBER PAY\n─────────────────\nWallet not active.\nContact support.");
  return ussdEnd(`AMBER PAY Balance\n─────────────────\nUSD: $${wallet.balance.toFixed(2)}\nSLL: SLe ${(wallet.balance * 22500).toLocaleString()}\n\nDial *123*CODE# to pay.`);
}

async function handleCodeRedemption(session: Session, code: string, currentInput: string): Promise<string> {
  const paymentCode = await prisma.paymentCode.findUnique({ where: { code }, select: { id: true, code: true, amount: true, type: true, status: true, expiresAt: true, userId: true, provider: true } });
  if (!paymentCode) return ussdEnd("AMBER PAY\n─────────────────\nInvalid code.\nPlease check and try again.");
  if (new Date() > paymentCode.expiresAt) { await prisma.paymentCode.update({ where: { code }, data: { status: "expired" } }); return ussdEnd("AMBER PAY\n─────────────────\nCode expired.\nGenerate a new code on the app."); }
  if (paymentCode.status === "completed") return ussdEnd("AMBER PAY\n─────────────────\nThis code was already used.\nTransaction complete.");
  const phoneUser = await findUserByPhone(session.phoneNumber);
  if (!phoneUser || phoneUser.id !== paymentCode.userId) return ussdEnd("AMBER PAY\n─────────────────\nThis code belongs to another account.\nDial from your registered phone.");
  const provider = paymentCode.provider || "";
  if (paymentCode.status === "provider_selected" || paymentCode.status === "processing") {
    session.state = "enter_pin"; session.data.paymentCodeId = paymentCode.id; session.data.code = code; session.data.amount = paymentCode.amount; session.data.provider = provider;
    return ussdContinue(`AMBER PAY — ${paymentCode.type}\n─────────────────\nAmount: $${paymentCode.amount.toFixed(2)}\nProvider: ${formatProvider(provider)}\n\nEnter your ${formatProvider(provider)} PIN:`);
  }
  if (paymentCode.status === "pending") {
    session.state = "select_sim"; session.data.paymentCodeId = paymentCode.id; session.data.code = code; session.data.amount = paymentCode.amount;
    return ussdContinue(`AMBER PAY — ${paymentCode.type}\n─────────────────\nCode: ${code}\nAmount: $${paymentCode.amount.toFixed(2)}\n\nSelect SIM to pay with:\n1. SIM 1 (Orange Money)\n2. SIM 2 (Afrimoney)`);
  }
  return ussdEnd("Unknown code status. Try again.");
}

async function handleSimSelection(session: Session, input: string): Promise<string> {
  const provider = input === "1" ? "orange_money" : input === "2" ? "afrimoney" : null;
  if (!provider) return ussdContinue("Invalid selection.\n1. SIM 1 (Orange Money)\n2. SIM 2 (Afrimoney)");
  await prisma.paymentCode.update({ where: { id: session.data.paymentCodeId as string }, data: { provider, status: "provider_selected" } });
  session.data.provider = provider; session.state = "enter_pin";
  return ussdContinue(`AMBER PAY\n─────────────────\nAmount: $${(session.data.amount as number).toFixed(2)}\nProvider: ${formatProvider(provider)}\n\nEnter your ${formatProvider(provider)} PIN:`);
}

async function handlePinEntry(session: Session, pin: string): Promise<string> {
  if (!pin || pin.length < 4) return ussdContinue("Invalid PIN. Enter your 4-6 digit PIN:");
  await prisma.paymentCode.update({ where: { id: session.data.paymentCodeId as string }, data: { status: "processing" } });
  try {
    const paymentCode = await prisma.paymentCode.findUnique({ where: { id: session.data.paymentCodeId as string }, select: { userId: true, amount: true, type: true, code: true } });
    if (!paymentCode) return ussdEnd("AMBER PAY — Failed\n─────────────────\nPayment code not found.");
    const providerName = formatProvider(session.data.provider as string);
    if (paymentCode.type === "DEPOSIT") {
      const result = await creditWallet(prisma, paymentCode.userId, paymentCode.amount, { referenceId: paymentCode.code, referenceType: "payment_code", description: `Deposit via ${providerName} (code: ${paymentCode.code})` });
      await prisma.paymentCode.update({ where: { id: session.data.paymentCodeId as string }, data: { status: "completed", mobileRef: `MM_${Date.now().toString(36).toUpperCase()}`, completedAt: new Date() } });
      clearSession(session.phoneNumber);
      return ussdEnd(`AMBER PAY — Success\n─────────────────\n$${paymentCode.amount.toFixed(2)} credited!\nProvider: ${providerName}\nNew balance: $${result.balance.toFixed(2)}\n\nThank you for using AMBER PAY.`);
    }
    await prisma.paymentCode.update({ where: { id: session.data.paymentCodeId as string }, data: { status: "completed", mobileRef: `MM_${Date.now().toString(36).toUpperCase()}`, completedAt: new Date() } });
    clearSession(session.phoneNumber);
    return ussdEnd(`AMBER PAY — Success\n─────────────────\n$${paymentCode.amount.toFixed(2)} processed!\nProvider: ${providerName}\n\nThank you for using AMBER PAY.`);
  } catch (error) {
    console.error("[USSD] Transaction error:", error);
    await prisma.paymentCode.update({ where: { id: session.data.paymentCodeId as string }, data: { status: "failed", failedAt: new Date(), failureReason: (error as Error).message } });
    clearSession(session.phoneNumber);
    return ussdEnd("AMBER PAY — Failed\n─────────────────\nTransaction could not be completed.\nPlease try again later.\nNo money was deducted.");
  }
}

export async function processUssdRequest({ phoneNumber, text, sessionId, serviceCode }: { phoneNumber: string; text: string; sessionId: string; serviceCode: string }): Promise<string> {
  const session = getSession(phoneNumber);
  const inputParts = text ? text.split("*") : [];
  const currentInput = inputParts[inputParts.length - 1] || "";
  const codeFromInput = extractCode(inputParts);
  if (codeFromInput) return await handleCodeRedemption(session, codeFromInput, currentInput);
  if (!text || text === serviceCode) return await handleBalanceCheck(session);
  if (session.state === "select_sim") return await handleSimSelection(session, currentInput);
  if (session.state === "enter_pin") return await handlePinEntry(session, currentInput);
  return await handleBalanceCheck(session);
}
