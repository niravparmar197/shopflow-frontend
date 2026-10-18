import { Route, Routes } from 'react-router';
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
export default function CatalogApp({ section = 'products' }: CatalogAppProps) {
  if (section === 'home') return <ProductListPage showHero />;
  return (
    <Routes>
      <Route index element={<ProductListPage />} />
      <Route path=":slug" element={<ProductDetailPage />} />
    </Routes>
  );
}
