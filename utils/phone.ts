export const PHONE_VALIDATION_MESSAGE = 'מספר טלפון חייב להתחיל ב-+ או ב-0 ולהכיל ספרות בלבד.';

const PHONE_REGEX = /^(?:\+\d+|0\d+)$/;

export function normalizePhoneInput(value: string | null | undefined) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digitsOnly}` : digitsOnly;
}

export function isValidPhone(value: string | null | undefined) {
  return PHONE_REGEX.test(normalizePhoneInput(value));
}

export function isValidOptionalPhone(value: string | null | undefined) {
  const normalized = normalizePhoneInput(value);
  return normalized === '' || PHONE_REGEX.test(normalized);
}
