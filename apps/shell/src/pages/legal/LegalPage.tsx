import { Link } from 'react-router';
import { Container, NotFound } from '@shopflow/ui';
import { routes } from '@shopflow/shared';
import { BUSINESS, LEGAL_DOCS, UPDATED, type LegalSection } from './content';

/** Links to every policy page (footer and the side of each page). */
export const LEGAL_LINKS = [
  ...LEGAL_DOCS.map((d) => ({ to: `/${d.slug}`, label: d.title })),
  { to: routes.contact, label: 'Contact us' },
];

function Section({ section }: { section: LegalSection }) {
  // Consecutive "- " lines become one bullet list.
  const blocks: (string | string[])[] = [];
  for (const line of section.body) {
    if (line.startsWith('- ')) {
      const last = blocks.at(-1);
      if (Array.isArray(last)) last.push(line.slice(2));
      else blocks.push([line.slice(2)]);
    } else blocks.push(line);
  }
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>
      {blocks.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i} className="mt-2 list-disc space-y-1.5 pl-5 text-ink-soft">
            {b.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="mt-2 text-ink-soft">
            {b}
          </p>
        ),
      )}
    </section>
  );
}

export function PolicyNav({ current }: { current: string }) {
  return (
    <nav aria-label="Policies" className="text-sm">
      <p className="mb-2 font-semibold text-ink">Policies</p>
      <ul className="flex flex-col gap-1">
        {LEGAL_LINKS.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              aria-current={l.to === current ? 'page' : undefined}
              className="block rounded-md px-2 py-1.5 text-ink-soft hover:bg-primary-soft hover:text-ink aria-[current=page]:bg-primary-soft aria-[current=page]:font-semibold aria-[current=page]:text-primary"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One policy page: /privacy, /terms, /refund-policy, /shipping-policy. */
export function LegalPage({ slug }: { slug: string }) {
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);
  if (!doc) return <NotFound />;
  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="order-last lg:order-first">
        <div className="lg:sticky lg:top-24">
          <PolicyNav current={`/${doc.slug}`} />
        </div>
      </aside>
      <article className="max-w-3xl leading-relaxed">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{doc.title}</h1>
        <p className="mt-2 text-muted">{doc.summary}</p>
        <p className="mt-1 text-xs text-muted">Last updated {UPDATED}</p>
        <p className="mt-5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-ink-soft">
          ShopFlow is a demo shop. These policies show what a real Indian online shop needs; the business details are examples.
        </p>
        {doc.sections.map((s) => (
          <Section key={s.heading} section={s} />
        ))}
        <p className="mt-10 border-t border-line pt-4 text-sm text-muted">
          Questions? Write to{' '}
          <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-primary hover:underline">
            {BUSINESS.email}
          </a>{' '}
          or see{' '}
          <Link to={routes.contact} className="font-semibold text-primary hover:underline">
            Contact us
          </Link>
          .
        </p>
      </article>
    </Container>
  );
}
