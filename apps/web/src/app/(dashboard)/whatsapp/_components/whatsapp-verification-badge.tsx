import { Badge } from "@repo/ui/components/badge";
import type { WhatsAppVerificationStatus } from "@/types/whatsapp.types";

const config: Record<
  WhatsAppVerificationStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  VERIFIED: { label: "Verified", variant: "default" },
  NOT_VERIFIED: { label: "Not Verified", variant: "secondary" },
  FLAGGED: { label: "Flagged", variant: "destructive" },
};

export function WhatsAppVerificationBadge({
  status,
}: {
  status: WhatsAppVerificationStatus;
}) {
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
