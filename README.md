# ShopLedger

ShopLedger is an internal billing, inventory, and customer credit (khata) app for Corner Shop Kirana & Wholesale. It runs on Node.js and Express and serves a plain HTML, CSS, and JavaScript interface.

## Run locally

Install Node.js and npm, then run these commands from the project root:

```sh
npm install
npm start
```

Open [ShopLedger](http://localhost:3000). The server uses port 3000 by default. Set the `PORT` environment variable before starting the app to use another port.

## Workflows

- **Billing** — Browse products and stock, build retail or wholesale orders, and preview pricing with coupons and GST.
- **Orders** — Review order history, cancel orders, and open printable HTML invoices.
- **Customer khata** — Review outstanding customer balances and record payments against credit accounts.
- **Reporting** — Review the dashboard, reconcile invoice and ledger GST totals, and inspect warehouse stock and wholesale reservations.

## Project layout

| Path | Purpose |
| --- | --- |
| `server.js` | Express entry point, static frontend, API routing, and printable invoices |
| `config.js` | Port defaults, shop details, GST slabs, and inventory settings |
| `routes/` | Product, order, customer, and reporting endpoints under `/api` |
| `lib/` | Pricing, coupons, tax, inventory, orders, ledger, and report logic |
| `public/` | Browser interface and static assets |
| `data/db.json` | Bundled data and persistent local storage |

The app reads and writes `data/db.json` directly. Orders, cancellations, and khata settlements update this file. Copy it before experimenting if you want to restore the original data later.

## Smoke check

After starting the app, open the [product catalog endpoint](http://localhost:3000/api/products) and confirm it returns JSON. The `npm test` script is a placeholder that exits with an error.
