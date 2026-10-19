import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { BadgeCheck, MessageSquareText, Star } from 'lucide-react';
import { describeError, isApiError, reviewsApi, type Review, type ReviewSummary } from '@shopflow/api';
import { routes, toast, useSession } from '@shopflow/shared';
import { Alert, Button, Skeleton, formatDate } from '@shopflow/ui';
import { Stars } from './Stars';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** The big average + a bar per star. */
function Summary({ summary }: { summary: ReviewSummary }) {
  return (
    <div className="cat:flex cat:flex-col cat:gap-5 cat:sm:flex-row cat:sm:items-center cat:sm:gap-8">
      <div className="cat:flex cat:flex-col cat:items-start cat:gap-1">
        <p className="cat:text-4xl cat:font-bold cat:text-ink">{summary.ratingAvg.toFixed(1)}</p>
        <Stars value={summary.ratingAvg} size="md" />
        <p className="cat:text-sm cat:text-muted">
          {summary.ratingCount} {summary.ratingCount === 1 ? 'review' : 'reviews'}
        </p>
      </div>
      <ul className="cat:flex cat:w-full cat:max-w-sm cat:flex-col cat:gap-1.5" aria-label="Reviews by stars">
        {([5, 4, 3, 2, 1] as const).map((n) => {
          const count = summary.stars[n] ?? 0;
          const pct = summary.ratingCount ? (count / summary.ratingCount) * 100 : 0;
          return (
            <li key={n} className="cat:flex cat:items-center cat:gap-2 cat:text-xs cat:text-muted">
              <span className="cat:w-10 cat:shrink-0">{n} star</span>
              <span className="cat:h-2 cat:flex-1 cat:overflow-hidden cat:rounded-full cat:bg-line-soft" aria-hidden>
                <span className="cat:block cat:h-full cat:rounded-full cat:bg-warning" style={{ width: `${pct}%` }} />
              </span>
              <span className="cat:w-6 cat:shrink-0 cat:text-right">{count}</span>
              <span className="cat:sr-only">
                {count} reviews with {n} stars
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewItem({ review, mine }: { review: Review; mine: boolean }) {
  return (
    <li className="cat:flex cat:flex-col cat:gap-1.5 cat:py-5">
      <div className="cat:flex cat:flex-wrap cat:items-center cat:gap-x-3 cat:gap-y-1">
        <Stars value={review.rating} />
        {review.title && <p className="cat:font-semibold cat:text-ink">{review.title}</p>}
      </div>
      <p className="cat:leading-relaxed cat:whitespace-pre-line cat:text-ink-soft">{review.body}</p>
      <p className="cat:flex cat:flex-wrap cat:items-center cat:gap-x-2 cat:text-xs cat:text-muted">
        <span className="cat:font-semibold cat:text-ink-soft">{review.authorName}</span>
        {mine && <span className="cat:rounded-full cat:bg-primary-soft cat:px-2 cat:py-0.5 cat:font-semibold cat:text-primary">You</span>}
        <span className="cat:inline-flex cat:items-center cat:gap-1 cat:text-success">
          <BadgeCheck className="cat:size-3.5" aria-hidden /> Verified purchase
        </span>
        <span>· {formatDate(review.createdAt)}</span>
      </p>
    </li>
  );
}

/** Pick 1–5 stars: a radio group, so arrow keys work. */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="cat:mb-1 cat:text-sm cat:font-medium cat:text-ink">Your rating</legend>
      <div className="cat:flex cat:items-center cat:gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cat:cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="cat:peer cat:sr-only"
            />
            <span className="cat:sr-only">
              {n} {n === 1 ? 'star' : 'stars'}: {LABELS[n]}
            </span>
            <Star
              className={`cat:size-7 cat:rounded cat:peer-focus-visible:outline-2 cat:peer-focus-visible:outline-primary ${n <= shown ? 'cat:text-warning' : 'cat:text-line'}`}
              fill="currentColor"
              strokeWidth={0}
              aria-hidden
            />
          </label>
        ))}
        <span className="cat:ml-2 cat:text-sm cat:text-muted" aria-hidden>
          {LABELS[shown]}
        </span>
      </div>
    </fieldset>
  );
}

function ReviewForm({ productId, existing, onDone }: { productId: string; existing: Review | null; onDone: () => void }) {
  const { user } = useSession();
  const client = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['catalog', 'reviews', productId] });
    void client.invalidateQueries({ queryKey: ['catalog', 'product'] }); // the average on the page
  };
  const save = useMutation({
    mutationFn: () =>
      reviewsApi.write(productId, {
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
        // "Asha Patel" → "Asha P."
        authorName: shortName(user?.fullName ?? user?.email.split('@')[0] ?? 'Customer'),
      }),
    onSuccess: () => {
      toast({ kind: 'success', message: existing ? 'Your review was updated' : 'Thank you for your review!' });
      refresh();
      onDone();
    },
    onError: (err) => setError(describeError(err).message),
  });
  const remove = useMutation({
    mutationFn: () => reviewsApi.remove(productId),
    onSuccess: () => {
      toast({ kind: 'info', message: 'Your review was deleted' });
      refresh();
      onDone();
    },
    onError: (err) => setError(describeError(err).message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!rating) return setError('Please choose 1 to 5 stars');
    if (body.trim().length < 10) return setError('Please write at least 10 characters');
    save.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="cat:flex cat:flex-col cat:gap-4 cat:rounded-card cat:border cat:border-line cat:bg-surface cat:p-4 cat:sm:p-5">
      <h3 className="cat:font-semibold cat:text-ink">{existing ? 'Edit your review' : 'Write a review'}</h3>
      {error && <Alert kind="error" title={error} />}
      <StarPicker value={rating} onChange={setRating} />
      <label className="cat:flex cat:flex-col cat:gap-1.5 cat:text-sm cat:font-medium cat:text-ink">
        Title (optional)
        <input
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          className="cat:h-11 cat:rounded-lg cat:border cat:border-line cat:bg-surface cat:px-3 cat:font-normal cat:outline-none cat:focus:border-primary cat:focus:ring-2 cat:focus:ring-primary/20"
        />
      </label>
      <label className="cat:flex cat:flex-col cat:gap-1.5 cat:text-sm cat:font-medium cat:text-ink">
        Your review
        <textarea
          value={body}
          maxLength={2000}
          rows={4}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you like or not like? How do you use it?"
          className="cat:rounded-lg cat:border cat:border-line cat:bg-surface cat:px-3 cat:py-2 cat:font-normal cat:outline-none cat:focus:border-primary cat:focus:ring-2 cat:focus:ring-primary/20"
        />
        <span className="cat:text-xs cat:font-normal cat:text-muted">At least 10 characters. Shown with your first name.</span>
      </label>
      <div className="cat:flex cat:flex-wrap cat:gap-2">
        <Button type="submit" loading={save.isPending}>
          {existing ? 'Save changes' : 'Post review'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {existing && (
          <Button variant="danger" className="cat:ml-auto" loading={remove.isPending} onClick={() => remove.mutate()}>
            Delete review
          </Button>
        )}
      </div>
    </form>
  );
}

/** "Asha Patel" → "Asha P." (2–40 characters, as the API wants) */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? 'Customer';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const name = last ? `${first} ${last.charAt(0)}.` : first;
  return (name.length < 2 ? `${name}.` : name).slice(0, 40);
}

