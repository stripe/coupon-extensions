import { describe, expect, test } from 'vitest';
import type { Billing, Context } from '@stripe/extensibility-sdk';
import { Decimal } from '@stripe/extensibility-sdk';

import PercentOffUpToMaximum, { type PercentOffUpToMaximumConfig } from './index.js';

const context: Context = { type: 'script', id: 'test', livemode: false };

function calculate(
  grossAmount: number,
  config: PercentOffUpToMaximumConfig,
  currency: Billing.Currency = 'usd'
) {
  return new PercentOffUpToMaximum().computeDiscounts(
    {
      grossAmount: { amount: Decimal.from(grossAmount), currency },
      lineItems: [],
    },
    config,
    context
  ).discount.amount;
}

describe('PercentOffUpToMaximum', () => {
  test('applies the percentage when it is below the maximum', () => {
    const discount = calculate(10_000, {
      percentageDiscount: 0.2,
      maximumDiscount: { amount: Decimal.from(5_000), currency: 'usd' },
    });

    expect(discount.amount.toString()).toBe('2000');
    expect(discount.currency).toBe('usd');
  });

  test('caps a ten percent discount at five dollars', () => {
    const discount = calculate(10_000, {
      percentageDiscount: 0.1,
      maximumDiscount: { amount: Decimal.from(500), currency: 'usd' },
    });

    expect(discount.amount.toString()).toBe('500');
  });

  test('caps percentages above 100 at the invoice total', () => {
    const discount = calculate(10_000, {
      percentageDiscount: 1.5,
      maximumDiscount: { amount: Decimal.from(20_000), currency: 'usd' },
    });

    expect(discount.amount.toString()).toBe('10000');
  });

  test('returns zero when currencies do not match', () => {
    const discount = calculate(10_000, {
      percentageDiscount: 0.2,
      maximumDiscount: { amount: Decimal.from(5_000), currency: 'eur' },
    });

    expect(discount.amount.toString()).toBe('0');
  });

  test('returns zero for zero percent or a non-positive invoice', () => {
    const config: PercentOffUpToMaximumConfig = {
      percentageDiscount: 0,
      maximumDiscount: { amount: Decimal.from(5_000), currency: 'usd' },
    };

    expect(calculate(10_000, config).amount.toString()).toBe('0');
    expect(calculate(0, { ...config, percentageDiscount: 0.2 }).amount.toString()).toBe(
      '0'
    );
  });
});
