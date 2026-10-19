# ShopFlow Web

The web shop for the **[ShopFlow backend](https://github.com/niravparmar197/shopflow)**. It is built as **micro frontends**: a shell app plus 4 smaller apps (catalog, cart, checkout, admin) that load into it at runtime.

**Live demo:** https://shopflow-nirav.duckdns.org (only while the AWS box is running).

## Why micro frontends

- **Each part is separate:** catalog, cart, checkout and admin each live in their own app, like the backend services.
- **Release one part alone:** a new catalog can go live without rebuilding the rest.
- **One part failing doesn't break the page:** if the cart app is down, you can still browse.

## Features

| Area | What you can do |
|---|---|
| Account | Sign up, log in, forgot / reset password, confirm email, my account (name, phone, password) |
| Catalog | Search, filter by category and price, sort by price or newest, product photos, specifications |
| Wishlist | Tap the heart on any product; see saved products on **Wishlist** |
| Reviews | Star ratings on every product; write, edit or delete your review after delivery |
| Cart | Live count in the header, change quantity, remove, coupons |
| Checkout | Saved delivery addresses, place the order (safe against double clicks), pay |
| Orders | My orders, live tracking, cancel before shipping, download the GST invoice PDF |
| Flash deals | **Deals** page with a countdown and units left |
| Admin | Products and photos, stock, flash sales, coupons, all orders, ship / deliver / cancel |
| Policies | Privacy, terms, refund, shipping and contact pages (footer) |

## Apps

| App | Port | What it shows |
|---|---|---|
| shell | 5000 | Header, footer, login, account and policy pages; loads the other apps |
| catalog | 5001 | Home, products, product page, reviews, wishlist, deals |
| cart | 5002 | Cart page and the header cart badge |
| checkout | 5003 | Checkout, payment, my orders, tracking |
| admin | 5004 | Admin panel (admins only) |

## Technologies

- React 19, TypeScript
- Vite 8, Module Federation 2 (micro frontends)
- React Router 7, TanStack Query 5
- Tailwind CSS 4
- Vitest (unit tests), Playwright (browser tests, desktop + mobile)
- Docker + nginx (production image), GitHub Actions (CI/CD)

## Run on your computer

**Needs:** Node.js 22.12+ and the [backend](https://github.com/niravparmar197/shopflow) set up next to this repo (in `F:\projects`). Follow its "First time only" steps once.

**Start everything (backend + web):**
```powershell
cd F:\projects\shopflow
.\scripts\start-all.ps1 -Web ..\shopflow-frontend
```

**Or only the web app** (backend already running):
```powershell
cd F:\projects\shopflow-frontend
npm install
npm run dev
```

Wait for `Local: http://localhost:5000/`, then open **http://localhost:5000**. API calls go to `/v1`, and the dev server forwards them to the backend on port 3000.

**Stop:** `.\scripts\stop-all.ps1` in the backend folder, or **Ctrl + C** in the `npm run dev` window.

## How to use

1. **Shop:** browse, sort, filter, tap a heart, add to cart.
2. **Checkout:** add an address, place the order, press **Pay**.
3. **Orders:** track it, cancel it before shipping, or download the invoice.
4. **Admin** (admins only, top bar): ship and deliver orders, manage products and flash sales.
5. **Review:** after delivery, open the product and click **Write a review**.

To make yourself admin, see the backend README.

## Deploy

Merging to `main` builds the Docker image and deploys it to the AWS box. The box must be running:

```powershell
.\scripts\live.ps1 start    # start the AWS box and wait for the shop
.\scripts\live.ps1 stop     # stop it to save money
```

If a deploy failed because the box was stopped: `gh run list`, then `gh run rerun <id>`.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start all 5 apps |
| `npm run build` | Production build |
| `npm test` | Unit tests |
| `npm run e2e` | Browser tests |
| `npm run lint` | Check the code style |

## License

UNLICENSED — private project.
