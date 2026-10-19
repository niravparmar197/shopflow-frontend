import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { isApiError, restoreSession } from '@shopflow/api';
import { RemoteComponent } from './federation/RemoteComponent';
import { initRemotes } from './federation/remotes';
import { Layout } from './layout/Layout';
import { AccountPage } from './pages/AccountPage';
import { ContactPage } from './pages/legal/ContactPage';
import { LegalPage } from './pages/legal/LegalPage';
import { LEGAL_DOCS } from './pages/legal/content';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { RequireAuth } from './pages/RequireAuth';

/*
 * ONE QueryClient for the whole page. @tanstack/react-query is a shared
 * singleton, so the remotes rendered below use this same client (and cache).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry network and 5xx errors once; a 4xx will not change on retry.
      retry: (failures, err) => failures < 1 && !(isApiError(err) && err.status >= 400 && err.status < 500),
    },
    mutations: { retry: false },
  },
});

export function App() {
  useEffect(() => {
    void restoreSession(); // new access token from the refresh cookie, if any
    void initRemotes().catch(() => undefined); // start fetching the manifest early
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Each remote renders its own sub-routes; `section` says which top-level path it is under. */}
            {/* catalog remote: home, product list, product detail */}
            <Route path="/" element={<RemoteComponent remote="catalog" module="./App" label="The catalog" props={{ section: 'home' }} />} />
            <Route path="/products/*" element={<RemoteComponent remote="catalog" module="./App" label="The catalog" props={{ section: 'products' }} />} />

            {/* cart remote */}
            <Route
              path="/cart"
              element={
                <RequireAuth>
                  <RemoteComponent remote="cart" module="./CartPage" label="The cart" />
                </RequireAuth>
              }
            />

            {/* checkout remote: place order, pay, my orders, tracking */}
            <Route
              path="/checkout/*"
              element={
                <RequireAuth>
                  <RemoteComponent remote="checkout" module="./App" label="Checkout" props={{ section: 'checkout' }} />
                </RequireAuth>
              }
            />
            <Route
              path="/orders/*"
              element={
                <RequireAuth>
                  <RemoteComponent remote="checkout" module="./App" label="Your orders" props={{ section: 'orders' }} />
                </RequireAuth>
              }
            />

            {/* admin remote: products, stock, flash sales, coupons, all orders (admins only) */}
            <Route
              path="/admin/*"
              element={
                <RequireAuth role="admin">
                  <RemoteComponent remote="admin" module="./App" label="The admin panel" />
                </RequireAuth>
              }
            />

            {/* shell's own pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            {LEGAL_DOCS.map((d) => (
              <Route key={d.slug} path={`/${d.slug}`} element={<LegalPage slug={d.slug} />} />
            ))}
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
