/**
 * Normalizes a mobile number string by extracting digits only.
 * In India, subscriber mobile numbers are 10 digits.
 * If digits length >= 10, returns the last 10 digits.
 * Handles:
 *  - +918888888888 -> 8888888888
 *  - 8888888888 -> 8888888888
 *  - 88888 88888 or 88888 888888 -> 8888888888
 *  - +91 88888 88888 -> 8888888888
 *  - 08888888888 -> 8888888888
 */
export const normalizeMobile = (mobile) => {
  if (!mobile) return '';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

/**
 * Checks if two mobile number strings refer to the same 10-digit number.
 */
export const isDuplicateMobile = (mobile1, mobile2) => {
  const norm1 = normalizeMobile(mobile1);
  const norm2 = normalizeMobile(mobile2);
  if (!norm1 || !norm2) return false;
  return norm1 === norm2;
};

/**
 * Formats a 10-digit normalized phone number for clean UI display (+91 XXXXX XXXXX).
 */
export const formatMobile = (mobile) => {
  const norm = normalizeMobile(mobile);
  if (norm.length === 10) {
    return `+91 ${norm.slice(0, 5)} ${norm.slice(5)}`;
  }
  return mobile || '';
};
