import { Route, Routes, useNavigate } from 'react-router';
import { routes } from '@shopflow/shared';
import { Button, NotFound } from '@shopflow/ui';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { DealsPage } from './pages/DealsPage';
import { ProductListPage } from './pages/ProductListPage';
import { WishlistPage } from './pages/WishlistPage';
import './remote.css';

export interface CatalogAppProps {
  /** Which shell route renders us: "/" (home), "/products/*", "/wishlist" or "/deals" */
  section?: 'home' | 'products' | 'wishlist' | 'deals';
}

/**
 * Exposed as catalog/App. Its routes are relative to where the shell mounts it:
 *   /             → home (hero + products)
 *   /products     → product list (search + filters in the URL)
 *   /products/:slug → product detail
 */
/** An unknown sub-route (e.g. /products/a/b). */
function Missing() {
  const navigate = useNavigate();
  return <NotFound action={<Button onClick={() => navigate(routes.products)}>Browse products</Button>} />;
}

export default function CatalogApp({ section = 'products' }: CatalogAppProps) {
  if (section === 'home') return <ProductListPage showHero />;
  if (section === 'wishlist') return <WishlistPage />;
  if (section === 'deals') return <DealsPage />;
  return (
    <Routes>
      <Route index element={<ProductListPage />} />
      <Route path=":slug" element={<ProductDetailPage />} />
      <Route path="*" element={<Missing />} />
    </Routes>
  );
}
