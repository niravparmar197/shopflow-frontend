import { Route, Routes, useNavigate } from 'react-router';
import { routes } from '@shopflow/shared';
import { Button, NotFound } from '@shopflow/ui';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductListPage } from './pages/ProductListPage';
import './remote.css';

export interface CatalogAppProps {
  /** Which shell route renders us: "/" (home) or "/products/*" */
  section?: 'home' | 'products';
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
  return (
    <Routes>
      <Route index element={<ProductListPage />} />
      <Route path=":slug" element={<ProductDetailPage />} />
      <Route path="*" element={<Missing />} />
    </Routes>
  );
}
