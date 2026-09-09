import { describe, expect, test } from 'vitest';
import type { Billing, Commerce, Context } from '@stripe/extensibility-sdk';
import { Decimal } from '@stripe/extensibility-sdk';

import PriceTargetedPercentOff, { type PriceTargetedPercentOffConfig } from './index.js';

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
    price: {
      id: `price_${subtotal}`,
      metadata,
      tiers: [],
    },
  };
}

const config: PriceTargetedPercentOffConfig = {
  percentage_off: 25,
  metadata_key: 'promotion',
  metadata_value: 'summer',
};

function calculate(
  lineItems: Commerce.DiscountCalculation.DiscountableLineItem[],
  override: Partial<PriceTargetedPercentOffConfig> = {},
  grossAmount = 100_000
) {
  return new PriceTargetedPercentOff().computeDiscounts(
    {
      grossAmount: { amount: Decimal.from(grossAmount), currency: 'usd' },
      lineItems,
    },
    { ...config, ...override },
    context
  ).discount.amount;
}

describe('PriceTargetedPercentOff', () => {
  test('sums percentage discounts for every matching price', () => {
    const discount = calculate([
      line(4_000, { promotion: 'summer' }),
      line(6_000, { promotion: 'summer' }),
      line(8_000, { promotion: 'winter' }),
    ]);

    expect(discount.amount.toString()).toBe('2500');
  });

  test('matches metadata keys and values exactly', () => {
    const discount = calculate([
      line(4_000, { Promotion: 'summer' }),
      line(4_000, { promotion: 'Summer' }),
      line(4_000, { promotion: 'summer' }),
    ]);

    expect(discount.amount.toString()).toBe('1000');
  });

  test('ignores missing prices and line items in another currency', () => {
    const withoutPrice: Commerce.DiscountCalculation.DiscountableLineItem = {
      subtotal: { amount: Decimal.from(4_000), currency: 'usd' },
      quantity: Decimal.from(1),
      period,
    };
    const discount = calculate([
      withoutPrice,
      line(4_000, { promotion: 'summer' }, 'eur'),
    ]);

    expect(discount.amount.toString()).toBe('0');
  });

  test('caps the percentage and aggregate discount at the invoice total', () => {
    const discount = calculate(
      [line(8_000, { promotion: 'summer' }), line(8_000, { promotion: 'summer' })],
      { percentage_off: 150 },
      10_000
    );

    expect(discount.amount.toString()).toBe('10000');
  });

  test('returns zero for no matching lines or zero percent', () => {
    expect(calculate([line(4_000, {})]).amount.toString()).toBe('0');
    expect(
      calculate([line(4_000, { promotion: 'summer' })], {
        percentage_off: 0,
      }).amount.toString()
    ).toBe('0');
  });
});
