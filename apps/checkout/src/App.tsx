import { Route, Routes } from 'react-router';
import { CheckoutPage } from './CheckoutPage';
import { OrdersPage } from './OrdersPage';
import { OrderTrackingPage } from './OrderTrackingPage';
import { PaymentPage } from './PaymentPage';
import './remote.css';

interface CheckoutAppProps {
  /** Which shell route renders us: "/checkout/*" or "/orders/*" */
  section?: 'checkout' | 'orders';
}

/**
 * Exposed as checkout/App.
 *   /checkout             → review + place order
 *   /orders               → my orders
 *   /orders/:orderId      → tracking
 *   /orders/:orderId/pay  → payment
 */
export default function CheckoutApp({ section = 'orders' }: CheckoutAppProps) {
  if (section === 'checkout') return <CheckoutPage />;
  return (
    <Routes>
      <Route index element={<OrdersPage />} />
      <Route path=":orderId" element={<OrderTrackingPage />} />
      <Route path=":orderId/pay" element={<PaymentPage />} />
    </Routes>
  );
}
