/**
 * Standardized Indian Rupee (INR / ₹) Currency Utility
 * 
 * Formats all monetary values using the Indian numbering system:
 * e.g., ₹25,000, ₹1,00,000, ₹2,50,000, ₹12,50,000
 */

export interface FormatINROptions {
  showDecimals?: boolean;
  withSymbol?: boolean;
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

/**
 * Formats a number or numeric string as Indian Rupees (INR) with the ₹ symbol and Indian comma placement.
 * @param amount Numeric value to format
 * @param options Optional configuration for decimals or symbol
 */
export function formatINR(
  amount: number | string | null | undefined,
  options: FormatINROptions = {}
): string {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return options.withSymbol === false ? '0' : '₹0';
  }

  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const showDecimals = options.showDecimals ?? false;
  const withSymbol = options.withSymbol ?? true;

  const formattedAbs = new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(absNum);

  let prefix = '';
  if (isNegative) {
    prefix = '-';
  } else if (options.signDisplay === 'always' && num > 0) {
    prefix = '+';
  }

  if (withSymbol) {
    return `${prefix}₹${formattedAbs}`;
  }
  return `${prefix}${formattedAbs}`;
}

export const formatCurrency = formatINR;
