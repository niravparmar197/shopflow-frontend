import { Link } from 'react-router';
import { LEGAL_LINKS } from '../pages/legal/LegalPage';

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted sm:px-6">
        <nav aria-label="Policies and help">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-ink-soft hover:text-primary hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ShopFlow. A demo shop built on microservices.</p>
          <p>Prices in INR (₹), including GST.</p>
        </div>
      </div>
    </footer>
  );
}
