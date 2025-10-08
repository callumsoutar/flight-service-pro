import { Text, Hr } from '@react-email/components';
import { Booking } from '@/types/bookings';
import { User } from '@/types/users';
import { Aircraft } from '@/types/aircraft';

interface BookingCardProps {
  booking: Booking;
  member?: User | null;
  aircraft?: Aircraft | null;
  instructor?: { name: string; email?: string } | null;
  lesson?: { name: string } | null;
  flightType?: { name: string } | null;
}

export default function BookingCard({
  booking,
  member,
  aircraft,
  instructor,
  lesson,
  flightType
}: BookingCardProps) {
  const formatTime = (isoString: string) => {
    // Handle both full ISO datetime strings and time-only strings
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      // If invalid date, try parsing as time-only
      const timeMatch = isoString.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${displayHours}:${minutes} ${period}`;
      }
      return 'Invalid Time';
    }
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDayOfWeek = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDateNumber = (dateString: string) => {
    return new Date(dateString).getDate().toString();
  };

  const getMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short' });
  };

  const statusColor = booking.status === 'confirmed'
    ? { bg: '#dcfce7', text: '#166534', border: '#86efac' }
    : booking.status === 'unconfirmed'
    ? { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
    : { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
      {/* Header with Date and Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Calendar Date Block */}
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', textAlign: 'center', minWidth: '70px' }}>
            <Text style={{ margin: 0, fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
              {getDayOfWeek(booking.start_time)}
            </Text>
            <Text style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#111827', lineHeight: '1' }}>
              {getDateNumber(booking.start_time)}
            </Text>
            <Text style={{ margin: 0, fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
              {getMonth(booking.start_time)}
            </Text>
          </div>

          <div>
            <Text style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Flight Training Session
            </Text>
            <Text style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              {formatTime(booking.start_time)} - {booking.end_time && formatTime(booking.end_time)}
            </Text>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          backgroundColor: statusColor.bg,
          color: statusColor.text,
          border: `1px solid ${statusColor.border}`,
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          ✅ {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </div>
      </div>

      <Hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Student */}
        {member && (
          <div>
            <Text style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
              👨‍🎓 Student
            </Text>
            <Text style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {member.first_name} {member.last_name}
            </Text>
          </div>
        )}

        {/* Aircraft */}
        {aircraft && (
          <div>
            <Text style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
              ✈️ Aircraft
            </Text>
            <Text style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {aircraft.registration}
            </Text>
            <Text style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
              {aircraft.type}
            </Text>
          </div>
        )}

        {/* Instructor */}
        {instructor && (
          <div>
            <Text style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
              👨‍✈️ Instructor
            </Text>
            <Text style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {instructor.name}
            </Text>
          </div>
        )}

        {/* Flight Type */}
        {flightType && (
          <div>
            <Text style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
              🛫 Flight Type
            </Text>
            <Text style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {flightType.name}
            </Text>
          </div>
        )}

        {/* Purpose */}
        {booking.purpose && (
          <div>
            <Text style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
              🎯 Purpose
            </Text>
            <Text style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {booking.purpose}
            </Text>
          </div>
        )}

        {/* Lesson */}
        {lesson && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Text style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
              📚 Lesson Topic
            </Text>
            <Text style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
              {lesson.name}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
