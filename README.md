# Stripe coupon extensions

Official first-party Stripe App containing reference implementations for custom coupon and discounting extensions.

These extensions implement the `commerce.discount_calculation` interface, allowing you to override standard Stripe discounting behavior—enabling granular control over how discounts are calculated, applied, and combined across invoices and subscriptions.

---

## Documentation

- [Stripe authored scripts](https://docs.stripe.com/billing/scripts/stripe-authored/discount-calculation) — Additional documentation on these Stripe Authored Scripts 
- [Authoring your own scripts](https://docs.stripe.com/billing/scripts/discount-calculation) — Step by step guide on creating your own custom coupons.
- [Stripe apps framework](https://docs.stripe.com/stripe-apps) — Apps, extension packaging, manifests, and distribution.

---

## Available extensions

| Extension                      | Interface                       | Description                                                                                 |
| :----------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------ |
| **Percent off up to maximum**  | `commerce.discount_calculation` | Applies a percentage discount to the invoice total, capped at a specified monetary ceiling. |
| **BOGO & quantity promos**     | `commerce.discount_calculation` | Configures buy-X-get-Y promotional logic based on matching product metadata.                |
| **Price-targeted percent off** | `commerce.discount_calculation` | Applies a percentage discount strictly to line items with matching price metadata.          |
| **Price-targeted amount off**  | `commerce.discount_calculation` | Deducts a fixed monetary amount per matching line item based on price metadata.             |

---

### 1. Percent off up to maximum

Calculates `percentageDiscount` against the gross invoice total and caps the resulting discount at `maximumDiscount`.

> **Currency requirement:** `maximumDiscount` must match the invoice currency. A currency mismatch results in `$0` applied discount.

- **Example:** On a 20% discount with a $50 maximum:
  - $100 invoice total --> **$20 discount**
  - $500 invoice total --> **$50 discount** (capped)

#### Configuration schema

| Field                | Type              | Description                                                        |
| :------------------- | :---------------- | :----------------------------------------------------------------- |
| `percentageDiscount` | `Percentage`      | Discount rate as a decimal float between `0` and `1` (0% to 100%). |
| `maximumDiscount`    | `Monetary amount` | Maximum allowable discount amount.                                 |

---

### 2. BOGO & quantity promos

Filters products via exact metadata key/value matching. Quantities are aggregated by product ID, and promotional logic applies independently per matching product. When a product has multiple effective unit prices, discounts apply to the lowest unit cost first.

- **Example:** For `purchaseQuantity: 3` and `freeQuantity: 2`:
  - Purchase **3 units** --> 0 free units (threshold met, no promo triggered)
  - Purchase **4 or 5 units** --> 1 or 2 free units discounted
  - Purchase **6+ units** --> 2 free units discounted (capped at `freeQuantity`)

#### Configuration schema

| Field                   | Type      | Description                                                   |
| :---------------------- | :-------- | :------------------------------------------------------------ |
| `purchaseQuantity`      | `Integer` | Minimum paid unit threshold required before free units apply. |
| `freeQuantity`          | `Integer` | Maximum number of eligible free units per order.              |
| `metadataMatcher`       | `Object`  | Product metadata filtering rules.                             |
| `metadataMatcher.key`   | `String`  | Target product metadata key.                                  |
| `metadataMatcher.value` | `String`  | Target product metadata value (exact match).                  |

---

### 3. Price-targeted percent off

Evaluates invoice line items using exact metadata key/value matching against the line's corresponding price object. Applies `percentageOff` to each qualifying line item subtotal and returns the sum as the total invoice discount.

#### Configuration schema

| Field                   | Type         | Description                                                        |
| :---------------------- | :----------- | :----------------------------------------------------------------- |
| `percentageOff`         | `Percentage` | Discount rate as a decimal float between `0` and `1` (0% to 100%). |
| `metadataMatcher`       | `Object`     | Price metadata filtering rules.                                    |
| `metadataMatcher.key`   | `String`     | Target price metadata key.                                         |
| `metadataMatcher.value` | `String`     | Target price metadata value (exact match).                         |

---

### 4. Price-targeted amount off

Evaluates invoice line items using exact metadata key/value matching against the line's corresponding price object. Applies `fixedAmountOff` once per qualifying line (capped at that line's individual subtotal) and returns the aggregated discount total.

> **Currency Requirement:** `fixedAmountOff` must match the invoice currency.

#### Configuration schema

| Field                   | Type              | Description                                   |
| :---------------------- | :---------------- | :-------------------------------------------- |
| `fixedAmountOff`        | `Monetary amount` | Fixed amount deducted per eligible line item. |
| `metadataMatcher`       | `Object`          | Price metadata filtering rules.               |
| `metadataMatcher.key`   | `String`          | Target price metadata key.                    |
| `metadataMatcher.value` | `String`          | Target price metadata value (exact match).    |

---

## Development setup

### Prerequisites

- **Node.js:** `>= 20.0.0`
- **pnpm:** `>= 10.0.0`

### Installation & commands

```bash
# Install workspace dependencies
pnpm install

# Compile extension packages
pnpm build

# Execute test suite (Vitest)
pnpm test

# Run ESLint across workspace
pnpm lint

# Execute full validation pipeline (Build + Lint + Test)
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
