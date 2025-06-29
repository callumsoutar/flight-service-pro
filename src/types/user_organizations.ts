export type UserRole = "owner" | "admin" | "instructor" | "member" | "student";

export interface UserOrganization {
  id: string; // uuid
  user_id: string; // uuid
  organization_id: string; // uuid
  role: UserRole;
  created_at: string; // timestamptz (ISO string)
} 