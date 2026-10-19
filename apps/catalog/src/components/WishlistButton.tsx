import { Heart } from 'lucide-react';

/** The heart. `overlay` sits on a card photo; `full` is a labelled button. */
export function WishlistButton({
  saved,
  onToggle,
  name,
  variant = 'overlay',
}: {
  saved: boolean;
  onToggle: () => void;
  name: string;
  variant?: 'overlay' | 'full';
}) {
  const label = saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`;
  const icon = <Heart className={variant === 'full' ? 'cat:size-5' : 'cat:size-4.5'} fill={saved ? 'currentColor' : 'none'} aria-hidden />;

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={saved}
        aria-label={label}
        className={`cat:inline-flex cat:h-12 cat:cursor-pointer cat:items-center cat:gap-2 cat:rounded-lg cat:border cat:px-4 cat:text-sm cat:font-semibold cat:transition-colors ${
          saved ? 'cat:border-danger/40 cat:bg-danger-soft cat:text-danger' : 'cat:border-line cat:bg-surface cat:text-ink cat:hover:bg-canvas'
        }`}
      >
        {icon}
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={label}
      className={`cat:absolute cat:top-2 cat:right-2 cat:z-10 cat:grid cat:size-9 cat:cursor-pointer cat:place-items-center cat:rounded-full cat:bg-surface/90 cat:shadow-sm cat:backdrop-blur cat:transition-colors cat:hover:bg-surface ${
        saved ? 'cat:text-danger' : 'cat:text-ink-soft cat:hover:text-danger'
      }`}
    >
      {icon}
    </button>
  );
}
