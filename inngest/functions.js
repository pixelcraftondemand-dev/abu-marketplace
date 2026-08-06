import {inngest} from './client'
import prisma from '@/lib/prisma'
import { issueVerificationEmail } from '@/lib/services/verificationService'
import { getDataRetentionUntil } from '@/lib/retention'

// Prefer the user's primary email address; fall back to the first verified one,
// then any. Returns null when the account has no email addresses at all (e.g.
// a phone-only signup) so callers can decide how to proceed.
function primaryEmail(data) {
    const addresses = Array.isArray(data?.email_addresses) ? data.email_addresses : []
    const primaryId = data?.primary_email_address_id
    if (primaryId) {
        const found = addresses.find((a) => a.id === primaryId)
        if (found?.email_address) return found.email_address
    }
    const verified = addresses.find((a) => a.email_address && a.verification?.status === 'verified')
    if (verified?.email_address) return verified.email_address
    return addresses[0]?.email_address || null
}

// Inngest Function to save user data to a database and trigger the
// account verification email (user starts as unverified — emailVerified=false).
export const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-create'},
    {event: 'clerk/user.created'},
    async ({ event }) => {
        const {data} = event
        const email = primaryEmail(data)
        if (!email) {
            // No email on the account (phone-only signup): still create the row
            // so the user can sign in — email stays empty until an address is
            // added and the user.updated event arrives.
            console.warn('[Inngest syncUserCreation] no email on account; creating user without email', { userId: data.id })
        }
        await prisma.user.create({
            data: {
                id: data.id,
                email: email || '',
                name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
                image: data.image_url || '',
            }
        })

        // Best-effort: a failed email must never break account creation, and
        // the email failure is logged (never exposed) so it can be retried
        // via the resend endpoint.
        if (email) {
            try {
                await issueVerificationEmail(data.id)
            } catch (error) {
                console.error('[Inngest syncUserCreation] verification email failed:', error?.message || error)
            }
        }
    }
)

// Inngest Function to update user data in database 
export const syncUserUpdation = inngest.createFunction(
    {id: 'sync-user-update'},
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        const { data } = event
        const email = primaryEmail(data)
        await prisma.user.update({
            where: {id: data.id,},
            data: {
                ...(email ? { email } : {}),
                name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
                image: data.image_url || '',
            }
        })
    }
)

// Inngest Function for account closure — soft-delete (AML retention).
//
// Account records are NEVER hard-deleted. Anti-money-laundering / financial
// record-keeping rules require us to retain customer identification and
// transaction records (orders, payments, wallet history) so we can produce
// them to law enforcement upon lawful request. On account closure we mark the
// row deleted with a 5-year retention deadline instead; the related orders,
// payments, wallet transactions, addresses and ratings stay intact.
export const syncUserDeletion = inngest.createFunction(
    {id: 'sync-user-delete'},
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { data } = event
        const now = new Date()
        const dataRetentionUntil = getDataRetentionUntil(now)

        // updateMany keeps this idempotent and tolerant of a missing row
        // (e.g. a phone-only signup that never created a user record).
        await prisma.user.updateMany({
            where: { id: data.id },
            data: { deletedAt: now, dataRetentionUntil },
        })

        // A closed seller account's storefront must not stay publicly
        // visible, but the store/product records are still retained.
        await prisma.store.updateMany({
            where: { userId: data.id },
            data: { isActive: false },
        })
    }
)

// Inngest Function to delete coupon on expiry
export const deleteCouponOnExpiry = inngest.createFunction(
    {id: 'delete-coupon-on-expiry'},
    { event: 'app/coupon.expired' },
    async ({ event, step }) => {
        const { data } = event
        const expiryDate = new Date(data.expires_at)
        await step.sleepUntil('wait-for-expiry', expiryDate)

        await step.run('delete-coupon-from-database', async () => {
            await prisma.coupon.delete({
                where: { code: data.code }
            })
        })
    }
)