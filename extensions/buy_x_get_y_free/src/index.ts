/**
 * Buy X, Get Y Free Extension
 *
 * This Stripe Billing extension gives up to a configured number of additional
 * units for free after a customer buys the required quantity of a product.
 * Products qualify through an exact configured metadata key/value pair.
 *
 * Key Features:
 * - Groups matching invoice lines by product
 * - Applies the buy/get thresholds independently to each matching product
 * - Aggregates quantities when one product appears on multiple invoice lines
 * - Discounts the cheapest eligible units when line prices differ
 * - Supports fractional quantities proportionally
 * - Never discounts more than qualifying subtotals or the invoice total
 *
 * Example:
 * - With Buy 3, Get 2 Free, buying 3 units gives no discount, buying 4 or 5
 *   discounts 1 or 2 units, and buying 6 or more still discounts only 2 units.
 */

import type { Commerce, Context } from '@stripe/extensibility-sdk';
import { Decimal, DEFAULT_DIV_PRECISION } from '@stripe/extensibility-sdk';

export interface BuyXGetYFreeConfig extends Record<string, unknown> {
  /**
   * Number of units that must be purchased before free units are available.
   * @displayName Quantity required
   * @multipleOf 1
   * @minimum 1
   */
  quantity_required: number;

  /**
   * Maximum number of additional units that can be free.
   * @displayName Quantity free
   * @multipleOf 1
   * @minimum 1
   */
  quantity_free: number;

  /**
   * Product metadata key used to select eligible products.
   * @displayName Metadata key
   */
  metadata_key: string;

  /**
   * Exact product metadata value required for eligibility.
   * @displayName Metadata value
   */
  metadata_value: string;
}

interface EligibleLine {
  quantity: Decimal;
  subtotal: Decimal;
  unitAmount: Decimal;
}

function minimum(left: Decimal, right: Decimal): Decimal {
  return left.lte(right) ? left : right;
}

export default class BuyXGetYFree implements Commerce.DiscountCalculation<BuyXGetYFreeConfig> {
  computeDiscounts(
    request: Commerce.DiscountCalculation.DiscountableItem,
    config: BuyXGetYFreeConfig,
    _context: Context
  ): Commerce.DiscountCalculation.DiscountResult {
    const { grossAmount } = request;
    const groupedLines = new Map<string, EligibleLine[]>();

    if (
      config.quantity_required < 1 ||
      config.quantity_free < 1 ||
      config.metadata_key.length === 0
    ) {
      return {
        discount: {
          amount: { amount: Decimal.zero, currency: grossAmount.currency },
        },
      };
    }

    for (const lineItem of request.lineItems) {
      const product = lineItem.price?.product;
      const metadataMatches =
        product?.metadata[config.metadata_key] === config.metadata_value;
      const currencyMatches =
        lineItem.subtotal.currency.toLowerCase() === grossAmount.currency.toLowerCase();
      const quantity = lineItem.quantity;

      if (
        !product ||
        !metadataMatches ||
        !currencyMatches ||
        !quantity?.isPositive() ||
        !lineItem.subtotal.amount.isPositive()
      ) {
        continue;
      }

      const unitAmount = lineItem.subtotal.amount.div(
        quantity,
        DEFAULT_DIV_PRECISION,
        'half-even'
      );
      const lines = groupedLines.get(product.id) ?? [];
      lines.push({ quantity, subtotal: lineItem.subtotal.amount, unitAmount });
      groupedLines.set(product.id, lines);
    }

    let totalDiscount = Decimal.zero;
    const requiredQuantity = Decimal.from(config.quantity_required);
    const maximumFreeQuantity = Decimal.from(config.quantity_free);

    for (const lines of groupedLines.values()) {
      let totalQuantity = Decimal.zero;
      let totalSubtotal = Decimal.zero;
      for (const line of lines) {
        totalQuantity = totalQuantity.add(line.quantity);
        totalSubtotal = totalSubtotal.add(line.subtotal);
      }

      const additionalQuantity = totalQuantity.sub(requiredQuantity);
      if (!additionalQuantity.isPositive()) {
        continue;
      }

      let remainingFreeQuantity = minimum(additionalQuantity, maximumFreeQuantity);
      let productDiscount = Decimal.zero;
      const cheapestFirst = [...lines].sort((left, right) =>
        left.unitAmount.cmp(right.unitAmount)
      );

      for (const line of cheapestFirst) {
        if (!remainingFreeQuantity.isPositive()) {
          break;
        }
        const freeQuantityOnLine = minimum(line.quantity, remainingFreeQuantity);
        productDiscount = productDiscount.add(line.unitAmount.mul(freeQuantityOnLine));
        remainingFreeQuantity = remainingFreeQuantity.sub(freeQuantityOnLine);
      }

      totalDiscount = totalDiscount.add(minimum(productDiscount, totalSubtotal));
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
