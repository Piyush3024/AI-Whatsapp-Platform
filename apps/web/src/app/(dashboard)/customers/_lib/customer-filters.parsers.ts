import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import type { CustomerOptInStatus } from "@/types/customer.types";

const CUSTOMER_OPT_IN_STATUSES = [
  "OPTED_IN",
  "OPTED_OUT",
  "PENDING",
] as const satisfies CustomerOptInStatus[];

export const customerFilterParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  search: parseAsString.withOptions({ clearOnDefault: true }),
  status: parseAsStringLiteral(CUSTOMER_OPT_IN_STATUSES).withOptions({
    clearOnDefault: true,
  }),
  tag: parseAsString.withOptions({ clearOnDefault: true }),
};
