import { Route, Routes, useNavigate } from 'react-router';
import { routes } from '@shopflow/shared';
import { Button, NotFound } from '@shopflow/ui';
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
/** An unknown sub-route (e.g. /orders/x/y). */
function Missing() {
  const navigate = useNavigate();
  return <NotFound action={<Button onClick={() => navigate(routes.orders)}>My orders</Button>} />;
}

export default function CheckoutApp({ section = 'orders' }: CheckoutAppProps) {
  if (section === 'checkout') return <CheckoutPage />;
  return (
    <Routes>
      <Route index element={<OrdersPage />} />
      <Route path=":orderId" element={<OrderTrackingPage />} />
      <Route path=":orderId/pay" element={<PaymentPage />} />
      <Route path="*" element={<Missing />} />
    </Routes>
  );
}
