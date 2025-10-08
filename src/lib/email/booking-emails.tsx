import React from 'react';
import { render } from '@react-email/render';
import { resend, EMAIL_CONFIG, type EmailSendResult } from './resend-client';
import { logEmail } from './email-logger';
import BookingConfirmation from '@/email-templates/BookingConfirmation';
import BookingCancellation from '@/email-templates/BookingCancellation';
import DebriefReport from '@/email-templates/DebriefReport';
import { Booking } from '@/types/bookings';
import { User } from '@/types/users';
import { Aircraft } from '@/types/aircraft';
import { createClient } from '@/lib/supabase/server';

interface EmailSettings {
  schoolName: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
}

async function fetchEmailSettings(): Promise<EmailSettings> {
  try {
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from('settings')
      .select('setting_key, setting_value')
      .eq('category', 'general')
      .in('setting_key', ['school_name', 'contact_email', 'contact_phone', 'description']);

    const settingsMap = (settings || []).reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {} as Record<string, string>);

    return {
      schoolName: settingsMap.school_name || 'Flight Desk Pro',
      contactEmail: settingsMap.contact_email || 'support@yourdomain.com',
      contactPhone: settingsMap.contact_phone || '(123) 456-7890',
      description: settingsMap.description || 'Professional Flight Training Excellence',
    };
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return {
      schoolName: 'Flight Desk Pro',
      contactEmail: 'support@yourdomain.com',
      contactPhone: '(123) 456-7890',
      description: 'Professional Flight Training Excellence',
    };
  }
}

interface BookingEmailData {
  booking: Booking;
  member: User;
  aircraft?: Aircraft | null;
  instructor?: { name: string; email?: string } | null;
  lesson?: { name: string } | null;
  flightType?: { name: string } | null;
}

interface SendBookingConfirmationProps extends BookingEmailData {
  to?: string; // Override recipient email if needed
}

