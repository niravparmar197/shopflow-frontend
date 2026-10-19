import { Clock, Mail, MapPin, Phone, Receipt, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { routes } from '@shopflow/shared';
import { Card, Container } from '@shopflow/ui';
import { BUSINESS } from './content';
import { PolicyNav } from './LegalPage';

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="text-ink">{children}</div>
      </div>
    </div>
  );
}

/** /contact: how to reach the shop, plus the grievance officer Indian e-commerce rules ask for. */
export function ContactPage() {
  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="order-last lg:order-first">
        <div className="lg:sticky lg:top-24">
          <PolicyNav current={routes.contact} />
        </div>
      </aside>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Contact us</h1>
        <p className="mt-2 text-muted">We usually reply within one working day.</p>

        <Card className="mt-6 grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Row icon={<Mail className="size-4" aria-hidden />} label="Email">
            <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-primary hover:underline">
              {BUSINESS.email}
            </a>
          </Row>
          <Row icon={<Phone className="size-4" aria-hidden />} label="Phone">
            {BUSINESS.phone}
          </Row>
          <Row icon={<Clock className="size-4" aria-hidden />} label="Hours">
            {BUSINESS.hours}
          </Row>
          <Row icon={<MapPin className="size-4" aria-hidden />} label="Address">
            {BUSINESS.name}
            <br />
            {BUSINESS.address}
          </Row>
        </Card>

        <h2 className="mt-8 text-lg font-semibold text-ink">About an order?</h2>
        <p className="mt-2 text-ink-soft">
          Most things you can do yourself under{' '}
          <Link to={routes.orders} className="font-semibold text-primary hover:underline">
            My orders
          </Link>
          : track a parcel, cancel before it ships, or download the GST invoice. If you write to us, please add your order number (for
          example #9B5F1DB1).
        </p>

        <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold text-ink">
          <ShieldCheck className="size-5 text-primary" aria-hidden /> Grievance officer
        </h2>
        <p className="mt-2 text-ink-soft">
          Under the Consumer Protection (E-Commerce) Rules, 2020, you can raise a complaint with our {BUSINESS.grievanceOfficer}, by email
          at {BUSINESS.email}. We acknowledge it within 48 hours and resolve it within one month.
        </p>

        <p className="mt-8 flex items-center gap-2 text-sm text-muted">
          <Receipt className="size-4" aria-hidden /> GSTIN {BUSINESS.gstin} · ShopFlow is a demo shop: these details are examples.
        </p>
      </div>
    </Container>
  );
}
