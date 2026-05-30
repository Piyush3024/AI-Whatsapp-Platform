import type { Metadata } from "next";
import { WhatsAppList } from "./_components/whatsapp-list";

export const metadata: Metadata = {
  title: "WhatsApp",
  description: "Manage your WhatsApp numbers",
};

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Numbers</h1>
        <p className="text-muted-foreground mt-1">
          Manage your WhatsApp business numbers and test messaging
        </p>
      </div>
      <WhatsAppList />
    </div>
  );
}
