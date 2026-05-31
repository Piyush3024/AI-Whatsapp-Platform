import { ConversationList } from "./_components/conversation-list";

export const metadata = {
  title: "Conversations — WhatsApp AI Platform",
};

export default function ConversationsPage() {
  return (
    <div className="h-full -m-4 lg:-m-6">
      <ConversationList />
    </div>
  );
}
