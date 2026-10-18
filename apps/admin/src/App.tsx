import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { routes } from '@shopflow/shared';
import { Button, Container, NotFound } from '@shopflow/ui';
import { AdminNav } from './AdminNav';
import { CouponsPage } from './coupons/CouponsPage';
import { OrderPage } from './orders/OrderPage';
import { OrdersPage } from './orders/OrdersPage';
import { ProductEditPage } from './products/ProductEditPage';
import { ProductsPage } from './products/ProductsPage';
import './remote.css';

function Missing() {
  const navigate = useNavigate();
  return <NotFound action={<Button onClick={() => navigate(routes.admin)}>Admin home</Button>} />;
}

/**
 * Exposed as admin/App, mounted by the shell at /admin/* for admins only
 * (the shell checks the role; every API call is checked again by the services).
 *   /admin                 → products
 *   /admin/products        → product list (+ stock per row)
 *   /admin/products/new    → new product
 *   /admin/products/:id    → edit, images, stock, flash sale
 *   /admin/orders          → every customer's orders
 *   /admin/orders/:id      → one order
 *   /admin/coupons         → coupons
 */
export default function AdminApp() {
  return (
    <Container className="adm:pb-12">
      <AdminNav />
      <Routes>
        <Route index element={<Navigate to={routes.adminProducts} replace />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductEditPage />} />
        <Route path="products/:id" element={<ProductEditPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="*" element={<Missing />} />
      </Routes>
    </Container>
  );
}
