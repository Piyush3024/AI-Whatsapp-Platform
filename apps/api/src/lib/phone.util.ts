/**
 * Phone Utility — E.164 Validation & Normalization
 *
 * Uses google-libphonenumber for comprehensive phone validation.
 * All phone numbers in our system are stored in E.164 format.
 */

//  google-libphonenumber is CommonJS - using createRequire for ESM compatibility

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const libphonenumber =
  require('google-libphonenumber') as typeof import('google-libphonenumber');
const { PhoneNumberFormat } = libphonenumber;
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
import type { PhoneNumber } from 'google-libphonenumber';

/**
 * Supported regions for our platform (configurable per tenant)
 */
export const SUPPORTED_REGIONS = ['NP', 'IN', 'US', 'UK', 'AU'] as const;
export type SupportedRegion = (typeof SUPPORTED_REGIONS)[number];

/**
 * Parsed phone result
 */
export interface ParsedPhone {
  e164: string; // +9779801234567
  international: string; // +977 980-123-4567
  national: string; // 980-123-4567
  countryCode: string; // 977
  region: string; // NP, IN, etc.
  isValid: boolean;
}

/**
 * Parses and validates a phone number, returning E.164 format.
 *
 * @param rawPhone - Raw phone input (any format)
 * @param defaultRegion - Default region for local numbers (e.g., 'NP' for Nepal)
 * @returns ParsedPhone object
 * @throws Error if phone is invalid
 *
 * @example
 * parsePhoneToE164('9801234567', 'NP')
 * // => { e164: '+9779801234567', ... }
 */
export function parsePhoneToE164(
  rawPhone: string,
  defaultRegion: SupportedRegion = 'NP',
): ParsedPhone {
  // Clean input — remove spaces, dashes, parentheses
  const cleaned = rawPhone.replace(/[\s()-]/g, '').trim();

  let number: PhoneNumber;
  try {
    // Try parsing with default region first
    number = phoneUtil.parseAndKeepRawInput(cleaned, defaultRegion);
  } catch {
    // If default region fails, try no region (already has +)
    if (cleaned.startsWith('+')) {
      number = phoneUtil.parse(cleaned);
    } else {
      throw new Error(`Invalid phone number: ${rawPhone}`);
    }
  }

  // Validate the number
  const isValid = phoneUtil.isValidNumber(number);

  if (!isValid) {
    throw new Error(`Invalid phone number format: ${rawPhone}`);
  }

  return {
    e164: phoneUtil.format(number, PhoneNumberFormat.E164),
    international: phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL),
    national: phoneUtil.format(number, PhoneNumberFormat.NATIONAL),
    countryCode: number.getCountryCode()?.toString() ?? '',
    region: phoneUtil.getRegionCodeForNumber(number) ?? '',
    isValid: true,
  };
}

/**
 * Validates a phone number without throwing.
 *
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  try {
    const cleaned = phone.replace(/[\s()-]/g, '').trim();

    let number: PhoneNumber;
    try {
      number = phoneUtil.parseAndKeepRawInput(cleaned, 'NP');
    } catch {
      if (cleaned.startsWith('+')) {
        number = phoneUtil.parse(cleaned);
      } else {
        return false;
      }
    }

    return phoneUtil.isValidNumber(number);
  } catch {
    return false;
  }
}

/**
 * Checks if phone number is in E.164 format.
 *
 * @param phone - Phone to check
 * @returns true if already E.164
 */
export function isE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Ensures phone is in E.164 format (adds + if missing, validates).
 *
 * @param phone - Phone to normalize
 * @param defaultRegion - Default region if no + prefix
 */
export function ensureE164(
  phone: string,
  defaultRegion: SupportedRegion = 'NP',
): string {
  if (isE164(phone)) {
    return phone;
  }
  return parsePhoneToE164(phone, defaultRegion).e164;
}
