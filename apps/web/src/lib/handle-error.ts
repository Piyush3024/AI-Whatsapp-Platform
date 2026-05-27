import { isAxiosError } from "axios";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

interface ApiFieldError {
  key?: string[] | string;
  message?: string[] | string;
}

interface ApiErrorResponse {
  title?: string;
  message?: string;
  errors?: ApiFieldError[] | string[];
  statusCode?: number;
  errorCode?: string;
}

/**
 * Normalize unknown backend error format into arrays
 */
function normalizeArray(value?: string[] | string): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

interface HandleApiErrorOptions<T extends FieldValues> {
  error: unknown;
  form?: UseFormReturn<T>;
  fallbackMessage?: string;
}

/**
 * Main API error handler
 */
export function handleApiError<T extends FieldValues>({
  error,
  form,
  fallbackMessage = "An unexpected error occurred. Please try again.",
}: HandleApiErrorOptions<T>): void {
  console.error(error);

  if (!isAxiosError(error)) {
    toast.error(fallbackMessage);
    return;
  }

  const responseData = error.response?.data as ApiErrorResponse | undefined;

  if (!responseData) {
    toast.error(fallbackMessage);
    return;
  }

  const { errors, message } = responseData;

  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    toast.error(message ?? fallbackMessage);
    return;
  }

  const summaryMessages: string[] = [];
  const formKeys = form
    ? (Object.keys(form.getValues()) as Array<Path<T>>)
    : [];

  for (const err of errors) {
    if (typeof err === "string") {
      const lowerMsg = err.toLowerCase();
      // Try to find a form key that is the prefix of the message or matches
      const matchedKey = formKeys.find((key) => {
        const lowerKey = String(key).toLowerCase();
        return lowerMsg.startsWith(lowerKey + " ") || lowerMsg === lowerKey;
      });

      if (form && matchedKey) {
        form.setError(matchedKey, { message: err });
      } else {
        summaryMessages.push(err);
      }
    } else if (err && typeof err === "object") {
      const fields = normalizeArray(err.key);
      const messages = normalizeArray(err.message);
      const msg = messages.join(", ");

      if (fields.length === 0) {
        summaryMessages.push(msg);
        continue;
      }

      for (const field of fields) {
        if (form && formKeys.includes(field as Path<T>)) {
          form.setError(field as Path<T>, { message: msg });
        } else {
          summaryMessages.push(msg);
        }
      }
    }
  }

  if (summaryMessages.length > 0) {
    toast.error(`Validation error: ${summaryMessages.join(", ")}`);
  }
}
