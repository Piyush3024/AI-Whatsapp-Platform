import { type TransformFnParams } from 'class-transformer';

export const parseToBoolean = (
  params: TransformFnParams,
): boolean | undefined => {
  const value = params.value as unknown;

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  return undefined;
};

export const parseToArray = (params: TransformFnParams): string[] => {
  const value = params.value as unknown;

  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

export const parseToDate = (params: TransformFnParams): Date | undefined => {
  const value = params.value as unknown;

  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
};

export const trimString = (params: TransformFnParams): string => {
  const value = params.value as unknown;
  if (typeof value === 'string') {
    return value.trim();
  }
  return (value as string | null | undefined) ?? '';
};
