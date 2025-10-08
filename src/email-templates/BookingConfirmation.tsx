import { Text, Button, Link } from '@react-email/components';
import EmailLayout from './components/EmailLayout';
import BookingCard from './components/BookingCard';
import { Booking } from '@/types/bookings';
import { User } from '@/types/users';
import { Aircraft } from '@/types/aircraft';

interface BookingConfirmationProps {
  booking: Booking;
  member: User;
  aircraft?: Aircraft | null;
  instructor?: { name: string; email?: string } | null;
  lesson?: { name: string } | null;
  flightType?: { name: string } | null;
  dashboardUrl?: string;
  schoolName?: string;
  contactEmail?: string;
  contactPhone?: string;
  tagline?: string;
}

export default function BookingConfirmation({
  booking,
  member,
  aircraft,
  instructor,
  lesson,
  flightType,
  dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com',
  schoolName,
  contactEmail,
  contactPhone,
  tagline,
}: BookingConfirmationProps) {
  const isConfirmed = booking.status === 'confirmed';

  return (
    <EmailLayout
      title={`Booking Confirmation - ${schoolName || 'Flight Desk Pro'}`}
      schoolName={schoolName}
      contactEmail={contactEmail}
      contactPhone={contactPhone}
      tagline={tagline}
    >
      {/* Success Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Text style={{ margin: '0 0 12px 0', fontSize: '32px', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
          {isConfirmed ? '✈️ Booking Confirmed!' : '📋 Booking Received'}
        </Text>
        <Text style={{ margin: 0, fontSize: '18px', color: '#6b7280', lineHeight: '1.5' }}>
          Hello {member.first_name}!
          {isConfirmed
            ? ' Your flight training is all set.'
            : ' We\'re reviewing your booking request.'
          }
        </Text>
      </div>

      {/* Booking Details Card */}
      <BookingCard
        booking={booking}
        member={member}
        aircraft={aircraft}
        instructor={instructor}
        lesson={lesson}
        flightType={flightType}
      />

      {isConfirmed && (
        <>
          {/* Pre-Flight Checklist */}
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '20px', marginTop: '24px' }}>
            <Text style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#92400e' }}>
              ✓ Pre-Flight Checklist
            </Text>
            <div>
              <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#78350f' }}>
                🕐 Arrive 15 minutes before your scheduled time
              </Text>
              <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#78350f' }}>
                📖 Bring your pilot logbook and required documents
              </Text>
              <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#78350f' }}>
                📞 Contact us immediately if you need to reschedule
              </Text>
              <Text style={{ margin: 0, fontSize: '14px', color: '#78350f' }}>
                🌤️ Check weather conditions before your flight
              </Text>
            </div>
          </div>
        </>
      )}

      {/* Action Button */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <Button
          href={`${dashboardUrl}/dashboard/bookings/view/${booking.id}`}
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
          View Booking Details
        </Button>
        <Text style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
          Need to make changes?{' '}
          <Link
            href={`${dashboardUrl}/dashboard/bookings/view/${booking.id}`}
            style={{ color: '#2563eb', textDecoration: 'none' }}
          >
            Manage your booking online
          </Link>{' '}
          or give us a call.
        </Text>
      </div>

      {/* Footer Message */}
      <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px', marginTop: '32px', textAlign: 'center' }}>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
          Safe skies ahead! ✈️
        </Text>
        <Text style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
          Thank you for choosing {schoolName || 'Flight Desk Pro'} for your aviation journey.
        </Text>
      </div>
    </EmailLayout>
  );
}
