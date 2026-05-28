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

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
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
    id: string;
  };
}

export interface WhatsAppMessageStatus {
  id: string;
  recipient_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errors?: Array<{
    code: number;
    title: string;
  }>;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppMessageStatus[];
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: 'messages';
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

export interface WhatsAppVerifyQuery {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}
