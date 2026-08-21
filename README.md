# Stripe Coupon Extensions

This repository contains the out-of-the-box [Billing Extensions](https://docs.stripe.com/billing/scripts) that provide custom discounting logic, available as a first-party app on Stripe. Each extension implements an extension interface and runs as part of a [Stripe App](https://docs.stripe.com/stripe-apps).

Use these extensions to override default coupon and discounting logic — control how discounts are calculated, applied, and combined across invoices and subscriptions.

## Documentation

- [Billing Extensions overview](https://docs.stripe.com/billing/scripts) — learn what billing extensions are and how they work.
- [Stripe-authored extensions](https://docs.stripe.com/billing/scripts/stripe-authored) — details on the extensions included in this repository.
- [Author your own](https://docs.stripe.com/billing/scripts/author-your-own) — build custom extensions and upload them to your account via Stripe Apps.

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
