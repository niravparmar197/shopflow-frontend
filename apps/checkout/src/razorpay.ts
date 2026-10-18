import type { CheckoutSession } from '@shopflow/api';

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', cb: (response: { error?: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

/** Loads Razorpay's checkout.js once, only when someone pays with Razorpay. */
function loadScript(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error('Could not load Razorpay. Check your connection.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Opens Razorpay's popup. "Paid" in the browser is NOT the final answer:
 * the backend confirms by webhook, and the page polls the payment status.
 */
export async function openRazorpay(
  session: CheckoutSession,
  callbacks: { onPaid: () => void; onClosed: () => void; onFailed: (reason: string) => void },
) {
  await loadScript();
  if (!window.Razorpay || !session.publicKey) throw new Error('Razorpay is not available');
  const rzp = new window.Razorpay({
    key: session.publicKey,
    order_id: session.providerOrderId,
    amount: session.amountPaise,
    currency: session.currency,
    name: 'ShopFlow',
    description: 'Order payment',
    theme: { color: '#4f46e5' },
    handler: callbacks.onPaid,
    modal: { ondismiss: callbacks.onClosed },
  });
  rzp.on('payment.failed', (r) => callbacks.onFailed(r.error?.description ?? 'Payment failed'));
  rzp.open();
}
