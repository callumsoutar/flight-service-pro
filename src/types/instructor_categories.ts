export interface InstructorCategory {
  id: string;
  name: string;
  description: string | null;
  country: string; // ISO 3166-1 alpha-2 country code (e.g., 'AU', 'US', 'CA')
  created_at: string;
  updated_at: string;
}

export type InstructorCategoryInsert = {
  name: string;
  description?: string | null;
  country: string;
};

export type InstructorCategoryUpdate = {
  name?: string;
  description?: string | null;
  country?: string;
};
