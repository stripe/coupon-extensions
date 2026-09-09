import { describe, expect, test } from 'vitest';
import type { Billing, Commerce, Context } from '@stripe/extensibility-sdk';
import { Decimal } from '@stripe/extensibility-sdk';

import PriceTargetedAmountOff, { type PriceTargetedAmountOffConfig } from './index.js';

const context: Context = { type: 'script', id: 'test', livemode: false };
const period = { value: 'oneTime' as const, at: new Date('2026-01-01T00:00:00Z') };

function line(
  subtotal: number,
  metadata: Record<string, string>,
  currency: Billing.Currency = 'usd'
): Commerce.DiscountCalculation.DiscountableLineItem {
  return {
    subtotal: { amount: Decimal.from(subtotal), currency },
    quantity: Decimal.from(1),
    period,
    price: { id: `price_${subtotal}`, metadata, tiers: [] },
  };
}

const config: PriceTargetedAmountOffConfig = {
  fixed_amount_off: { amount: Decimal.from(1_500), currency: 'usd' },
  metadata_key: 'promotion',
  metadata_value: 'summer',
};

function calculate(
  lineItems: Commerce.DiscountCalculation.DiscountableLineItem[],
  override: Partial<PriceTargetedAmountOffConfig> = {},
  grossAmount = 100_000
) {
  return new PriceTargetedAmountOff().computeDiscounts(
    {
      grossAmount: { amount: Decimal.from(grossAmount), currency: 'usd' },
      lineItems,
    },
    { ...config, ...override },
    context
  ).discount.amount;
}

describe('PriceTargetedAmountOff', () => {
  test('applies the fixed amount once per matching line item', () => {
    const discount = calculate([
      line(4_000, { promotion: 'summer' }),
      line(6_000, { promotion: 'summer' }),
      line(6_000, { promotion: 'winter' }),
    ]);

    expect(discount.amount.toString()).toBe('3000');
  });

  test('caps each application at its matching line subtotal', () => {
    const discount = calculate([
      line(500, { promotion: 'summer' }),
      line(2_000, { promotion: 'summer' }),
    ]);

    expect(discount.amount.toString()).toBe('2000');
  });

  test('matches metadata exactly', () => {
    const discount = calculate([
      line(4_000, { Promotion: 'summer' }),
      line(4_000, { promotion: 'Summer' }),
      line(4_000, { promotion: 'summer' }),
    ]);

    expect(discount.amount.toString()).toBe('1500');
  });

  test('returns zero when the configured currency does not match', () => {
    const discount = calculate([line(4_000, { promotion: 'summer' })], {
      fixed_amount_off: { amount: Decimal.from(1_500), currency: 'eur' },
    });

    expect(discount.amount.toString()).toBe('0');
  });

  test('caps the aggregate discount at the invoice total', () => {
    const discount = calculate(
      [line(4_000, { promotion: 'summer' }), line(4_000, { promotion: 'summer' })],
      {},
      2_000
    );

    expect(discount.amount.toString()).toBe('2000');
  });
});
