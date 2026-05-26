import { createHmac } from 'crypto';

/**
 * Generate HMAC-SHA256 signature for eSewa epay v2.
 *
 * @param totalAmount     - Formatted string e.g. "1500.00" (2 decimal places mandatory)
 * @param transactionUuid - Your unique transaction ID (e.g. invoice UUID)
 * @param productCode     - eSewa merchant ID (e.g. "EPAYTEST" or your live merchant code)
 * @param secretKey       - eSewa secret key from env
 * @returns Base64-encoded HMAC-SHA256 signature
 */
export function generateEsewaSignature(
  totalAmount: string,
  transactionUuid: string,
  productCode: string,
  secretKey: string,
): string {
  // Exact field order + no spaces — mandatory per eSewa epay v2 spec
  const data = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

  return createHmac('sha256', secretKey).update(data).digest('base64');
}

/**
 * Format an integer paisa amount to eSewa-compatible decimal string.
 *
 * Our DB stores money as integer paisa (Rs. 500 = 50000 paisa).
 * eSewa expects a decimal string in Rupees: "500.00"
 *
 * @param paisa - Amount in paisa (integer)
 * @returns String like "500.00"
 */
export function paisaToEsewaAmount(paisa: number): string {
  return (paisa / 100).toFixed(2);
}

/**
 * Verify the signature on eSewa's callback response.
 *
 * After payment, eSewa redirects with ?data=<base64_json>.
 * The decoded JSON contains a signature we must verify to confirm
 * eSewa actually sent this response (not a forged redirect).
 *
 * @param totalAmount     - Amount string from decoded response
 * @param transactionUuid - UUID from decoded response
 * @param productCode     - Merchant ID from decoded response
 * @param secretKey       - Our secret key
 * @param receivedSig     - Signature from eSewa's response
 * @returns true if valid, false if tampered
 */
export function verifyEsewaSignature(
  totalAmount: string,
  transactionUuid: string,
  productCode: string,
  secretKey: string,
  receivedSig: string,
): boolean {
  const expectedSig = generateEsewaSignature(
    totalAmount,
    transactionUuid,
    productCode,
    secretKey,
  );
  // Constant-time comparison to prevent timing attacks
  return expectedSig === receivedSig;
}

/**
 * Decode eSewa's Base64-encoded callback data parameter.
 *
 * eSewa sends: GET /esewa/verify?data=eyJzdGF0dXMi...
 * This function decodes it to the raw response object.
 */
export function decodeEsewaCallbackData(
  base64Data: string,
): EsewaCallbackPayload {
  const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
  return JSON.parse(decoded) as EsewaCallbackPayload;
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface EsewaCallbackPayload {
  transaction_code: string; // eSewa's internal reference ID
  status:
    | 'COMPLETE'
    | 'PENDING'
    | 'FULL_REFUND'
    | 'PARTIAL_REFUND'
    | 'AMBIGUOUS'
    | 'NOT_FOUND'
    | 'CANCELED';
  total_amount: string; // e.g. "1,500.0" (note: comma-formatted, not parseable directly)
  transaction_uuid: string; // Our transaction UUID
  product_code: string; // Our merchant ID
  signed_field_names: string; // Comma-separated list of signed fields
  signature: string; // eSewa's response signature (we must verify this)
}

export interface EsewaPaymentPayload {
  amount: string;
  tax_amount: string;
  total_amount: string;
  product_service_charge: string;
  product_delivery_charge: string;
  transaction_uuid: string;
  product_code: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
  esewa_url: string; // Frontend submits form to this URL
}
