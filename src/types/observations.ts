// Types for the observations table and related enums

export type ObservationStatus = 'low' | 'medium' | 'high';
export type ObservationStage = 'open' | 'investigation' | 'resolution' | 'closed';

export interface Observation {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  status: ObservationStatus;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  closed_by?: string | null;
  aircraft_id: string;
  observation_stage: ObservationStage;
  resolution_comments?: string | null;
}

export interface ObservationInsert {
  user_id: string;
  name: string;
  description?: string | null;
  status?: ObservationStatus;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
  closed_by?: string | null;
  aircraft_id: string;
  observation_stage?: ObservationStage;
  resolution_comments?: string | null;
}

export interface ObservationUpdate {
  id?: string;
  user_id?: string;
  name?: string;
  description?: string | null;
  status?: ObservationStatus;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
  closed_by?: string | null;
  aircraft_id?: string;
  observation_stage?: ObservationStage;
  resolution_comments?: string | null;
} 