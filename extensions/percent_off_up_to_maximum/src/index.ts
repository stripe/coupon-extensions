/**
 * Percent Off Up to Maximum Extension
 *
 * This Stripe Billing extension applies a percentage discount to the total
 * invoice amount while limiting the discount to a configured maximum amount.
 *
 * Key Features:
 * - Applies a configurable percentage to the invoice gross amount
 * - Caps the result at a configurable monetary maximum
 * - Requires the maximum and invoice currencies to match
 * - Never discounts more than the invoice total or returns a negative amount
 *
 * Example:
 * - A 20% discount with a $50 maximum discounts a $100 invoice by $20 and a
 *   $500 invoice by $50.
 */

import type { Commerce, Context, MonetaryAmount } from '@stripe/extensibility-sdk';
import { Decimal, DEFAULT_DIV_PRECISION } from '@stripe/extensibility-sdk';

export interface PercentOffUpToMaximumConfig extends Record<string, unknown> {
  /**
   * Percentage of the invoice total to discount.
   * @displayName Percentage discount
   * @format percent
   */
  percentage_discount: number;

  /**
   * Maximum monetary amount that can be discounted.
   * @displayName Maximum discount
   * @minimum :amount 0
   */
  maximum_discount: MonetaryAmount;
}

function minimum(left: Decimal, right: Decimal): Decimal {
  return left.lte(right) ? left : right;
}

export default class PercentOffUpToMaximum implements Commerce.DiscountCalculation<PercentOffUpToMaximumConfig> {
  computeDiscounts(
    request: Commerce.DiscountCalculation.DiscountableItem,
    config: PercentOffUpToMaximumConfig,
    _context: Context
  ): Commerce.DiscountCalculation.DiscountResult {
    const { grossAmount } = request;
    const zero = Decimal.zero;

    if (
      grossAmount.currency.toLowerCase() !==
        config.maximum_discount.currency.toLowerCase() ||
      !grossAmount.amount.isPositive() ||
      !config.maximum_discount.amount.isPositive() ||
      config.percentage_discount <= 0
    ) {
      return { discount: { amount: { amount: zero, currency: grossAmount.currency } } };
    }

    const percentage = Math.min(config.percentage_discount, 100);
    const percentageDiscount = grossAmount.amount
      .mul(percentage)
      .div(100, DEFAULT_DIV_PRECISION, 'half-even');
    const cappedDiscount = minimum(
      minimum(percentageDiscount, config.maximum_discount.amount),
      grossAmount.amount
    );

    return {
      discount: {
        amount: {
          amount: cappedDiscount.isNegative() ? zero : cappedDiscount,
          currency: grossAmount.currency,
        },
      },
    };
  }
}
