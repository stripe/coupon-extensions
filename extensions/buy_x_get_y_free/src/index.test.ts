import { describe, expect, test } from 'vitest';
import type { Billing, Commerce, Context } from '@stripe/extensibility-sdk';
import { Decimal } from '@stripe/extensibility-sdk';

import BuyXGetYFree, { type BuyXGetYFreeConfig } from './index.js';

const context: Context = { type: 'script', id: 'test', livemode: false };
const period = { value: 'oneTime' as const, at: new Date('2026-01-01T00:00:00Z') };

function line({
  productId = 'product_a',
  quantity,
  subtotal,
  metadata = { promotion: 'bogo' },
  currency = 'usd',
}: {
  productId?: string;
  quantity: number | string;
  subtotal: number | string;
  metadata?: Record<string, string>;
  currency?: Billing.Currency;
}): Commerce.DiscountCalculation.DiscountableLineItem {
  return {
    subtotal: { amount: Decimal.from(subtotal), currency },
    quantity: Decimal.from(quantity),
    period,
    price: {
      id: `price_${productId}_${subtotal}`,
      metadata: {},
      tiers: [],
      product: { id: productId, name: productId, metadata },
    },
  };
}

const config: BuyXGetYFreeConfig = {
  purchaseQuantity: 3,
  freeQuantity: 2,
  metadataMatcher: {
    key: 'promotion',
    value: 'bogo',
  },
};

function calculate(
  lineItems: Commerce.DiscountCalculation.DiscountableLineItem[],
  grossAmount = 100_000,
  override: Partial<BuyXGetYFreeConfig> = {}
) {
  return new BuyXGetYFree().computeDiscounts(
    {
      grossAmount: { amount: Decimal.from(grossAmount), currency: 'usd' },
      lineItems,
      subscriptions: {},
    },
    { ...config, ...override },
    context
  ).discount.amount;
}

