const STEPS = ['Cart', 'Review', 'Payment'];

/** Cart → Review → Payment, with `current` highlighted (0, 1 or 2). */
export function Steps({ current }: { current: number }) {
  return (
    <ol className="chk:flex chk:items-center chk:gap-2 chk:py-6 chk:text-sm" aria-label="Checkout steps">
      {STEPS.map((step, i) => (
        <li key={step} aria-current={i === current ? 'step' : undefined} className="chk:flex chk:items-center chk:gap-2">
          <span
            aria-hidden
            className={`chk:grid chk:size-7 chk:place-items-center chk:rounded-full chk:text-xs chk:font-bold ${
              i <= current ? 'chk:bg-primary chk:text-white' : 'chk:bg-line-soft chk:text-ink-soft'
            }`}
          >
            {i + 1}
          </span>
          <span className={i === current ? 'chk:font-semibold chk:text-ink' : 'chk:text-muted'}>
            {step}
            {i < current && <span className="chk:sr-only"> (done)</span>}
          </span>
          {i < STEPS.length - 1 && <span className="chk:mx-1 chk:h-px chk:w-8 chk:bg-line" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
