import type { Metadata } from "next";
import { ServicesPageContent } from "./_components/services-page-content";

export const metadata: Metadata = {
  title: "Services",
  description: "Configure your business services",
};

export default function ServicesPage() {
  return <ServicesPageContent />;
}
