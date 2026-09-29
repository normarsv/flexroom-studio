import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const API_VERSION = '2026-05-27.dahlia' as const

async function isLiveMode(): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('studio_settings')
    .select('stripe_live_mode')
    .eq('id', 1)
    .single()
  return data?.stripe_live_mode ?? false
}

export async function getStripe(): Promise<Stripe> {
  const live = await isLiveMode()
  const key = live
    ? process.env.STRIPE_SECRET_KEY_LIVE!
    : process.env.STRIPE_SECRET_KEY_TEST!
  return new Stripe(key, { apiVersion: API_VERSION })
}

export async function getWebhookSecret(): Promise<string> {
  const live = await isLiveMode()
  return live
    ? process.env.STRIPE_WEBHOOK_SECRET_LIVE!
    : process.env.STRIPE_WEBHOOK_SECRET_TEST!
}