describe('BuyXGetYFree', () => {
  test('does not discount when the purchased quantity is at the threshold', () => {
    expect(calculate([line({ quantity: 3, subtotal: 3_000 })]).amount.toString()).toBe(
      '0'
    );
  });

  test('discounts only the additional units up to the configured free quantity', () => {
    expect(calculate([line({ quantity: 4, subtotal: 4_000 })]).amount.toString()).toBe(
      '1000'
    );
    expect(calculate([line({ quantity: 5, subtotal: 5_000 })]).amount.toString()).toBe(
      '2000'
    );
    expect(calculate([line({ quantity: 6, subtotal: 6_000 })]).amount.toString()).toBe(
      '2000'
    );
  });

  test('allows free units without a purchase threshold', () => {
    expect(
      calculate([line({ quantity: 1, subtotal: 1_000 })], 100_000, {
        purchaseQuantity: 0,
        freeQuantity: 2,
      }).amount.toString()
    ).toBe('1000');
    expect(
      calculate([line({ quantity: 2, subtotal: 2_000 })], 100_000, {
        purchaseQuantity: 0,
        freeQuantity: 2,
      }).amount.toString()
    ).toBe('2000');
    expect(
      calculate([line({ quantity: 3, subtotal: 3_000 })], 100_000, {
        purchaseQuantity: 0,
        freeQuantity: 2,
      }).amount.toString()
    ).toBe('2000');
  });

  test('aggregates split lines for the same product', () => {
    const discount = calculate([
      line({ quantity: 2, subtotal: 2_000 }),
      line({ quantity: 3, subtotal: 3_000 }),
    ]);

    expect(discount.amount.toString()).toBe('2000');
  });

  test('applies the promotion independently to each matching product', () => {
    const discount = calculate([
      line({ productId: 'product_a', quantity: 4, subtotal: 4_000 }),
      line({ productId: 'product_b', quantity: 5, subtotal: 10_000 }),
    ]);

    expect(discount.amount.toString()).toBe('5000');
  });

  test('discounts the cheapest units when a product has different unit prices', () => {
    const discount = calculate([
      line({ quantity: 3, subtotal: 6_000 }),
      line({ quantity: 2, subtotal: 2_000 }),
    ]);

    expect(discount.amount.toString()).toBe('2000');
  });

  test('discounts across multiple price lines in cheapest-first order', () => {
    const discount = calculate(
      [line({ quantity: 5, subtotal: 10_000 }), line({ quantity: 2, subtotal: 2_000 })],
      100_000,
      { purchaseQuantity: 3, freeQuantity: 3 }
    );

    expect(discount.amount.toString()).toBe('4000');
  });

  test('supports fractional quantities proportionally', () => {
    const discount = calculate([line({ quantity: '4.5', subtotal: 4_500 })]);

    expect(discount.amount.toString()).toBe('1500');
  });

  test('ignores products without exact matching metadata', () => {
    const discount = calculate([
      line({ quantity: 5, subtotal: 5_000, metadata: { promotion: 'BOGO' } }),
      line({ quantity: 5, subtotal: 5_000, metadata: { Promotion: 'bogo' } }),
      line({ quantity: 5, subtotal: 5_000, metadata: { promotion: 'bogo' } }),
    ]);

    expect(discount.amount.toString()).toBe('2000');
  });

  test('ignores missing products, non-positive quantities, and currency mismatches', () => {
    const missingProduct: Commerce.DiscountCalculation.DiscountableLineItem = {
      subtotal: { amount: Decimal.from(5_000), currency: 'usd' },
      quantity: Decimal.from(5),
      period,
      price: { id: 'price_missing_product', metadata: {}, tiers: [] },
    };
    const discount = calculate([
      missingProduct,
      line({ quantity: 0, subtotal: 5_000 }),
      line({ quantity: 5, subtotal: 5_000, currency: 'eur' }),
    ]);

    expect(discount.amount.toString()).toBe('0');
  });

  test.each([
    ['purchase quantity', { purchaseQuantity: -1 }],
    ['free quantity', { freeQuantity: 0 }],
    ['metadata key', { metadataMatcher: { key: '', value: 'bogo' } }],
  ] satisfies [string, Partial<BuyXGetYFreeConfig>][])(
    'returns zero when the configured %s is invalid',
    (_label, override) => {
      const discount = calculate(
        [line({ quantity: 5, subtotal: 5_000 })],
        100_000,
        override
      );

      expect(discount.amount.toString()).toBe('0');
    }
  );

  test.each([0, -2])(
    'ignores a line with quantity %s without changing the qualifying product total',
    (quantity) => {
      const discount = calculate([
        line({ quantity: 4, subtotal: 4_000 }),
        line({ quantity, subtotal: 2_000 }),
      ]);

      expect(discount.amount.toString()).toBe('1000');
    }
  );

  test.each([0, -100])(
    'ignores a line with subtotal %s without consuming free quantity',
    (subtotal) => {
      const discount = calculate([
        line({ quantity: 4, subtotal: 4_000 }),
        line({ quantity: 100, subtotal }),
      ]);

      expect(discount.amount.toString()).toBe('1000');
    }
  );

  test('matches line-item and invoice currencies case-insensitively', () => {
    const discount = calculate([
      line({ quantity: 4, subtotal: 4_000, currency: 'USD' as Billing.Currency }),
    ]);

    expect(discount.amount.toString()).toBe('1000');
    expect(discount.currency).toBe('usd');
  });

  test.each([0, -1_000])('returns zero for a gross amount of %s', (grossAmount) => {
    const discount = calculate([line({ quantity: 5, subtotal: 5_000 })], grossAmount);

    expect(discount.amount.toString()).toBe('0');
  });

  test('caps the aggregate discount at the invoice total', () => {
    const discount = calculate(
      [
        line({ productId: 'product_a', quantity: 5, subtotal: 5_000 }),
        line({ productId: 'product_b', quantity: 5, subtotal: 5_000 }),
      ],
      3_000
    );

    expect(discount.amount.toString()).toBe('3000');
  });
});
