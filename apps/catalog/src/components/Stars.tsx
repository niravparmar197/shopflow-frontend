import { Star } from 'lucide-react';

/** Read-only stars: 4.3 → four full, one partly filled. */
export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? 'cat:size-6' : size === 'md' ? 'cat:size-5' : 'cat:size-3.5';
  return (
    <span className="cat:inline-flex cat:items-center cat:gap-0.5" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className={`cat:relative cat:inline-block ${px}`} aria-hidden>
            <Star className={`cat:absolute cat:inset-0 ${px} cat:text-line`} fill="currentColor" strokeWidth={0} />
            <span className="cat:absolute cat:inset-0 cat:overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${px} cat:text-warning`} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** "★ 4.3 (12)" for cards; nothing when there are no reviews. */
export function RatingLine({ avg, count }: { avg?: number; count?: number }) {
  if (!count) return null;
  return (
    <span className="cat:inline-flex cat:items-center cat:gap-1.5 cat:text-xs cat:text-muted">
      <Stars value={avg ?? 0} />
      <span>
        <span className="cat:font-semibold cat:text-ink">{(avg ?? 0).toFixed(1)}</span> ({count})
      </span>
    </span>
  );
}
