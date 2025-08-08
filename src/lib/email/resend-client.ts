import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_CONFIG = {
  FROM_EMAIL: process.env.FROM_EMAIL || 'onboarding@resend.dev', // Use Resend test domain by default
  REPLY_TO: process.env.REPLY_TO_EMAIL || 'support@yourdomain.com',
  COMPANY_NAME: 'Aero Safety Flight School',
} as const;

export type EmailSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};
