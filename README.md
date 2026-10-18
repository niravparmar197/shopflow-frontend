# ShopFlow Web

The web shop for the **[ShopFlow microservices](https://github.com/niravparmar197/shopflow)**, built as **micro frontends**: a shell and 3 remotes (catalog, cart, checkout), joined **at runtime** with Module Federation. Each remote owns one business area, like the backend services.

**Stack:** React 19 · TypeScript (strict) · Vite 8 · Module Federation 2 (`@module-federation/vite`) · React Router 7 · TanStack Query 5 · Tailwind CSS 4 · Vitest · Playwright

> **Status:** F0–F6 done: sign up → browse → cart → place order → pay → track. Next: F7 (polish) and F8 (deploy on Stage 1).

```mermaid
flowchart LR
  B[Browser] --> E[One origin<br/>Vite proxy in dev / Caddy in prod]
  E -->|/| S[shell host<br/>header, login, routing]
  E -->|/mfe/catalog| C[catalog remote]
  E -->|/mfe/cart| CA[cart remote]
  E -->|/mfe/checkout| CH[checkout remote]
  E -->|/v1/*| G[ShopFlow gateway]
  S -. loads at runtime .-> C & CA & CH
  G --> P[product] & O[order] & PAY[payment] & U[user]
```

## Features

| Area | What the user can do |
|---|---|
| Account | Sign up, log in, log out. The session survives a reload (refresh cookie). Guests are sent to login and back. |
| Catalog | Search, filter by category and price (kept in the URL), "Load more", product detail with specifications |
| Cart | Header badge with the live count, change quantity, remove, apply / remove a coupon, totals |
| Checkout | Review and place the order (safe against double clicks), clear messages for price changed, sold out, busy |
| Payment | Countdown to pay; fake provider in dev (Pay / Decline), Razorpay with real keys; waits for the real result |
| Orders | My orders (newest first, "Load more") and a live tracking timeline |
| Resilience | If one part (e.g. the cart) is down, the rest of the page keeps working |

## Apps and packages

| Path | Type | What it owns | Dev port |
|---|---|---|---|
| `apps/shell` | host | Layout, header, login/signup, routing, toasts; loads the remotes | 5000 |
| `apps/catalog` | remote | Home, product list, product detail, "Add to cart" | 5001 |
| `apps/cart` | remote | Cart page + `CartBadge` widget (shown in the shell header) | 5002 |
| `apps/checkout` | remote | Checkout, payment, my orders, order tracking | 5003 |
| `packages/api` | library | Typed gateway client: token in memory, refresh single flight, `ApiError` | — |
| `packages/ui` | library | Design system: tokens (`theme.css`), Button, Input, Card, Price, StatusPill… | — |
| `packages/shared` | library | Events between apps, `useSession`, routes | — |

## Getting started

### 1. Run the backend first
Follow **[Run the whole stack locally](https://github.com/niravparmar197/shopflow#run-the-whole-stack-locally-powershell)** in the backend README. You need:
- the gateway on **http://localhost:3000**;
- `FAKE_WEBHOOK_SECRET` set in the payment service's `.env`;
- products seeded **and given stock** (`npm run seed:product`, then `.\scripts\seed-stock.ps1`). Without stock, every order is cancelled as `OUT_OF_STOCK`.

### 2. Run the web app
Needs Node **22.12+**.

```powershell
npm install
npm run dev        # starts all 4 apps → open http://localhost:5000
```

The shell's dev server sends `/v1/*` to the gateway, so the browser sees one origin.

Gateway on another URL:
```powershell
$env:SHOPFLOW_API="http://localhost:3000"; npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the 4 apps (ports 5000–5003) |
| `npm run build` | Builds the 4 apps, then assembles `dist-web/` in the production layout |
| `npm start` | Serves `dist-web/` on http://localhost:8080 like production (proxies `/v1`) |
| `npm run typecheck` | TypeScript strict, every app and package |
| `npm run lint` | ESLint + the CSS prefix check |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | Playwright on the production build (desktop + mobile, mocked gateway) |
| `npm run format` | Prettier |

## How it works

**1. Runtime remotes.** The shell has no remote URLs at build time. At startup it reads `/mfe-manifest.json`:

```json
{ "catalog": "/mfe/catalog/remoteEntry.js", "cart": "/mfe/cart/remoteEntry.js", "checkout": "/mfe/checkout/remoteEntry.js" }
```

It then registers the remotes with the Module Federation runtime (`apps/shell/src/federation/remotes.ts`). To release one remote, deploy it and change its line in the manifest. To roll back, change the line back. The shell is not rebuilt.

**2. Shared singletons** (`federation.config.ts`). The page loads exactly one copy of each of these:
`react`, `react-dom`, `react-router`, `@tanstack/react-query`, `@shopflow/api`, `@shopflow/shared`.
Two copies of React break hooks, and two copies of `@shopflow/api` would mean two logins.

**3. Failure isolation.** Every remote renders inside `RemoteComponent`: Suspense + an error boundary + "Try again". If the cart remote is down, the cart page shows "The cart is not available right now". The rest of the page keeps working, and the header's cart icon becomes a plain link.

**4. Apps talk by events, not imports** (`packages/shared/src/events.ts`). For example, the catalog adds to the cart, then emits `cart-changed` with `source: 'catalog'`; the cart badge hears it and reloads. A remote ignores its own events, so nothing loads twice. ESLint blocks importing another app's code.

**5. CSS isolation.** Each remote ships its own Tailwind CSS with a **prefix**: `cat:`, `cart:` or `chk:`. Without it, a remote's `.flex-col` (loaded later) would override the shell's `sm:flex-row`. Shared components from `@shopflow/ui` use the shell's unprefixed classes. `npm run lint` fails on a missing prefix.

**6. Auth.** The access token stays in memory only, never in localStorage. The refresh token is the backend's httpOnly cookie (`SameSite=strict`, `path=/v1/auth`), which is why the web app and the API share **one origin**.
On a 401, the client refreshes once (single flight: 10 parallel 401s → 1 refresh, because refresh tokens rotate), then retries the call.

**7. Checkout and payment.**
- **Place order:** `POST /v1/orders` with an `Idempotency-Key` (one per attempt, reused on retry) and `expectedTotalPaise` (the total the user saw). A double click returns the same order; a price change is refused, not charged.
- **Payment row:** it is created when the order is confirmed (stock reserved). The payment page retries for a while, or shows why the order was cancelled.
- **Result:** the browser never decides that a payment worked. The backend webhook does, and the page polls until the status is final.

**8. Eventual consistency, shown honestly.** My orders and tracking come from the order service's read model (CQRS), a few seconds behind. A new order shows "Updating…" until it catches up. The order's items come from the write model, which is always current.

## Pages and API calls

| Route | App | Gateway calls |
|---|---|---|
| `/login`, `/signup` | shell | `POST /v1/auth/login`, `/signup`, `/refresh`, `/logout`, `GET /v1/users/me` |
| `/`, `/products` | catalog | `GET /v1/products?q&category&minPrice&maxPrice&cursor&limit` |
| `/products/:slug` | catalog | `GET /v1/products/:idOrSlug`, `POST /v1/cart/items` |
| `/cart` + header badge | cart | `GET /v1/cart`, `PATCH`/`DELETE /v1/cart/items/:id`, `POST`/`DELETE /v1/cart/coupon` |
| `/checkout` | checkout | `GET /v1/cart`, `POST /v1/orders` (Idempotency-Key) |
| `/orders/:id/pay` | checkout | `POST /v1/payments/:id/checkout`, `GET /v1/payments/:id`, dev: `POST /v1/payments/dev/fake-pay/:id` |
| `/orders` | checkout | `GET /v1/orders?cursor&limit` |
| `/orders/:id` | checkout | `GET /v1/orders/:id/tracking`, `GET /v1/orders/:id` |

All money is in **paise** (integers) and is formatted only at display time (`formatPaise`: 2499900 → ₹24,999).

## Project structure

```
shopflow-frontend/
├── apps/
│   ├── shell/       # host: src/App.tsx (routes), federation/, layout/, pages/
│   ├── catalog/     # remote: pages/, components/, filters.ts, useAddToCart.ts
│   ├── cart/        # remote: CartPage.tsx, CartBadge.tsx, useCart.ts
│   └── checkout/    # remote: CheckoutPage, PaymentPage, OrdersPage, OrderTrackingPage
├── packages/
│   ├── api/         # client.ts, auth.ts, endpoints.ts, types.ts, errors.ts
│   ├── ui/          # theme.css, components.tsx, format.ts
│   └── shared/      # events.ts, hooks.ts, routes.ts
├── e2e/             # Playwright tests (mocked gateway)
├── scripts/         # assemble, serve, size budget, CSS prefix check
├── federation.config.ts   # shared singletons + dev ports
└── .github/workflows/ci.yml
```

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| Pay page: `404 PAYMENT_NOT_FOUND`, or "This order was cancelled: Out of stock" | The product has no stock. Run `.\scripts\seed-stock.ps1` in the backend, then place a new order. |
| Pay fails with "FAKE_WEBHOOK_SECRET is not set" | Set it in the backend's `apps/payment/.env` and restart the payment service. |
| Logged out after every reload | The web app and `/v1` are not on one origin. Open the app on http://localhost:5000, not on a remote's port. |
| "Too many requests" | The gateway allows 100 requests/min per IP and 5 logins/min. Wait a minute, or raise `RATE_LIMIT_GLOBAL_PER_MIN` in the gateway's `.env` for local work. |
| A part of the page says "not available right now" | That remote's dev server is not running. `npm run dev` starts all 4. |
| `Port 5000 is in use` | Close the other app on that port; the dev ports are set in `federation.config.ts`. |

## Build and deploy

`npm run build` creates `dist-web/` with the same layout production serves:

```
dist-web/
├── index.html, assets/, mfe-manifest.json   # shell
└── mfe/catalog/, mfe/cart/, mfe/checkout/   # remotes (remoteEntry.js + assets/)
```

Cache rules (in `scripts/serve.mjs`; nginx later):
- **Hashed files** (`assets/*`) are cached for 1 year (`immutable`).
- **`index.html`, `remoteEntry.js` and the manifests** are `no-cache`, so a browser never mixes an old entry with new chunks.

CI (`.github/workflows/ci.yml`) runs on every PR: typecheck, lint, unit tests, build, bundle size budget, Playwright e2e and `npm audit`.

## Roadmap

- [x] **F0** Foundation: workspaces, packages, shell + 3 remotes, runtime manifest, CI, tests
- [x] **F1** Sign up, log in, log out, session restore, route guard
- [x] **F2** Browse products: grid, search, filters, load more, detail, add to cart
- [x] **F3** Cart: badge with count, cart page, qty, remove, coupon
- [x] **F4** Place order: Idempotency-Key, PRICE_CHANGED / SOLD_OUT / SERVER_BUSY
- [x] **F5** Pay: fake provider (dev), Razorpay adapter, wait for the payment row
- [x] **F6** My orders + live tracking timeline
- [ ] **F7** Polish: a11y pass, more e2e
- [ ] **F8** Deploy on Stage 1: Docker (nginx), Caddy route, ECR, release workflow

## License

UNLICENSED — private project.
