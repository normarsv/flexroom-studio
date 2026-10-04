import Stripe from 'stripe'

const API_VERSION = '2026-05-27.dahlia' as const

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY_LIVE!, { apiVersion: API_VERSION })
}

export function getWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET_LIVE!
}
