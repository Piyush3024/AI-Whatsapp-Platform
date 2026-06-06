export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

export type CustomerOptInStatus = "OPTED_IN" | "OPTED_OUT" | "PENDING";

export interface Customer {
  id: string;
  tenantId: string;
  name: string | null;
  phone: string;
  email: string | null;
  whatsappId: string | null;
  optInStatus: CustomerOptInStatus;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  items: Customer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerConversation {
  id: string;
  state: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
}

export interface CustomerConversationListResponse {
  items: CustomerConversation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerOptInStatus;
  tag?: string;
}

export interface CreateCustomerDto {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
  optInStatus?: CustomerOptInStatus;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  optInStatus?: CustomerOptInStatus;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}
