import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ChevronDown, LayoutDashboard, LogOut, Receipt, Search, ShoppingBag, User } from 'lucide-react';
import { logout } from '@shopflow/api';
import { routes, toast, useSession } from '@shopflow/shared';
import { Button, cx } from '@shopflow/ui';
import { RemoteComponent } from '../federation/RemoteComponent';

function Logo() {
  return (
    <Link to={routes.home} className="flex shrink-0 items-center gap-2 rounded-lg" aria-label="ShopFlow home">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-white">
        <ShoppingBag className="size-4.5" aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">ShopFlow</span>
    </Link>
  );
}

function SearchBox({ className }: { className?: string }) {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const current = pathname === '/' || pathname === routes.products ? (params.get('q') ?? '') : '';
  // key: a new search in the URL (back button, a link) resets the box
  return <SearchForm key={current} initial={current} className={className} />;
}

function SearchForm({ initial, className }: { initial: string; className?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `${routes.products}?q=${encodeURIComponent(term)}` : routes.products);
  };

  return (
    <form role="search" onSubmit={submit} className={cx('relative w-full', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search phones, headphones, books..."
        aria-label="Search products"
        className="h-10 w-full rounded-lg border border-line bg-canvas pr-3 pl-10 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
      />
    </form>
  );
}

/** The cart icon. The count comes from the cart remote; if it is down, a plain link remains. */
function CartButton() {
  const plain = (
    <Link to={routes.cart} aria-label="Cart" className="relative grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-primary-soft">
      <ShoppingBag className="size-5.5" aria-hidden />
    </Link>
  );
  return <RemoteComponent remote="cart" module="./CartBadge" label="Cart" fallback={plain} loading={plain} />;
}

function UserMenu() {
  const { status, user } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // A disclosure (button + list of links), not an ARIA menu: role="menu" would
  // promise arrow-key navigation. Escape closes and returns focus to the button.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (status === 'unknown') return <div className="h-10 w-20" aria-hidden />;

  if (status === 'anonymous' || !user) {
    if (pathname === '/login' || pathname === routes.signup) return null; // already there
    return (
      <Button size="sm" onClick={() => navigate(routes.login())}>
        Log in
      </Button>
    );
  }

  const name = user.fullName ?? user.email.split('@')[0];
  const onLogout = async () => {
    setOpen(false);
    await logout().catch(() => undefined);
    toast({ kind: 'info', message: 'You are logged out' });
    navigate(routes.home);
  };

  return (
    <div
      className="relative"
      ref={ref}
      onBlur={(e) => {
        // Tabbing out of the open panel closes it.
        if (open && !e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`Account menu for ${name}`}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink hover:bg-primary-soft"
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
          <User className="size-4" aria-hidden />
        </span>
        <span className="hidden max-w-32 truncate lg:inline">{name}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open && (
        <div id="account-menu" className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-surface py-1.5 shadow-lg">
          <div className="border-b border-line px-4 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link to={routes.orders} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-soft hover:bg-canvas">
            <Receipt className="size-4" aria-hidden /> My orders
          </Link>
          {user.role === 'admin' && (
            <Link to={routes.admin} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-soft hover:bg-canvas">
              <LayoutDashboard className="size-4" aria-hidden /> Admin panel
            </Link>
          )}
          <button type="button" onClick={onLogout} className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-sm text-danger hover:bg-danger-soft">
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

/** "Admin" in the top bar, for admins only (the admin pages check again). */
function AdminLink() {
  const { user } = useSession();
  if (user?.role !== 'admin') return null;
  return (
    <NavLink
      to={routes.admin}
      className={({ isActive }) =>
        cx('hidden rounded-lg px-3 py-2 text-sm font-semibold hover:bg-primary-soft hover:text-ink sm:block', isActive ? 'bg-primary-soft text-primary' : 'text-ink-soft')
      }
    >
      Admin
    </NavLink>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Logo />
        <SearchBox className="mx-auto hidden max-w-md md:block" />
        <nav className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0" aria-label="Main">
          <NavLink
            to={routes.orders}
            className={({ isActive }) =>
              cx('hidden rounded-lg px-3 py-2 text-sm font-semibold hover:bg-primary-soft hover:text-ink sm:block', isActive ? 'bg-primary-soft text-primary' : 'text-ink-soft')
            }
          >
            Orders
          </NavLink>
          <AdminLink />
          <CartButton />
          <UserMenu />
        </nav>
      </div>
      <div className="border-t border-line px-4 py-2 md:hidden">
        <SearchBox />
      </div>
    </header>
  );
}
