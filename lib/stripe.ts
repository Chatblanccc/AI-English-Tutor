import 'server-only';
import Stripe from 'stripe';

let stripeSingleton: InstanceType<typeof Stripe> | null = null;

/**
 * Lazy Stripe client so `next build` / prerender does not require STRIPE_SECRET_KEY.
 * Call only from request handlers (or code that runs at runtime with env set).
 */
export function getStripe(): InstanceType<typeof Stripe> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2026-03-25.dahlia',
    }) as InstanceType<typeof Stripe>;
  }
  return stripeSingleton;
}

/** Map a Stripe Price ID to the internal plan name. */
export function planFromPriceId(priceId: string): 'plus' | 'pro' | null {
  if (priceId === process.env.STRIPE_PLUS_PRICE_ID) return 'plus';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  return null;
}