export async function sendBookingConfirmation({
  booking,
  member,
  aircraft,
  instructor,
  lesson,
  flightType,
  to,
}: SendBookingConfirmationProps): Promise<EmailSendResult> {
  try {
    // Check if email service is available
    if (!resend) {
      console.warn('Email service not available - RESEND_API_KEY not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const recipientEmail = to || member.email;

    if (!recipientEmail) {
      return {
        success: false,
        error: 'No recipient email address provided',
      };
    }

    // Fetch email settings
    const emailSettings = await fetchEmailSettings();

    // Render the email template
    const emailHtml = await render(
      <BookingConfirmation
        booking={booking}
        member={member}
        aircraft={aircraft}
        instructor={instructor}
        lesson={lesson}
        flightType={flightType}
        dashboardUrl={process.env.NEXT_PUBLIC_APP_URL}
        schoolName={emailSettings.schoolName}
        contactEmail={emailSettings.contactEmail}
        contactPhone={emailSettings.contactPhone}
        tagline={emailSettings.description}
      />
    );

    const isConfirmed = booking.status === 'confirmed';
    const bookingDate = new Date(booking.start_time).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const subject = isConfirmed
      ? `Flight Booking Confirmed - ${bookingDate}`
      : `Flight Booking Received - ${bookingDate}`;

    // Send the email
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.FROM_EMAIL,
      to: recipientEmail,
      subject,
      html: emailHtml,
      replyTo: EMAIL_CONFIG.REPLY_TO,
      headers: {
        'X-Booking-ID': booking.id,
        'X-Member-ID': member.id,
      },
    });

    if (error) {
      console.error('Failed to send booking confirmation email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    console.log('Booking confirmation email sent:', {
      messageId: data?.id,
      to: recipientEmail,
      bookingId: booking.id,
    });

    // Log the email
    await logEmail({
      booking_id: booking.id,
      user_id: member.id,
      email_type: 'booking-confirmation',
      recipient_email: recipientEmail,
      subject,
      message_id: data?.id,
      status: 'sent',
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function sendBookingUpdate({
  booking,
  member,
  aircraft,
  instructor,
  lesson,
  flightType,
  to,
}: SendBookingConfirmationProps): Promise<EmailSendResult> {
  try {
    // Check if email service is available
    if (!resend) {
      console.warn('Email service not available - RESEND_API_KEY not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const recipientEmail = to || member.email;

    if (!recipientEmail) {
      return {
        success: false,
        error: 'No recipient email address provided',
      };
    }

    // Fetch email settings
    const emailSettings = await fetchEmailSettings();

    // For now, reuse the confirmation template
    // You can create a separate BookingUpdate template later
    const emailHtml = await render(
      <BookingConfirmation
        booking={booking}
        member={member}
        aircraft={aircraft}
        instructor={instructor}
        lesson={lesson}
        flightType={flightType}
        dashboardUrl={process.env.NEXT_PUBLIC_APP_URL}
        schoolName={emailSettings.schoolName}
        contactEmail={emailSettings.contactEmail}
        contactPhone={emailSettings.contactPhone}
        tagline={emailSettings.description}
      />
    );

    const bookingDate = new Date(booking.start_time).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const subject = `Flight Booking Updated - ${bookingDate}`;

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.FROM_EMAIL,
      to: recipientEmail,
      subject,
      html: emailHtml,
      replyTo: EMAIL_CONFIG.REPLY_TO,
      headers: {
        'X-Booking-ID': booking.id,
        'X-Member-ID': member.id,
        'X-Email-Type': 'booking-update',
      },
    });

    if (error) {
      console.error('Failed to send booking update email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Error sending booking update email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function sendBookingCancellation({
  booking,
  member,
  to,
  cancellationReason,
  cancellationCategory,
  cancelledBy,
}: {
  booking: Booking;
  member: User;
  to?: string;
  cancellationReason?: string;
  cancellationCategory?: string;
  cancelledBy?: string;
}): Promise<EmailSendResult> {
  try {
    // Check if email service is available
    if (!resend) {
      console.warn('Email service not available - RESEND_API_KEY not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const recipientEmail = to || member.email;

    if (!recipientEmail) {
      return {
        success: false,
        error: 'No recipient email address provided',
      };
    }

    // Fetch email settings
    const emailSettings = await fetchEmailSettings();

    // Render the cancellation email template
    const emailHtml = await render(
      <BookingCancellation
        booking={booking}
        member={member}
        cancellationReason={cancellationReason}
        cancellationCategory={cancellationCategory}
        cancelledBy={cancelledBy}
        dashboardUrl={process.env.NEXT_PUBLIC_APP_URL}
        schoolName={emailSettings.schoolName}
        contactEmail={emailSettings.contactEmail}
        contactPhone={emailSettings.contactPhone}
        tagline={emailSettings.description}
      />
    );

    const bookingDate = new Date(booking.start_time).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const subject = `Flight Booking Cancelled - ${bookingDate}`;

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.FROM_EMAIL,
      to: recipientEmail,
      subject,
      html: emailHtml,
      replyTo: EMAIL_CONFIG.REPLY_TO,
      headers: {
        'X-Booking-ID': booking.id,
        'X-Member-ID': member.id,
        'X-Email-Type': 'booking-cancellation',
      },
    });

    if (error) {
      console.error('Failed to send booking cancellation email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    console.log('Booking cancellation email sent:', {
      messageId: data?.id,
      to: recipientEmail,
      bookingId: booking.id,
    });

    // Log the email
    await logEmail({
      booking_id: booking.id,
      user_id: member.id,
      email_type: 'booking-cancellation',
      recipient_email: recipientEmail,
      subject,
      message_id: data?.id,
      status: 'sent',
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Error sending booking cancellation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Define types for debrief email data
interface DebriefEmailData {
  booking: Booking;
  member: User;
  lessonProgress: {
    id: string;
    date?: string;
    status?: string;
    instructor_comments?: string;
    lesson_highlights?: string;
    airmanship?: string;
    focus_next_lesson?: string;
    areas_for_improvement?: string;
    weather_conditions?: string;
    safety_concerns?: string;
    instructor?: {
      user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
      };
    };
  };
  lesson?: { name: string } | null;
  flightExperiences?: Array<{
    experience_type: string;
    duration: number;
    notes?: string;
  }>;
  to?: string; // Override recipient email if needed
}

export async function sendDebriefReport({
  booking,
  member,
  lessonProgress,
  lesson,
  flightExperiences = [],
  to,
}: DebriefEmailData): Promise<EmailSendResult> {
  try {
    // Check if email service is available
    if (!resend) {
      console.warn('Email service not available - RESEND_API_KEY not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const recipientEmail = to || member.email;

    if (!recipientEmail) {
      return {
        success: false,
        error: 'No recipient email address provided',
      };
    }

    // Fetch email settings
    const emailSettings = await fetchEmailSettings();

    // Render the email template
    const emailHtml = await render(
      <DebriefReport
        booking={booking}
        lessonProgress={lessonProgress}
        lesson={lesson}
        flightExperiences={flightExperiences}
        dashboardUrl={process.env.NEXT_PUBLIC_APP_URL}
        schoolName={emailSettings.schoolName}
        contactEmail={emailSettings.contactEmail}
        contactPhone={emailSettings.contactPhone}
        tagline={emailSettings.description}
      />
    );

    const bookingDate = new Date(booking.start_time).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const subject = `Flight Debrief Report - ${bookingDate}`;

    // Send the email
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.FROM_EMAIL,
      to: recipientEmail,
      subject,
      html: emailHtml,
      replyTo: EMAIL_CONFIG.REPLY_TO,
      headers: {
        'X-Booking-ID': booking.id,
        'X-Member-ID': member.id,
        'X-Lesson-Progress-ID': lessonProgress.id,
        'X-Email-Type': 'debrief-report',
      },
    });

    if (error) {
      console.error('Failed to send debrief report email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    console.log('Debrief report email sent:', {
      messageId: data?.id,
      to: recipientEmail,
      bookingId: booking.id,
      lessonProgressId: lessonProgress.id,
    });

    // Log the email
    await logEmail({
      booking_id: booking.id,
      user_id: member.id,
      email_type: 'debrief-report',
      recipient_email: recipientEmail,
      subject,
      message_id: data?.id,
      status: 'sent',
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Error sending debrief report email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