/** The reviews block on the product page (Phase 2 P5). */
export function Reviews({ productId }: { productId: string }) {
  const { status, user } = useSession();
  const location = useLocation();
  const [writing, setWriting] = useState(false);

  const list = useInfiniteQuery({
    queryKey: ['catalog', 'reviews', productId, 'list'],
    queryFn: ({ pageParam, signal }) => reviewsApi.list(productId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const mine = useQuery({
    queryKey: ['catalog', 'reviews', productId, 'mine', user?.id],
    queryFn: async ({ signal }) => {
      try {
        return await reviewsApi.mine(productId, signal);
      } catch (err) {
        if (isApiError(err) && err.code === 'REVIEW_NOT_FOUND') return null;
        throw err;
      }
    },
    enabled: status === 'authenticated',
  });

  const summary = list.data?.pages[0]?.summary;
  const reviews = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section aria-labelledby="reviews-title" id="reviews" className="cat:mt-12 cat:scroll-mt-24 cat:border-t cat:border-line cat:pt-8">
      <div className="cat:mb-6 cat:flex cat:flex-wrap cat:items-center cat:justify-between cat:gap-3">
        <h2 id="reviews-title" className="cat:text-xl cat:font-bold cat:text-ink">
          Ratings and reviews
        </h2>
        {!writing &&
          (status === 'authenticated' ? (
            mine.isSuccess && (
              <Button variant="secondary" onClick={() => setWriting(true)}>
                {mine.data ? 'Edit your review' : 'Write a review'}
              </Button>
            )
          ) : (
            <Link to={routes.login(location.pathname)} className="cat:text-sm cat:font-semibold cat:text-primary cat:hover:underline">
              Log in to write a review
            </Link>
          ))}
      </div>

      {writing && (
        <div className="cat:mb-6">
          <ReviewForm productId={productId} existing={mine.data ?? null} onDone={() => setWriting(false)} />
          <p className="cat:mt-2 cat:text-xs cat:text-muted">Only customers who received this product can review it.</p>
        </div>
      )}

      {list.isPending ? (
        <div className="cat:flex cat:flex-col cat:gap-3" aria-hidden>
          <Skeleton className="cat:h-20 cat:w-64" />
          <Skeleton className="cat:h-16 cat:w-full" />
        </div>
      ) : list.isError ? (
        <Alert kind="warning" title="Reviews can't be loaded right now" />
      ) : !summary || summary.ratingCount === 0 ? (
        <div className="cat:flex cat:items-center cat:gap-3 cat:rounded-card cat:border cat:border-dashed cat:border-line cat:p-5 cat:text-sm cat:text-muted">
          <MessageSquareText className="cat:size-5 cat:shrink-0 cat:text-primary" aria-hidden />
          No reviews yet. Bought it? Tell others what you think.
        </div>
      ) : (
        <>
          <Summary summary={summary} />
          <ul className="cat:mt-4 cat:divide-y cat:divide-line">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} mine={mine.data?.id === r.id} />
            ))}
          </ul>
          {list.hasNextPage && (
            <Button variant="secondary" onClick={() => void list.fetchNextPage()} loading={list.isFetchingNextPage}>
              More reviews
            </Button>
          )}
        </>
      )}
    </section>
  );
}
