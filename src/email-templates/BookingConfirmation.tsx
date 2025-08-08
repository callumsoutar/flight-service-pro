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
}

export default function BookingConfirmation({
  booking,
  member,
  aircraft,
  instructor,
  lesson,
  flightType,
  dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com',
}: BookingConfirmationProps) {
  const isConfirmed = booking.status === 'confirmed';
  
  return (
    <EmailLayout title="Booking Confirmation - Aero Safety Flight School">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Text className="text-green-600 text-2xl m-0">
            {isConfirmed ? '✈️' : '📋'}
          </Text>
        </div>
        <Text className="text-3xl font-bold text-gray-900 m-0 mb-2">
          {isConfirmed ? '🎉 Booking Confirmed!' : '📝 Booking Received'}
        </Text>
        <Text className="text-lg text-gray-600 m-0">
          Hello {member.first_name}! 
          {isConfirmed 
            ? ' Your flight training is all set.'
            : ' We\'re reviewing your booking request.'
          }
        </Text>
      </div>
      
      {/* Main Message */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
        <Text className="text-gray-800 m-0 text-center text-lg leading-relaxed">
          {isConfirmed 
            ? '🚀 Get ready for an amazing flight training experience! All your booking details are confirmed below.'
            : '⏳ We have received your booking request and our team is reviewing it. You\'ll receive a confirmation email once it\'s approved.'
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
          <div className="bg-amber-50 rounded-2xl p-6 mt-8 border border-amber-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Text className="text-amber-600 font-bold m-0">✓</Text>
              </div>
              <Text className="text-xl font-bold text-amber-900 m-0">
                Pre-Flight Checklist
              </Text>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Text className="text-amber-600 m-0">🕐</Text>
                <Text className="text-amber-800 m-0">Arrive 15 minutes before your scheduled time</Text>
              </div>
              <div className="flex items-center gap-3">
                <Text className="text-amber-600 m-0">📖</Text>
                <Text className="text-amber-800 m-0">Bring your pilot logbook and required documents</Text>
              </div>
              <div className="flex items-center gap-3">
                <Text className="text-amber-600 m-0">📞</Text>
                <Text className="text-amber-800 m-0">Contact us immediately if you need to reschedule</Text>
              </div>
              <div className="flex items-center gap-3">
                <Text className="text-amber-600 m-0">🌤️</Text>
                <Text className="text-amber-800 m-0">Check weather conditions before your flight</Text>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="text-center mt-10">
        <div>
          <Button
            href={`${dashboardUrl}/dashboard/bookings/view/${booking.id}`}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg"
          >
            🔍 View Full Booking Details
          </Button>
        </div>
        
        <Text className="text-gray-600 text-sm m-0">
          Need to make changes?{' '}
          <Link 
            href={`${dashboardUrl}/dashboard/bookings/view/${booking.id}`}
            className="text-blue-600 font-medium"
          >
            Manage your booking online
          </Link>{' '}
          or give us a call.
        </Text>
      </div>

      {/* Footer Message */}
      <div className="bg-gray-50 rounded-xl p-6 mt-10 text-center border border-gray-100">
        <Text className="text-gray-700 m-0 mb-2 font-medium">
          🛡️ Safe skies ahead!
        </Text>
        <Text className="text-gray-600 text-sm m-0">
          Thank you for choosing Aero Safety Flight School for your aviation journey.
        </Text>
      </div>
    </EmailLayout>
  );
}
