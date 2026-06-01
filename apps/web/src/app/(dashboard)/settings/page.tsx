import type { Metadata } from "next";
import { GeneralSettings } from "./_components/general-settings";
import { LocationsSettings } from "./_components/locations-settings";
import { MembersSettings } from "./_components/members-settings";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure your business settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">General</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business settings
        </p>
      </div>
      <GeneralSettings />
      <LocationsSettings />
      <MembersSettings />
    </div>
  );
}
