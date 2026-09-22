/**
 * Price-Targeted Amount Off Extension
 *
 * This Stripe Coupon extension applies a fixed monetary discount to every
 * invoice line item whose price contains an exact configured metadata pair.
 *
 * Key Features:
 * - Targets prices by exact, case-sensitive metadata matching
 * - Applies the configured amount once per matching line item
 * - Caps each line's discount at that line's subtotal
 * - Requires the configured currency for the monetary amount and invoice currencies to match
 * - Never discounts more than the invoice total or returns a negative amount
 *
 * Use Cases:
 * - Take a fixed amount off every qualifying product price on an invoice
 * - Limit a coupon to prices explicitly labeled for a promotion
 */

import type { Commerce, Context, MonetaryAmount } from '@stripe/extensibility-sdk';
import { Decimal } from '@stripe/extensibility-sdk';

export interface MetadataMatcher {
  key: string;
  value: string;
}

export interface PriceTargetedAmountOffConfig extends Record<string, unknown> {
  /**
   * Fixed amount to discount from each matching line item.
   * @displayName Fixed amount off
   * @minimum :amount 0
   */
  fixedAmountOff: MonetaryAmount;

  /**
   * Line items qualify when their price metadata contains the specified key set to the specified value.
   * @displayName Price metadata
   */
  metadataMatcher: MetadataMatcher;
}

function minimum(left: Decimal, right: Decimal): Decimal {
  return left.lte(right) ? left : right;
}

export default class PriceTargetedAmountOff implements Commerce.DiscountCalculation<PriceTargetedAmountOffConfig> {
  computeDiscounts(
    request: Commerce.DiscountCalculation.DiscountableItem,
    config: PriceTargetedAmountOffConfig,
    _context: Context
  ): Commerce.DiscountCalculation.DiscountResult {
    const { grossAmount } = request;
    const currencyMatches =
      config.fixedAmountOff.currency.toLowerCase() === grossAmount.currency.toLowerCase();

    let totalDiscount = Decimal.zero;
    if (
      currencyMatches &&
      config.fixedAmountOff.amount.isPositive() &&
      config.metadataMatcher.key.length > 0
    ) {
      for (const lineItem of request.lineItems) {
        const metadataMatches =
          lineItem.price?.metadata[config.metadataMatcher.key] ===
          config.metadataMatcher.value;
        const lineCurrencyMatches =
          lineItem.subtotal.currency.toLowerCase() === grossAmount.currency.toLowerCase();

        if (
          metadataMatches &&
          lineCurrencyMatches &&
          lineItem.subtotal.amount.isPositive()
        ) {
          totalDiscount = totalDiscount.add(
            minimum(config.fixedAmountOff.amount, lineItem.subtotal.amount)
          );
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
