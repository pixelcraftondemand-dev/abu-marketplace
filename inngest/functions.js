import {inngest} from './client'
import prisma from '@/lib/prisma'
import { issueVerificationEmail } from '@/lib/services/verificationService'

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

// Inngest Function to delete user from database
export const syncUserDeletion = inngest.createFunction(
    {id: 'sync-user-delete'},
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        const { data } = event
        await prisma.user.delete({
            where: {id: data.id,}
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