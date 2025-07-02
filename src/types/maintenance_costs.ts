export interface MaintenanceCost {
  id: string;
  maintenance_visit_id: string;
  aircraft_component_id?: string | null;
  cost_type: string; // 'Labor', 'Parts', 'External Service', 'Other'
  description?: string | null;
  quantity?: number | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  supplier_vendor?: string | null;
  invoice_reference?: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
} 