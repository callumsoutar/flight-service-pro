export interface License {
  id: string; // uuid
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string; // timestamptz (ISO string)
  updated_at: string; // timestamptz (ISO string)
}

export interface CreateLicenseRequest {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateLicenseRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface LicenseResponse {
  licenses: License[];
}

export interface SingleLicenseResponse {
  license: License;
}
