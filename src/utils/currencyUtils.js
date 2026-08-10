/**
 * Formats a numeric price into human-readable Indian currency text in words.
 * Examples:
 *  - 1,000 -> ₹1 Thousand
 *  - 50,000 -> ₹50 Thousand
 *  - 1,00,000 -> ₹1 Lakh
 *  - 16,00,000 -> ₹16 Lakhs
 *  - 1,50,00,000 -> ₹1.5 Crores
 */
export function formatIndianCurrencyWords(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const num = Number(amount);
  if (num === 0) return '₹0';

  const absNum = Math.abs(num);
  const prefix = num < 0 ? '-₹' : '₹';

  if (absNum >= 10000000) {
    // 1 Crore = 10,000,000 = 10^7
    const val = absNum / 10000000;
    const formatted = val % 1 === 0 ? val.toString() : Number(val.toFixed(2)).toString();
    const label = val === 1 ? 'Crore' : 'Crores';
    return `${prefix}${formatted} ${label}`;
  } else if (absNum >= 100000) {
    // 1 Lakh = 100,000 = 10^5
    const val = absNum / 100000;
    const formatted = val % 1 === 0 ? val.toString() : Number(val.toFixed(2)).toString();
    const label = val === 1 ? 'Lakh' : 'Lakhs';
    return `${prefix}${formatted} ${label}`;
  } else if (absNum >= 1000) {
    // 1 Thousand = 1,000 = 10^3
    const val = absNum / 1000;
    const formatted = val % 1 === 0 ? val.toString() : Number(val.toFixed(2)).toString();
    return `${prefix}${formatted} Thousand`;
  }

  return `${prefix}${absNum.toLocaleString('en-IN')}`;
}

/**
 * Returns object with both Indian currency words and exact formatted numeric representation.
 * Example: formatIndianCurrencyFull(15000000) => { words: '₹1.5 Crores', numeric: '₹1,50,00,000' }
 */
export function formatIndianCurrencyFull(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return { words: '₹0', numeric: '₹0' };
  }
  const num = Number(amount);
  return {
    words: formatIndianCurrencyWords(num),
    numeric: `₹${num.toLocaleString('en-IN')}`
  };
}
