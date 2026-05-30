import type { Metadata } from "next";
import { StaffPageContent } from "./_components/staff-page-content";

export const metadata: Metadata = {
  title: "Staff",
  description: "Manage your team members and schedules",
};

export default function StaffPage() {
  return <StaffPageContent />;
}
