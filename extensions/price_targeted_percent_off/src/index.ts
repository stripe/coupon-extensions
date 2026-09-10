/**
 * Price-Targeted Percent Off Extension
 *
 * This Stripe Billing extension applies a percentage discount only to invoice
 * line items whose prices contain an exact configured metadata key/value pair.
 *
 * Key Features:
 * - Targets prices by exact, case-sensitive metadata matching
 * - Applies the percentage to each matching line item's subtotal
 * - Adds all matching line discounts into one invoice-level discount
 * - Never discounts more than the invoice total or returns a negative amount
 *
 * Use Cases:
 * - Discount a family of prices labeled for a promotion
 * - Exclude unrelated invoice lines from a coupon's percentage discount
 */

import type { Commerce, Context } from '@stripe/extensibility-sdk';
import { Decimal } from '@stripe/extensibility-sdk';

export interface PriceTargetedPercentOffConfig extends Record<string, unknown> {
  /**
   * Percentage to discount from each matching line item.
   * @displayName Percentage off
   * @format percent
   */
  percentageOff: number;

  /**
   * Price metadata key used to select eligible line items.
   * @displayName Metadata key
   */
  metadataKey: string;

  /**
   * Exact price metadata value required for eligibility.
   * @displayName Metadata value
   */
  metadataValue: string;
}

function minimum(left: Decimal, right: Decimal): Decimal {
  return left.lte(right) ? left : right;
}

export default class PriceTargetedPercentOff implements Commerce.DiscountCalculation<PriceTargetedPercentOffConfig> {
  computeDiscounts(
    request: Commerce.DiscountCalculation.DiscountableItem,
    config: PriceTargetedPercentOffConfig,
    _context: Context
  ): Commerce.DiscountCalculation.DiscountResult {
    const { grossAmount } = request;
    const percentage = Math.min(Math.max(config.percentageOff, 0), 1);

    let totalDiscount = Decimal.zero;
    if (percentage > 0 && config.metadataKey.length > 0) {
      for (const lineItem of request.lineItems) {
        const metadataMatches =
          lineItem.price?.metadata[config.metadataKey] === config.metadataValue;
        const currencyMatches =
          lineItem.subtotal.currency.toLowerCase() === grossAmount.currency.toLowerCase();

        if (metadataMatches && currencyMatches && lineItem.subtotal.amount.isPositive()) {
          totalDiscount = totalDiscount.add(lineItem.subtotal.amount.mul(percentage));
        }
      }
    }

    const cappedDiscount = grossAmount.amount.isPositive()
      ? minimum(totalDiscount, grossAmount.amount)
      : Decimal.zero;

    return {
      discount: {
        amount: {
          amount: cappedDiscount.isNegative() ? Decimal.zero : cappedDiscount,
          currency: grossAmount.currency,
        },
      },
    };
  }
}
