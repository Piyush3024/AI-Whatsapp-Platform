import type { Metadata } from "next";
import { DocumentList } from "./_components/document-list";

export const metadata: Metadata = {
  title: "Knowledge Base",
  description: "Manage AI knowledge documents",
};

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Upload documents for AI to reference during customer conversations
        </p>
      </div>
      <DocumentList />
    </div>
  );
}
