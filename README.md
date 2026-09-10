# Stripe Coupon Extensions

This repository contains the out-of-the-box [Coupon Extensions](https://docs.stripe.com/extensions/discount-calculation-extension) that provide custom discounting logic, available as a first-party app on Stripe. Each extension implements an extension interface and runs as part of a [Stripe App](https://docs.stripe.com/stripe-apps).

Use these extensions to override default coupon and discounting logic — control how discounts are calculated, applied, and combined across invoices and subscriptions.

## Documentation

- [Discount calculation extensions](https://docs.stripe.com/extensions/discount-calculation-extension) — learn how coupon extensions customize discount calculation.
- [Stripe Apps](https://docs.stripe.com/stripe-apps) — learn how extensions are packaged and distributed as apps.

## Available extensions

| Extension                  | Interface                       | Description                                                                                      |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| Percent off up to maximum  | `commerce.discount_calculation` | Discounts the invoice total by a percentage, up to a configured monetary maximum.                |
| Buy X, get Y free          | `commerce.discount_calculation` | Discounts additional units of products with matching metadata after a purchase threshold is met. |
| Price-targeted percent off | `commerce.discount_calculation` | Applies a percentage discount only to line items whose prices have matching metadata.            |
| Price-targeted amount off  | `commerce.discount_calculation` | Applies a fixed discount to each line item whose price has matching metadata.                    |

### Percent off up to maximum

Applies `percentageDiscount` to the invoice gross amount and limits the result to `maximumDiscount`. The maximum must use the invoice currency; a currency mismatch produces no discount.

For example, a 20% discount with a $50 maximum discounts a $100 invoice by $20 and a $500 invoice by $50.

| Configuration        | Type            | Description                                                                      |
| -------------------- | --------------- | -------------------------------------------------------------------------------- |
| `percentageDiscount` | Percentage      | Percentage of the invoice total to discount, from 0 through 1 (0% through 100%). |
| `maximumDiscount`    | Monetary amount | Maximum amount that can be discounted.                                           |

### Buy X, get Y free

Selects products by an exact metadata key/value match. Quantities are combined by product, and the offer is applied independently to each matching product. When one product has multiple effective unit prices, the cheapest eligible units are discounted first.

For example, with a required quantity of 3 and a free quantity of 2, purchasing 3 units gives no discount, purchasing 4 or 5 discounts 1 or 2 units, and purchasing 6 or more still discounts only 2 units.

| Configuration      | Type    | Description                                                   |
| ------------------ | ------- | ------------------------------------------------------------- |
| `quantityRequired` | Integer | Units that must be purchased before free units are available. |
| `quantityFree`     | Integer | Maximum number of additional units that can be free.          |
| `metadataKey`      | String  | Product metadata key used to select eligible products.        |
| `metadataValue`    | String  | Exact product metadata value required for eligibility.        |

### Price-targeted percent off

Selects invoice lines by an exact metadata key/value match on the corresponding price. The extension applies `percentageOff` to every matching line subtotal and returns their combined discount against the invoice total.

| Configuration   | Type       | Description                                                                                |
| --------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `percentageOff` | Percentage | Percentage of each matching line subtotal to discount, from 0 through 1 (0% through 100%). |
| `metadataKey`   | String     | Price metadata key used to select eligible line items.                                     |
| `metadataValue` | String     | Exact price metadata value required for eligibility.                                       |

### Price-targeted amount off

Selects invoice lines by an exact metadata key/value match on the corresponding price. The extension applies `fixedAmountOff` once per matching line, caps each application at that line's subtotal, and returns the combined discount. The configured amount must use the invoice currency.

| Configuration    | Type            | Description                                            |
| ---------------- | --------------- | ------------------------------------------------------ |
| `fixedAmountOff` | Monetary amount | Fixed amount to discount from each matching line item. |
| `metadataKey`    | String          | Price metadata key used to select eligible line items. |
| `metadataValue`  | String          | Exact price metadata value required for eligibility.   |

## Getting started

### Prerequisites

- Node.js >= 20
- [pnpm](https://pnpm.io/) 10

### Installation

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Run tests

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

### Run all checks

Build, lint, and test in one command:

```bash
pnpm check
```

## Project structure

```
coupon-extensions/
├── extensions/                 # One package per extension (pnpm workspace)
│   └── <extension_id>/
│       ├── src/index.ts        # Extension implementation
│       ├── src/index.test.ts   # Tests
│       ├── generated/          # Generated configuration and UI schemas
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.mts
├── stripe-app.yaml             # App manifest — extension registration
├── package.json                # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json          # Shared TypeScript config
├── eslint.config.mts
└── vitest.config.base.mts
```

Each extension is a self-contained pnpm workspace package under `extensions/`. The `stripe-app.yaml` manifest registers all extensions and points to their configuration schemas and entry points.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and how to submit changes.

## License

MIT — see [LICENSE](LICENSE).
