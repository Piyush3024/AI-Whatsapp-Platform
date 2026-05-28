export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
}

export interface CustomerListResponse {
  items: CustomerOption[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
