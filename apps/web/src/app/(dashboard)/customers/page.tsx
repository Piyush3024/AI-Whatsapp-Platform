import type { Metadata } from "next";
import { CustomersPageContent } from "./_components/customers-page-content";

export const metadata: Metadata = {
  title: "Customers",
  description: "View and manage your customer base",
};

export default function CustomersPage() {
  return <CustomersPageContent />;
}
