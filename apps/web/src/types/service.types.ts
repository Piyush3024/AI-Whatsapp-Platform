export interface ServiceOption {
  id: string;
  name: string;
  price: number; // paisa
  duration: number; // minutes
  isActive: boolean;
}

// ─── Core Model ───────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  duration: number; // minutes
  price: number; // paisa (Rs. 500 = 50000)
  currency: string; // default: NPR
  locationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateServiceDto {
  name: string;
  description?: string;
  duration: number; // minutes
  price: number; // paisa — convert from rupees before sending
  currency?: string;
  locationId?: string;
  isActive?: boolean;
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  currency?: string;
  locationId?: string;
  isActive?: boolean;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export interface ServiceQuery {
  search?: string;
  includeInactive?: boolean;
  locationId?: string;
}

// ─── Response ─────────────────────────────────────────────────────────────────

/** GET /services → direct array, no pagination */
export type ServiceListResponse = Service[];
