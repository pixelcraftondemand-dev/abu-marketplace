import { supabaseAdmin } from './supabase.ts';
import { sendStoreSubmitted, sendStoreApproved, sendStoreRejected, type MailResult } from './mailer.ts';
import type { VendorStore } from '../src/types/index.ts';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface SubmissionRow {
  id: string;
  owner_id: string | null;
  owner_email: string;
  owner_name: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  location_hub: string | null;
  province: string | null;
  street_address: string | null;
  phone: string;
  payout_provider: string | null;
  payout_phone: string | null;
  logo: string | null;
  status: SubmissionStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_store_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionInput {
  name?: string;
  tagline?: string;
  description?: string;
  locationHub?: string;
  province?: string;
  streetAddress?: string;
  phone?: string;
  payoutProvider?: string;
  payoutPhone?: string;
  logo?: string;
}

export interface Actor {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}

/** Admin access: a role of `admin` in profiles, or an address listed in ADMIN_EMAILS. */
export function isAdmin(actor: Actor | null): boolean {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  const allowList = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return !!actor.email && allowList.includes(actor.email.toLowerCase());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'store';
}

/** Rejects free-form strings that are obviously unusable, keeping the payload small. */
function clean(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export class SubmissionError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Creates a pending submission and emails the merchant a receipt. The store does
 * not exist yet — it only becomes visible once an admin approves it.
 */
export async function createSubmission(
  input: SubmissionInput,
  owner: Actor,
): Promise<{ submission: SubmissionRow; mail: MailResult }> {
  const name = clean(input.name, 120);
  const phone = clean(input.phone, 40);

  if (!name) throw new SubmissionError('Store name is required', 400, 'MISSING_NAME');
  if (!phone) throw new SubmissionError('A contact phone number is required', 400, 'MISSING_PHONE');
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) {
    throw new SubmissionError('That phone number does not look valid', 400, 'INVALID_PHONE');
  }

  const ownerEmail = owner.email?.trim();
  if (!ownerEmail) {
    throw new SubmissionError('Your account has no email address, so we cannot send a decision', 400, 'NO_OWNER_EMAIL');
  }

  // One open application per store name per owner keeps the queue readable.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('store_submissions')
    .select('id, name, status')
    .eq('owner_id', owner.id)
    .eq('status', 'pending');

  if (existingError) {
    throw new SubmissionError(`Could not check existing applications: ${existingError.message}`, 500, 'DB_ERROR');
  }
  const duplicate = (existing || []).find(
    (row) => row.name.toLowerCase() === name.toLowerCase(),
  );
  if (duplicate) {
    throw new SubmissionError(
      `You already have a pending application for "${name}". Please wait for a decision.`,
      409,
      'ALREADY_PENDING',
    );
  }

  const slug = slugify(name);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('store_submissions')
    .insert({
      owner_id: owner.id,
      owner_email: ownerEmail,
      owner_name: clean(owner.name, 120),
      name,
      slug,
      tagline: clean(input.tagline, 160),
      description: clean(input.description, 2000),
      location_hub: clean(input.locationHub, 120),
      province: clean(input.province, 80),
      street_address: clean(input.streetAddress, 240),
      phone,
      payout_provider: clean(input.payoutProvider, 40),
      payout_phone: clean(input.payoutPhone, 40) || phone,
      logo: clean(input.logo, 400),
      status: 'pending',
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new SubmissionError(`Could not save your application: ${error?.message || 'unknown error'}`, 500, 'DB_ERROR');
  }

  const submission = data as SubmissionRow;
  const mail = await sendStoreSubmitted({
    to: ownerEmail,
    ownerName: submission.owner_name,
    storeName: submission.name,
    storeId: submission.id,
  });

  return { submission, mail };
}

export async function listSubmissions(status?: SubmissionStatus): Promise<SubmissionRow[]> {
  let query = supabaseAdmin.from('store_submissions').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new SubmissionError(`Could not load submissions: ${error.message}`, 500, 'DB_ERROR');
  return (data || []) as SubmissionRow[];
}

async function loadPending(id: string): Promise<SubmissionRow> {
  const { data, error } = await supabaseAdmin.from('store_submissions').select('*').eq('id', id).maybeSingle();
  if (error) throw new SubmissionError(`Could not load the application: ${error.message}`, 500, 'DB_ERROR');
  if (!data) throw new SubmissionError('Application not found', 404, 'NOT_FOUND');
  const row = data as SubmissionRow;
  if (row.status !== 'pending') {
    throw new SubmissionError(`This application was already ${row.status}`, 409, 'ALREADY_REVIEWED');
  }
  return row;
}

/** Approves a pending submission, making the store visible, and emails the merchant. */
export async function approveSubmission(
  id: string,
  reviewer: Actor,
  note?: string,
): Promise<{ submission: SubmissionRow; mail: MailResult }> {
  const row = await loadPending(id);
  const storeId = `store-${row.id.slice(0, 8)}`;
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('store_submissions')
    .update({
      status: 'approved',
      created_store_id: storeId,
      review_note: clean(note, 1000),
      reviewed_by: reviewer.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error || !data) {
    throw new SubmissionError(`Could not approve the application: ${error?.message || 'unknown error'}`, 500, 'DB_ERROR');
  }

  const submission = data as SubmissionRow;
  const mail = await sendStoreApproved({
    to: submission.owner_email,
    ownerName: submission.owner_name,
    storeName: submission.name,
    storeId,
  });

  return { submission, mail };
}

/** Rejects a pending submission with a required reason and emails the merchant. */
export async function rejectSubmission(
  id: string,
  reviewer: Actor,
  note: string,
): Promise<{ submission: SubmissionRow; mail: MailResult }> {
  const reason = clean(note, 1000);
  if (!reason) {
    throw new SubmissionError('A reason is required so the merchant knows what to fix', 400, 'MISSING_REASON');
  }

  const row = await loadPending(id);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('store_submissions')
    .update({
      status: 'rejected',
      review_note: reason,
      reviewed_by: reviewer.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error || !data) {
    throw new SubmissionError(`Could not reject the application: ${error?.message || 'unknown error'}`, 500, 'DB_ERROR');
  }

  const submission = data as SubmissionRow;
  const mail = await sendStoreRejected({
    to: submission.owner_email,
    ownerName: submission.owner_name,
    storeName: submission.name,
    storeId: row.id,
    note: reason,
  });

  return { submission, mail };
}

/** Maps an approved submission onto the storefront shape the client expects. */
export function submissionToStore(row: SubmissionRow): VendorStore {
  return {
    id: row.created_store_id || `store-${row.id.slice(0, 8)}`,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline || 'Verified Sierra Leone Merchant Store',
    description: row.description || 'Authorized storefront on Abu Marketplace.',
    locationHub: row.location_hub || 'Freetown Central',
    province: (row.province as VendorStore['province']) || 'Western Area',
    streetAddress: row.street_address || 'Freetown',
    phone: row.phone,
    payoutProvider: (row.payout_provider as VendorStore['payoutProvider']) || 'orange',
    payoutPhone: row.payout_phone || row.phone,
    isVerified: true,
    rating: 5.0,
    reviewsCount: 1,
    totalSales: 0,
    establishedYear: new Date(row.created_at).getFullYear(),
    logo: row.logo || '/src/assets/images/flagship_smartphone_device_1791485459581.jpg',
    productCount: 0,
  };
}

/** Every approved submission, newest first — these are live stores. */
export async function approvedStores(): Promise<VendorStore[]> {
  const { data, error } = await supabaseAdmin
    .from('store_submissions')
    .select('*')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false });
  if (error) {
    console.error('[stores] could not load approved submissions:', error.message);
    return [];
  }
  return (data || []).map((row) => submissionToStore(row as SubmissionRow));
}
