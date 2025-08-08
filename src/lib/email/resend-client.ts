import { Resend } from 'resend';

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
