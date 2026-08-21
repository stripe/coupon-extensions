# Stripe Coupon Extensions

This repository contains the out-of-the-box [Coupon Extensions](https://docs.stripe.com/extensions/discount-calculation-extension) that provide custom discounting logic, available as a first-party app on Stripe. Each extension implements an extension interface and runs as part of a [Stripe App](https://docs.stripe.com/stripe-apps).

Use these extensions to override default coupon and discounting logic — control how discounts are calculated, applied, and combined across invoices and subscriptions.

## Documentation

- [Discount calculation extensions](https://docs.stripe.com/extensions/discount-calculation-extension) — learn how coupon extensions customize discount calculation.
- [Stripe Apps](https://docs.stripe.com/stripe-apps) — learn how extensions are packaged and distributed as apps.

## Available extensions

| Extension | Interface | Description |
| --------- | --------- | ----------- |
| _TBD_     | _TBD_     | _TBD_       |

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
│       ├── config_schema.json  # Configuration schema
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
