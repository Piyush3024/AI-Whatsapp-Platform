/**
 * WhatsApp Cloud API Webhook Payload Types
 *
 * Meta jo payload bhejta hai uska exact shape yahan define kiya hai.
 * Ye types Meta ke official documentation se match karte hain.
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

// ── Message types ──────────────────────────────────────────────────────────

export interface WhatsAppTextMessage {
  body: string;
}

export interface WhatsAppImageMessage {
  caption?: string;
  mime_type: string;
  sha256: string;
  id: string;
}

export interface WhatsAppAudioMessage {
  mime_type: string;
  sha256: string;
  id: string;
  voice: boolean;
}

export interface WhatsAppDocumentMessage {
  caption?: string;
  filename: string;
  mime_type: string;
  sha256: string;
  id: string;
}

export interface WhatsAppLocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppButtonReply {
  id: string;
  title: string;
}

export interface WhatsAppInteractiveMessage {
  type: 'button_reply' | 'list_reply';
  button_reply?: WhatsAppButtonReply;
  list_reply?: WhatsAppButtonReply;
}

// ── Core message object ────────────────────────────────────────────────────

export interface WhatsAppMessage {
  id: string; // Meta message ID — unique
  from: string; // Sender ka phone number (E.164 format)
  timestamp: string; // Unix timestamp string
  type:
    | 'text'
    | 'image'
    | 'audio'
    | 'document'
    | 'location'
    | 'interactive'
    | 'button'
    | 'order'
    | 'unknown';
  text?: WhatsAppTextMessage;
  image?: WhatsAppImageMessage;
  audio?: WhatsAppAudioMessage;
  document?: WhatsAppDocumentMessage;
  location?: WhatsAppLocationMessage;
  interactive?: WhatsAppInteractiveMessage;
  context?: {
    from: string;
    id: string; // Reply kiye gaye message ka ID
  };
}

// ── Status update ──────────────────────────────────────────────────────────

export interface WhatsAppMessageStatus {
  id: string; // Message ID
  recipient_id: string; // Receiver ka phone number
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errors?: Array<{
    code: number;
    title: string;
  }>;
}

// ── Contact/Profile info ───────────────────────────────────────────────────

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

// ── Value object (inside each change) ─────────────────────────────────────

export interface WhatsAppWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string; // Tumhara WhatsApp number ID
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppMessageStatus[];
}

// ── Change object ──────────────────────────────────────────────────────────

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: 'messages';
}

// ── Entry object ───────────────────────────────────────────────────────────

export interface WhatsAppWebhookEntry {
  id: string; // WhatsApp Business Account ID
  changes: WhatsAppWebhookChange[];
}

// ── Root payload ───────────────────────────────────────────────────────────

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

// ── Verify query params (GET request) ─────────────────────────────────────

export interface WhatsAppVerifyQuery {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}
