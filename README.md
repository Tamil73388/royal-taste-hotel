# Royal Taste Hotel – Digital Restaurant Ordering System

Frontend-only project: HTML5, CSS3, vanilla JavaScript (ES6+ classes), fetch(), localStorage.

## Run
Use a local server (fetch() is blocked on `file://`), e.g. VS Code **Live Server**, or `python3 -m http.server`.
Open `client.html` (customers) and `kitchen.html` (kitchen) in two tabs of the same browser.

## Menu prices
`data/menu.json` currently has every price set to `0` as a placeholder. Fill in the real prices from the menu image.

## Limitation
This project intentionally uses localStorage instead of a backend.

It is designed for learning frontend JavaScript, DOM, OOP, fetch, events and browser storage.

The client and kitchen pages can share order data when running under the same origin/browser profile.

localStorage is NOT a real-time server database and does NOT synchronize data between different devices or different browsers. It is also not secure storage.

For a real restaurant deployment, a backend/database such as Node.js + Express + MongoDB/PostgreSQL/Firebase would be required.

## Keys
`hotel_menu`, `hotel_cart`, `hotel_orders`, `hotel_completed_orders`
