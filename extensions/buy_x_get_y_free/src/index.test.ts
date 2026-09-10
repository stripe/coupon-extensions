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
  quantityRequired: 3,
  quantityFree: 2,
  metadataKey: 'promotion',
  metadataValue: 'bogo',
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
