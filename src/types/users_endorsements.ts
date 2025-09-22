import { z } from "zod";

// Base schema for users_endorsements
export const usersEndorsementsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  endorsement_id: z.string().uuid(),
  issued_date: z.string().datetime(),
  expiry_date: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  voided_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Schema for creating a new user endorsement
export const createUsersEndorsementSchema = z.object({
  user_id: z.string().uuid(),
  endorsement_id: z.string().uuid(),
  issued_date: z.string().datetime().optional(),
  expiry_date: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Schema for updating a user endorsement
export const updateUsersEndorsementSchema = z.object({
  issued_date: z.string().datetime().optional(),
  expiry_date: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Schema for voiding a user endorsement
export const voidUsersEndorsementSchema = z.object({
  voided_at: z.string().datetime(),
});

// Schema for querying user endorsements
export const queryUsersEndorsementsSchema = z.object({
  user_id: z.string().uuid().optional(),
  endorsement_id: z.string().uuid().optional(),
  include_expired: z.boolean().optional(),
});

// Type definitions
export type UsersEndorsement = z.infer<typeof usersEndorsementsSchema>;
export type CreateUsersEndorsement = z.infer<typeof createUsersEndorsementSchema>;
export type UpdateUsersEndorsement = z.infer<typeof updateUsersEndorsementSchema>;
export type VoidUsersEndorsement = z.infer<typeof voidUsersEndorsementSchema>;
export type QueryUsersEndorsements = z.infer<typeof queryUsersEndorsementsSchema>;

// Extended type with endorsement details
export type UsersEndorsementWithDetails = UsersEndorsement & {
  endorsement: {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
  };
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
};
