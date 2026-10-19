import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { tokenFromHash } from './password';

/**
 * Reads the one-time token from the email link (#token=...) once, then
 * removes it from the address bar, so it is not left in the history or
 * copied along with the URL.
 */
export function useLinkToken(): string | null {
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => tokenFromHash(hash));

  useEffect(() => {
    if (hash) navigate(pathname, { replace: true });
  }, [hash, pathname, navigate]);

  return token;
}
