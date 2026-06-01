import type { Metadata } from "next";
import { AuditLogTable } from "./_components/audit-log-table";

export const metadata: Metadata = {
  title: "Settings — Audit Log",
  description: "View all actions performed in your account",
};

export default function AuditLogPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          A complete record of all actions performed in your account.
        </p>
      </div>
      <AuditLogTable />
    </div>
  );
}
