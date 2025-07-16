// Types for the observation_comments table

export interface ObservationComment {
  id: string;
  defect_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export interface ObservationCommentInsert {
  defect_id: string;
  user_id: string;
  comment: string;
  created_at?: string;
}

export interface ObservationCommentUpdate {
  id?: string;
  defect_id?: string;
  user_id?: string;
  comment?: string;
  created_at?: string;
} 