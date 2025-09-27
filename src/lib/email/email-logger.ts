import { createClient } from '@/lib/SupabaseServerClient';

export interface EmailLogData {
  booking_id?: string;
  user_id: string;
  email_type: 'booking-confirmation' | 'booking-update' | 'booking-cancellation' | 'booking-reminder' | 'debrief-report';
  recipient_email: string;
  subject: string;
  message_id?: string;
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  error_message?: string;
}

export async function logEmail(data: EmailLogData): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('email_logs')
      .insert({
        booking_id: data.booking_id,
        user_id: data.user_id,
        email_type: data.email_type,
        recipient_email: data.recipient_email,
        subject: data.subject,
        message_id: data.message_id,
        status: data.status,
        error_message: data.error_message,
      });

    if (error) {
      console.error('Failed to log email:', error);
    }
  } catch (error) {
    console.error('Error logging email:', error);
  }
}

export async function updateEmailStatus(
  messageId: string, 
  status: 'delivered' | 'bounced' | 'failed', 
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('email_logs')
      .update({ 
        status, 
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('message_id', messageId);

    if (error) {
      console.error('Failed to update email status:', error);
    }
  } catch (error) {
    console.error('Error updating email status:', error);
  }
}

