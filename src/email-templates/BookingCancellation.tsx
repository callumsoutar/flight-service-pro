import { Text, Button, Link } from '@react-email/components';
import EmailLayout from './components/EmailLayout';
import { Booking } from '@/types/bookings';
import { User } from '@/types/users';

interface BookingCancellationProps {
  booking: Booking;
  member: User;
  cancellationReason?: string;
  cancellationCategory?: string;
  cancelledBy?: string;
  dashboardUrl?: string;
}

export default function BookingCancellation({
  booking,
  member,
  cancellationReason,
  cancellationCategory,
  cancelledBy,
  dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com',
}: BookingCancellationProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <EmailLayout title="Booking Cancelled - Aero Safety Flight School">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Text style={{ margin: '0 0 12px 0', fontSize: '32px', fontWeight: '700', color: '#dc2626', lineHeight: '1.2' }}>
          ❌ Booking Cancelled
        </Text>
        <Text style={{ margin: 0, fontSize: '18px', color: '#6b7280', lineHeight: '1.5' }}>
          Hello {member.first_name}, your flight booking has been cancelled.
        </Text>
      </div>

      {/* Cancellation Details */}
      <div style={{ border: '1px solid #fca5a5', backgroundColor: '#fee2e2', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <Text style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#991b1b' }}>
          📅 Cancelled Booking Details
        </Text>
        <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#7f1d1d' }}>
          <strong>Date:</strong> {formatDate(booking.start_time)}
        </Text>
        <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#7f1d1d' }}>
          <strong>Time:</strong> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
        </Text>
        {booking.purpose && (
          <Text style={{ margin: 0, fontSize: '14px', color: '#7f1d1d' }}>
            <strong>Purpose:</strong> {booking.purpose}
          </Text>
        )}
      </div>

      {/* Cancellation Reason */}
      {(cancellationReason || cancellationCategory) && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
          <Text style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
            Cancellation Details
          </Text>
          {cancellationCategory && (
            <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>
              <strong>Category:</strong> {cancellationCategory}
            </Text>
          )}
          {cancellationReason && (
            <Text style={{ margin: 0, fontSize: '14px', color: '#374151' }}>
              <strong>Reason:</strong> {cancellationReason}
            </Text>
          )}
          {cancelledBy && (
            <Text style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Cancelled by: {cancelledBy}
            </Text>
          )}
        </div>
      )}

      {/* Rebooking CTA */}
      <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
        <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
          Need to reschedule?
        </Text>
        <Button
          href={`${dashboardUrl}/dashboard/scheduler`}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '16px',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          Book a New Flight
        </Button>
      </div>

      {/* Help Text */}
      <div style={{ textAlign: 'center' }}>
        <Text style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
          Questions about this cancellation?{' '}
          <Link
            href={`${dashboardUrl}/dashboard/bookings`}
            style={{ color: '#2563eb', textDecoration: 'none' }}
          >
            View your bookings
          </Link>
          {' '}or contact us.
        </Text>
      </div>
    </EmailLayout>
  );
}
