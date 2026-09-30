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
      subscriptions: {},
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

  test('applies the maximum valid percentage of 1 at the invoice total', () => {
    const discount = calculate(10_000, {
      percentageDiscount: 1,
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

  test('matches configured and invoice currencies case-insensitively', () => {
    const discount = calculate(10_000, {
      percentageDiscount: 0.2,
      maximumDiscount: {
        amount: Decimal.from(5_000),
        currency: 'USD' as Billing.Currency,
      },
    });

    expect(discount.amount.toString()).toBe('2000');
    expect(discount.currency).toBe('usd');
  });

  test('returns the invoice currency on a zero discount', () => {
    const discount = calculate(
      10_000,
      {
        percentageDiscount: 0,
        maximumDiscount: { amount: Decimal.from(5_000), currency: 'usd' },
      },
      'USD' as Billing.Currency
    );

    expect(discount.amount.toString()).toBe('0');
    expect(discount.currency).toBe('USD');
  });

  test.each([0, -0.1])('returns zero for a percentage of %s', (percentageDiscount) => {
    const discount = calculate(10_000, {
      percentageDiscount,
      maximumDiscount: { amount: Decimal.from(5_000), currency: 'usd' },
    });

    expect(discount.amount.toString()).toBe('0');
  });

  test.each([0, -500])(
    'returns zero for a maximum discount amount of %s',
    (maximumDiscount) => {
      const discount = calculate(10_000, {
        percentageDiscount: 0.2,
        maximumDiscount: { amount: Decimal.from(maximumDiscount), currency: 'usd' },
      });

      expect(discount.amount.toString()).toBe('0');
    }
  );

  test.each([0, -10_000])('returns zero for a gross amount of %s', (grossAmount) => {
    const discount = calculate(grossAmount, {
      percentageDiscount: 0.2,
      maximumDiscount: { amount: Decimal.from(5_000), currency: 'usd' },
    });

    expect(discount.amount.toString()).toBe('0');
  });
});
