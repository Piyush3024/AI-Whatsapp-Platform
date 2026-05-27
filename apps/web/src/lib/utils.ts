/**
 * General utility helpers
 */

/**
 * Format paisa (integer) to display currency
 * DB: 50000 → Display: Rs. 500.00
 */
export function formatPrice(paisa: number): string {
  return `Rs. ${(paisa / 100).toFixed(2)}`;
}

/**
 * Format ISO date string to locale string
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString();
}
