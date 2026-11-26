# Repository Guidelines

## Stack

ShopLedger uses Node.js, Express, and `body-parser` on the server. The browser UI uses plain HTML, CSS, and JavaScript. The app stores its data in a JSON file.

## Module map

- `server.js` serves the UI, mounts the API routers, and serves printable invoices.
- `public/` contains the browser UI. `routes/` contains the products, orders, customers, and reports routers.
- `lib/` contains order, inventory, pricing, coupon, GST, khata, invoice, reporting, and date logic. `lib/store.js` reads and writes `data/db.json`.
- `config.js` contains shop settings and business defaults.

## Commands

- `npm install` installs the existing dependencies.
- `npm start` starts the app on port 3000 by default. Set `PORT` to override it.
- `npm test` runs the current placeholder and exits with an error.

## Contributor rules

- Write **characterization tests** that capture existing behavior before changing it.
- Change only the module the ticket is about.
- Tests must never read or write `data/db.json`.
- Add no dependencies.
