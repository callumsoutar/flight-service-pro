// Types for the observations table and related enums

export type ObservationStage = 'open' | 'investigation' | 'resolution' | 'closed';

export interface Observation {
  id: string;
  aircraft_id: string;
  name: string;
  description?: string | null;
  stage: ObservationStage;
  priority?: string | null;
  reported_by: string;
  assigned_to?: string | null;
  reported_date: string;
  resolved_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  closed_by?: string | null;
  resolution_comments?: string | null;
}

export interface ObservationInsert {
  aircraft_id: string;
  name: string;
  description?: string | null;
  stage?: ObservationStage;
  priority?: string | null;
  reported_by: string;
  assigned_to?: string | null;
  reported_date?: string;
  resolved_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  closed_by?: string | null;
  resolution_comments?: string | null;
}

export interface ObservationUpdate {
  id?: string;
  aircraft_id?: string;
  name?: string;
  description?: string | null;
  stage?: ObservationStage;
  priority?: string | null;
  reported_by?: string;
  assigned_to?: string | null;
  reported_date?: string;
  resolved_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  closed_by?: string | null;
  resolution_comments?: string | null;
} 