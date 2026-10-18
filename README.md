# ShopFlow Web: micro frontends

The web shop for the [ShopFlow microservices](https://github.com/niravparmar197/shopflow).
It has **4 apps joined at runtime with Module Federation** (React 19 + Vite 8), and one app per business area, like the backend.

```
Browser ──► Caddy (one origin) ──►  /            shell (host)
                                    /mfe/catalog  catalog remote   ──► product service
                                    /mfe/cart     cart remote      ──► order service (cart)
                                    /mfe/checkout checkout remote  ──► order + payment services
                                    /v1/*         gateway (API)
```

| App / package | What it owns | Dev port |
| --- | --- | --- |
| `apps/shell` | Layout, header, login/signup, routing, loads the remotes, toasts | 5000 |
| `apps/catalog` | Home, product list (search, filters, load more), product detail | 5001 |
| `apps/cart` | Cart page + `CartBadge` widget shown in the shell header | 5002 |
| `apps/checkout` | Place order, pay, my orders, tracking | 5003 |
| `packages/api` | Typed gateway client: token in memory, refresh single flight, `ApiError` | — |
| `packages/ui` | Design system: tokens (`theme.css`) + Button, Input, Card, Price… | — |
| `packages/shared` | Event bus between apps, `useSession`, routes | — |

## Run it (Windows PowerShell)

Needs Node 22.12+ and the ShopFlow backend running locally (gateway on `http://localhost:3000`).

```powershell
npm install
npm run dev          # starts all 4 apps → open http://localhost:5000
```

Other gateway URL: `$env:SHOPFLOW_API="http://localhost:3000"; npm run dev`

| Command | What it does |
| --- | --- |
| `npm run build` | Builds the 4 apps, then puts them in `dist-web/` (production layout) |
| `npm start` | Serves `dist-web/` on http://localhost:8080 like production (proxies `/v1`) |
| `npm run typecheck` | TypeScript strict, every app and package |
| `npm run lint` | ESLint + the CSS prefix check |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | Playwright on the production build, desktop + mobile, mocked gateway |

## How the micro frontends fit together

**1. Runtime remotes.** The shell has no remote URLs at build time. At startup it reads `/mfe-manifest.json`:

```json
{ "catalog": "/mfe/catalog/remoteEntry.js", "cart": "/mfe/cart/remoteEntry.js", "checkout": "/mfe/checkout/remoteEntry.js" }
```

It registers them with the Module Federation runtime (`apps/shell/src/federation/remotes.ts`).
To release one remote, deploy it and change its line. To roll back, change the line back. The shell is not rebuilt.

**2. Shared singletons** (`federation.config.ts`). The page loads exactly one copy of each of these:
`react`, `react-dom`, `react-router`, `@tanstack/react-query`, `@shopflow/api`, `@shopflow/shared`.
Two copies of React break hooks, and two copies of `@shopflow/api` would mean two logins.
An e2e test checks that no remote downloads its own React.

**3. Failure isolation.** Every remote renders inside `RemoteComponent`: Suspense + an error boundary + "Try again".
If the cart remote is down, the page shows "The cart is not available right now". The header and other pages keep working, and the cart icon becomes a plain link. This is tested in e2e.

**4. Apps talk by events, not imports** (`packages/shared/src/events.ts`).
For example, the catalog adds to the cart, then emits `cart-changed`; the cart badge hears it and reloads.
ESLint blocks importing another app's code.

**5. CSS isolation.** Each remote ships its own Tailwind CSS, with a **prefix**: `cat:`, `cart:` or `chk:`.
Without it, a remote's `.flex-col` (loaded later) would override the shell's `sm:flex-row`.
Shared components from `@shopflow/ui` use the shell's unprefixed classes.
`scripts/check-css-prefix.mjs` (part of `npm run lint`) fails on a missing prefix.

**6. Auth.** The access token stays in memory only, never in localStorage. The refresh token is the backend's httpOnly cookie (`SameSite=strict`, `path=/v1/auth`), which is why the web and the API share **one origin**.
On a 401, the client refreshes once (single flight: 10 parallel 401s → 1 refresh, because refresh tokens rotate), then retries the call.
After a page reload, `restoreSession()` gets a new token from the cookie.

## Build plan

- [x] **F0** Foundation: workspaces, packages, shell + 3 remotes, runtime manifest, CI, tests
- [x] **F1** Sign up, log in, log out, session restore, route guard
- [x] **F2** Browse products: grid, search, filters, load more, detail, add to cart
- [x] **F3** Cart: badge with count, cart page, qty, remove, coupon
- [x] **F4** Place order: Idempotency-Key, PRICE_CHANGED / SOLD_OUT / SERVER_BUSY
- [x] **F5** Pay: fake provider (needs the backend `dev/fake-pay` endpoint), Razorpay/Stripe adapters
- [x] **F6** My orders + live tracking timeline
- [ ] **F7** Polish: a11y pass, more e2e
- [ ] **F8** Deploy on Stage 1: Docker (nginx), Caddy route, ECR, release workflow
