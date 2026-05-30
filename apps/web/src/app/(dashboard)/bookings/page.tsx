import type { Metadata } from "next";
import { BookingsPageContent } from "./_components/bookings-page-content";

export const metadata: Metadata = {
  title: "Bookings",
  description: "Manage and track all your bookings",
};

export default function BookingsPage() {
  return <BookingsPageContent />;
}
