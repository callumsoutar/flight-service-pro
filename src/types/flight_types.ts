export type InstructionType = 'dual' | 'solo' | 'trial';

export interface FlightType {
  id: string;
  name: string;
  description?: string | null;
  instruction_type: InstructionType | null;
  is_active: boolean;
  voided_at?: string | null;
  created_at: string;
  updated_at: string;
} 