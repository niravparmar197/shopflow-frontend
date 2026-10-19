import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Footer } from './Footer';
import { Header } from './Header';
import { Toaster } from './Toaster';

/** The tab title for each top-level page (the shell owns the routes). */
function titleFor(pathname: string): string {
  if (pathname === '/') return 'ShopFlow';
  if (pathname === '/products') return 'Products';
  if (pathname.startsWith('/products/')) return 'Product';
  if (pathname === '/cart') return 'Your cart';
  if (pathname.startsWith('/checkout')) return 'Checkout';
  if (pathname.startsWith('/admin')) return 'Admin';
  if (/^\/orders\/[^/]+\/pay\/?$/.test(pathname)) return 'Payment';
  if (/^\/orders\/[^/]+\/?$/.test(pathname)) return 'Order tracking';
  if (pathname.startsWith('/orders')) return 'My orders';
  if (pathname === '/login') return 'Log in';
  if (pathname === '/signup') return 'Sign up';
  return 'Page not found';
}

/**
 * A client-side page change is silent for screen readers. So on each new path:
 * set the tab title, and move focus to <main> (it is read out, and Tab goes on
 * from the top of the new page, not from the link that was clicked). Only the
 * path counts: a filter or search change (?q=...) stays where you are.
 */
function usePageChange() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const title = titleFor(pathname);
    document.title = title === 'ShopFlow' ? title : `${title} · ShopFlow`;
    if (first.current) {
      first.current = false; // the first load: the browser handles focus
      return;
    }
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return main;
}

export function Layout() {
  const main = usePageChange();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main" ref={main} tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
