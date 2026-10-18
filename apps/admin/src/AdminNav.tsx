import { NavLink } from 'react-router';
import { Package, Receipt, TicketPercent } from 'lucide-react';
import { routes } from '@shopflow/shared';
import { cx } from '@shopflow/ui';

const tabs = [
  { to: routes.adminProducts, label: 'Products', icon: Package },
  { to: routes.adminOrders, label: 'Orders', icon: Receipt },
  { to: routes.adminCoupons, label: 'Coupons', icon: TicketPercent },
];

/** Tabs at the top of every admin page. NavLink sets aria-current="page". */
export function AdminNav() {
  return (
    <nav aria-label="Admin" className="adm:border-b adm:border-line">
      <ul className="adm:flex adm:gap-1 adm:overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cx(
                  'adm:-mb-px adm:flex adm:items-center adm:gap-2 adm:border-b-2 adm:px-4 adm:py-3 adm:text-sm adm:font-semibold',
                  isActive
                    ? 'adm:border-primary adm:text-primary'
                    : 'adm:border-transparent adm:text-ink-soft adm:hover:text-ink',
                )
              }
            >
              <Icon className="adm:size-4" aria-hidden /> {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
