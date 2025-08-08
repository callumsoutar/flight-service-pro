import React from 'react';
import { render } from '@react-email/render';
import { resend, EMAIL_CONFIG, type EmailSendResult } from './resend-client';
import { logEmail } from './email-logger';
import BookingConfirmation from '@/email-templates/BookingConfirmation';
import { Booking } from '@/types/bookings';
import { User } from '@/types/users';
import { Aircraft } from '@/types/aircraft';

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
    const recipientEmail = to || member.email;
    
    if (!recipientEmail) {
      return {
        success: false,
        error: 'No recipient email address provided',
      };
    }

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
      />
    );

    const isConfirmed = booking.status === 'confirmed';
    const subject = isConfirmed 
      ? `Flight Booking Confirmed - ${new Date(booking.start_time).toLocaleDateString()}`
      : `Flight Booking Received - ${new Date(booking.start_time).toLocaleDateString()}`;

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
    const recipientEmail = to || member.email;
    
    if (!recipientEmail) {
      return {
        success: false,
        error: 'No recipient email address provided',
      };
    }

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
      />
    );

    const subject = `Flight Booking Updated - ${new Date(booking.start_time).toLocaleDateString()}`;

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
}: {
  booking: Booking;
  member: User;
  to?: string;
  cancellationReason?: string;
}): Promise<EmailSendResult> {
  try {
    const recipientEmail = to || member.email;
    
    if (!recipientEmail) {
      return {
        success: false,
        error: 'No recipient email address provided',
      };
    }

    // Simple cancellation email for now
    // You can create a dedicated template later
    const subject = `Flight Booking Cancelled - ${new Date(booking.start_time).toLocaleDateString()}`;
    
    const simpleHtml = `
      <h2>Booking Cancelled</h2>
      <p>Hello ${member.first_name},</p>
      <p>Your flight booking for ${new Date(booking.start_time).toLocaleDateString()} has been cancelled.</p>
      ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
      <p>If you have any questions, please contact us.</p>
    `;

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.FROM_EMAIL,
      to: recipientEmail,
      subject,
      html: simpleHtml,
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
