import { isSupabaseConfigured, supabaseAdmin } from './supabase.ts';
import {
  sendStoreSubmitted,
  sendStoreApproved,
  sendStoreRejected,
  sendListingSubmitted,
  sendListingApproved,
  sendListingRejected,
  type MailResult,
} from './mailer.ts';
import type { VendorStore, Product, BlueCollarService } from '../src/types/index.ts';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
/** Store applications, single-item listings and artisan registrations share one queue. */
export type SubmissionKind = 'store' | 'product' | 'service';

export interface SubmissionRow {
  id: string;
  kind: SubmissionKind;
  /** The normalised Product/BlueCollarService saved for a listing submission. */
  payload: Product | BlueCollarService | null;
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

/** A row on its way into the queue; review columns are filled in by the decision. */
export type SubmissionInsert = Omit<
  SubmissionRow,
  'id' | 'review_note' | 'reviewed_by' | 'reviewed_at' | 'created_store_id'
> & { id?: string };

/** The columns an admin decision writes. */
export interface SubmissionDecision {
  status: 'approved' | 'rejected';
  review_note: string | null;
  reviewed_by: string;
  reviewed_at: string;
  updated_at: string;
  created_store_id?: string | null;
}

/**
 * The persistence side of the queue, narrowed to the operations the lifecycle needs.
 * Production uses Supabase; tests pass an in-memory implementation so a submission can
 * be followed from pending to public without touching a live database.
 */
export interface SubmissionStore {
  insert(row: SubmissionInsert): Promise<{ data: SubmissionRow | null; error: string | null }>;
  find(id: string): Promise<{ data: SubmissionRow | null; error: string | null }>;
  listPendingForOwner(
    ownerId: string,
  ): Promise<{ data: Array<Pick<SubmissionRow, 'id' | 'name' | 'status'>> | null; error: string | null }>;
  list(status?: SubmissionStatus): Promise<{ data: SubmissionRow[] | null; error: string | null }>;
  /** Flips a row only while it is still pending; null means another review won the race. */
  decide(id: string, decision: SubmissionDecision): Promise<{ data: SubmissionRow | null; error: string | null }>;
  /** Approved rows of one kind, newest decision first. */
  listApproved(kind: SubmissionKind): Promise<{ data: SubmissionRow[] | null; error: string | null }>;
}

/** Mail operations used by the lifecycle, injectable so tests never send real email. */
export interface SubmissionMailer {
  storeSubmitted: typeof sendStoreSubmitted;
  storeApproved: typeof sendStoreApproved;
  storeRejected: typeof sendStoreRejected;
  listingSubmitted: typeof sendListingSubmitted;
  listingApproved: typeof sendListingApproved;
  listingRejected: typeof sendListingRejected;
}

/** Optional collaborators; production omits this and gets Supabase plus the real mailer. */
export interface SubmissionSeams {
  store?: SubmissionStore;
  mailer?: SubmissionMailer;
}

const supabaseStore: SubmissionStore = {
  async insert(row) {
    const { data, error } = await supabaseAdmin
      .from('store_submissions')
      .insert(row as Record<string, unknown>)
      .select('*')
      .single();
    return { data: (data as SubmissionRow | null) ?? null, error: error?.message ?? null };
  },

  async find(id) {
    const { data, error } = await supabaseAdmin
      .from('store_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data: (data as SubmissionRow | null) ?? null, error: error?.message ?? null };
  },

  async listPendingForOwner(ownerId) {
    const { data, error } = await supabaseAdmin
      .from('store_submissions')
      .select('id, name, status')
      .eq('owner_id', ownerId)
      .eq('status', 'pending');
    return {
      data: (data as Array<Pick<SubmissionRow, 'id' | 'name' | 'status'>> | null) ?? null,
      error: error?.message ?? null,
    };
  },

  async list(status) {
    let query = supabaseAdmin
      .from('store_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    return { data: (data as SubmissionRow[] | null) ?? null, error: error?.message ?? null };
  },

  async decide(id, decision) {
    const { data, error } = await supabaseAdmin
      .from('store_submissions')
      .update(decision)
      .eq('id', id)
      .eq('status', 'pending')
      .select('*')
      .single();
    return { data: (data as SubmissionRow | null) ?? null, error: error?.message ?? null };
  },

  async listApproved(kind) {
    const { data, error } = await supabaseAdmin
      .from('store_submissions')
      .select('*')
      .eq('kind', kind)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false });
    return { data: (data as SubmissionRow[] | null) ?? null, error: error?.message ?? null };
  },
};

const defaultMailer: SubmissionMailer = {
  storeSubmitted: sendStoreSubmitted,
  storeApproved: sendStoreApproved,
  storeRejected: sendStoreRejected,
  listingSubmitted: sendListingSubmitted,
  listingApproved: sendListingApproved,
  listingRejected: sendListingRejected,
};

const storeFor = (seams?: SubmissionSeams): SubmissionStore => seams?.store ?? supabaseStore;
const mailerFor = (seams?: SubmissionSeams): SubmissionMailer => seams?.mailer ?? defaultMailer;

/**
 * The site owner's address is always an admin. `ADMIN_EMAILS` would cover this too, but
 * the deployment does not carry that variable yet and the profile row that could hold
 * the role only exists after a first signed-in load, which left the dashboard
 * unreachable. Extra operators can still be added through `ADMIN_EMAILS`.
 */
const OWNER_ADMIN_EMAILS = ['fouadbabasiekamara@gmail.com'];

/** Admin access: an `admin` role, an owner address, or an address listed in ADMIN_EMAILS. */
export function isAdmin(actor: Actor | null): boolean {
  if (!actor) return false;
  if (actor.role === 'admin') return true;
  // ADMIN_EMAIL (singular) is the name older deployments carried; keep both working so
  // an allow-listed operator is not locked out by the spelling of one variable.
  const allowList = [
    ...OWNER_ADMIN_EMAILS,
    ...(process.env.ADMIN_EMAILS || '').split(','),
    ...(process.env.ADMIN_EMAIL || '').split(','),
  ]
    .map((value) => value.trim().toLowerCase())
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
 * Submits a single-item listing or an artisan registration for review. The item is
 * normalised by the caller and stored whole in `payload`, so approval only has to flip
 * the status; the catalog reads approved payloads back on every request.
 */
export async function createListingSubmission(
  kind: 'product' | 'service',
  item: Product | BlueCollarService,
  owner: Actor,
  seams?: SubmissionSeams,
): Promise<{ submission: SubmissionRow; mail: MailResult }> {
  const ownerEmail = owner.email?.trim();
  if (!ownerEmail) {
    throw new SubmissionError('Your account has no email address, so we cannot record the submission', 400, 'NO_OWNER_EMAIL');
  }

  const name = clean(item.title, 120);
  if (!name) throw new SubmissionError('A title is required', 400, 'MISSING_NAME');
  const phone = clean('phone' in item ? item.phone : '', 40) || 'N/A';
  const image = clean('image' in item ? item.image : item.avatar, 400);
  const logo = image;
  const now = new Date().toISOString();

  const { data, error } = await storeFor(seams).insert({
    kind,
    payload: item,
    owner_id: owner.id,
    owner_email: ownerEmail,
    owner_name: clean(owner.name, 120),
    name,
    slug: slugify(name),
    tagline: kind === 'product' ? (item as Product).category : (item as BlueCollarService).tradeCategory,
    description: clean(item.description, 2000),
    location_hub: clean('locationHub' in item ? item.locationHub : (item as Product).sellerLocation, 120),
    province: null,
    street_address: null,
    phone,
    payout_provider: null,
    payout_phone: null,
    logo,
    status: 'pending',
    created_at: now,
    updated_at: now,
  });

  if (error || !data) {
    throw new SubmissionError(`Could not save the listing: ${error || 'unknown error'}`, 500, 'DB_ERROR');
  }

  const submission = data;
  const mail = await mailerFor(seams).listingSubmitted({
    to: ownerEmail,
    ownerName: submission.owner_name,
    itemName: submission.name,
    kind,
  });

  return { submission, mail };
}

/**
 * Creates a pending submission and emails the merchant a receipt. The store does
 * not exist yet — it only becomes visible once an admin approves it.
 */
export async function createSubmission(
  input: SubmissionInput,
  owner: Actor | null,
  seams?: SubmissionSeams,
): Promise<{ submission: SubmissionRow; mail: MailResult }> {
  // The queue belongs to an account, so a submission without one can never be reviewed.
  if (!owner?.id) {
    throw new SubmissionError('Please sign in to apply for a store', 401, 'UNAUTHENTICATED');
  }
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
  const { data: existing, error: existingError } = await storeFor(seams).listPendingForOwner(owner.id);

  if (existingError) {
    throw new SubmissionError(`Could not check existing applications: ${existingError}`, 500, 'DB_ERROR');
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

  const { data, error } = await storeFor(seams).insert({
    kind: 'store',
    payload: null,
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
  });

  if (error || !data) {
    throw new SubmissionError(`Could not save your application: ${error || 'unknown error'}`, 500, 'DB_ERROR');
  }

  const submission = data;
  const mail = await mailerFor(seams).storeSubmitted({
    to: ownerEmail,
    ownerName: submission.owner_name,
    storeName: submission.name,
    storeId: submission.id,
  });

  return { submission, mail };
}

export async function listSubmissions(status?: SubmissionStatus, seams?: SubmissionSeams): Promise<SubmissionRow[]> {
  const { data, error } = await storeFor(seams).list(status);
  if (error) throw new SubmissionError(`Could not load submissions: ${error}`, 500, 'DB_ERROR');
  return data || [];
}

async function loadPending(id: string, seams?: SubmissionSeams): Promise<SubmissionRow> {
  const { data, error } = await storeFor(seams).find(id);
  if (error) throw new SubmissionError(`Could not load the application: ${error}`, 500, 'DB_ERROR');
  if (!data) throw new SubmissionError('Application not found', 404, 'NOT_FOUND');
  if (data.status !== 'pending') {
    throw new SubmissionError(`This application was already ${data.status}`, 409, 'ALREADY_REVIEWED');
  }
  return data;
}

/**
 * A decision writes only while the row is still pending, so it can lose to a reviewer
 * working at the same time. Re-read on failure: the losing reviewer should be told the
 * application is already reviewed (409), not shown a database error (500).
 */
async function conflictedDecision(id: string, seams?: SubmissionSeams): Promise<SubmissionError | null> {
  const { data } = await storeFor(seams).find(id);
  return data && data.status !== 'pending'
    ? new SubmissionError(`This application was already ${data.status}`, 409, 'ALREADY_REVIEWED')
    : null;
}

/** Approves a pending submission, making the store visible, and emails the merchant. */
export async function approveSubmission(
  id: string,
  reviewer: Actor,
  note?: string,
  seams?: SubmissionSeams,
): Promise<{ submission: SubmissionRow; mail: MailResult }> {
  const row = await loadPending(id, seams);
  const storeId = row.kind === 'store'
    ? `store-${row.id.slice(0, 8)}`
    : (row.payload && 'id' in row.payload ? String(row.payload.id) : `listing-${row.id.slice(0, 8)}`);
  const now = new Date().toISOString();

  const { data, error } = await storeFor(seams).decide(id, {
    status: 'approved',
    created_store_id: storeId,
    review_note: clean(note, 1000),
    reviewed_by: reviewer.id,
    reviewed_at: now,
    updated_at: now,
  });

  if (error || !data) {
    const conflict = await conflictedDecision(id, seams);
    if (conflict) throw conflict;
    throw new SubmissionError(`Could not approve the application: ${error || 'unknown error'}`, 500, 'DB_ERROR');
  }

  const submission = data;
  // The decision changes what the public catalog should show immediately.
  invalidateApprovedCache(submission.kind);
  const mail: MailResult = submission.kind === 'store'
    ? await mailerFor(seams).storeApproved({
        to: submission.owner_email,
        ownerName: submission.owner_name,
        storeName: submission.name,
        storeId,
      })
    : await mailerFor(seams).listingApproved({
        to: submission.owner_email,
        ownerName: submission.owner_name,
        itemName: submission.name,
        kind: submission.kind,
      });

  return { submission, mail };
}

/** Rejects a pending submission with a required reason and emails the merchant. */
export async function rejectSubmission(
  id: string,
  reviewer: Actor,
  note: string,
  seams?: SubmissionSeams,
): Promise<{ submission: SubmissionRow; mail: MailResult }> {
  const reason = clean(note, 1000);
  if (!reason) {
    throw new SubmissionError('A reason is required so the merchant knows what to fix', 400, 'MISSING_REASON');
  }

  const row = await loadPending(id, seams);
  const now = new Date().toISOString();

  const { data, error } = await storeFor(seams).decide(id, {
    status: 'rejected',
    review_note: reason,
    reviewed_by: reviewer.id,
    reviewed_at: now,
    updated_at: now,
  });

  if (error || !data) {
    const conflict = await conflictedDecision(id, seams);
    if (conflict) throw conflict;
    throw new SubmissionError(`Could not reject the application: ${error || 'unknown error'}`, 500, 'DB_ERROR');
  }

  const submission = data;
  const mail: MailResult = submission.kind === 'store'
    ? await mailerFor(seams).storeRejected({
        to: submission.owner_email,
        ownerName: submission.owner_name,
        storeName: submission.name,
        storeId: row.id,
        note: reason,
      })
    : await mailerFor(seams).listingRejected({
        to: submission.owner_email,
        ownerName: submission.owner_name,
        itemName: submission.name,
        kind: submission.kind,
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

/**
 * The public catalog reads approved rows on every request. The first query in a fresh
 * process pays a TLS handshake to Supabase (several seconds), so results are cached
 * briefly and cleared whenever an admin decision changes what is live. Listings change
 * rarely and are the expensive read; stores are approval-critical and should surface
 * quickly on every server instance.
 */
const LISTING_CACHE_TTL_MS = 5 * 60_000;
const STORE_CACHE_TTL_MS = 30_000;
const approvedCache = new Map<string, { at: number; data: unknown[] }>();

function cached<T>(key: string): T[] | null {
  const entry = approvedCache.get(key);
  if (!entry) return null;
  const ttl = key === 'stores' ? STORE_CACHE_TTL_MS : LISTING_CACHE_TTL_MS;
  if (Date.now() - entry.at > ttl) {
    approvedCache.delete(key);
    return null;
  }
  return entry.data as T[];
}

/** Drops cached catalog data, optionally only the kind an approval touched. */
export function invalidateApprovedCache(kind?: 'store' | 'product' | 'service'): void {
  if (!kind) {
    approvedCache.clear();
    return;
  }
  approvedCache.delete(kind === 'store' ? 'stores' : `listings:${kind}`);
}

/** Warms the catalog cache at boot so the first shopper request is not the slow one. */
export async function warmApprovedCache(seams?: SubmissionSeams): Promise<void> {
  if (!seams?.store && !isSupabaseConfigured()) return;
  await Promise.all([
    approvedStores(seams),
    approvedListings('product', seams),
    approvedListings('service', seams),
  ]).catch(() => {});
}

/** Every approved listing of one kind, newest first — these are live catalog items. */
export async function approvedListings<T extends Product | BlueCollarService>(
  kind: 'product' | 'service',
  seams?: SubmissionSeams,
): Promise<T[]> {
  if (!seams?.store && !isSupabaseConfigured()) return [];

  const key = `listings:${kind}`;
  const hit = cached<T>(key);
  if (hit) return hit;

  try {
    const { data, error } = await storeFor(seams).listApproved(kind);
    if (error) {
      console.error(`[listings] could not load approved ${kind}s:`, error);
      return [];
    }
    const list = (data || [])
      .map((row) => row.payload as T | null)
      .filter((payload): payload is T => Boolean(payload && typeof payload === 'object'));
    approvedCache.set(key, { at: Date.now(), data: list });
    return list;
  } catch (error) {
    console.error(`[listings] could not load approved ${kind}s:`, error);
    return [];
  }
}

/** Every approved submission, newest first — these are live stores. */
export async function approvedStores(seams?: SubmissionSeams): Promise<VendorStore[]> {
  if (!seams?.store && !isSupabaseConfigured()) return [];

  const hit = cached<VendorStore>('stores');
  if (hit) return hit;

  try {
    const { data, error } = await storeFor(seams).listApproved('store');
    if (error) {
      console.error('[stores] could not load approved submissions:', error);
      return [];
    }
    const list = (data || []).map((row) => submissionToStore(row));
    approvedCache.set('stores', { at: Date.now(), data: list });
    return list;
  } catch (error) {
    console.error('[stores] could not load approved submissions:', error);
    return [];
  }
}
