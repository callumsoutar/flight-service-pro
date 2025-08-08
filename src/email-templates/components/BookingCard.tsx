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
  // Removed unused formatDate function

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
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

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-lg">
      {/* Header with Date Calendar Style */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Calendar Date Block */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 text-center min-w-[70px]">
            <Text className="text-xs font-medium text-gray-500 m-0 uppercase tracking-wide">
              {getDayOfWeek(booking.start_time)}
            </Text>
            <Text className="text-2xl font-bold text-gray-900 m-0 leading-none">
              {getDateNumber(booking.start_time)}
            </Text>
            <Text className="text-xs font-medium text-gray-600 m-0 uppercase">
              {getMonth(booking.start_time)}
            </Text>
          </div>
          
          <div>
            <Text className="text-xl font-bold text-gray-900 m-0 mb-1">
              Flight Training Session
            </Text>
            <Text className="text-sm text-gray-600 m-0">
              {formatTime(booking.start_time)} - {booking.end_time && formatTime(booking.end_time)}
            </Text>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
          booking.status === 'confirmed' 
            ? 'bg-green-100 text-green-700 border border-green-200'
            : booking.status === 'unconfirmed'
            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }`}>
          ✅ {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </div>
      </div>

      <Hr className="border-blue-200 my-6" />

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Student */}
        {member && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Text className="text-blue-600 font-bold m-0 text-lg">👨‍🎓</Text>
              </div>
              <div>
                <Text className="text-xs font-medium text-gray-500 m-0 uppercase tracking-wide">
                  Student
                </Text>
                <Text className="text-base font-semibold text-gray-900 m-0">
                  {member.first_name} {member.last_name}
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* Aircraft */}
        {aircraft && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Text className="text-indigo-600 font-bold m-0 text-lg">✈️</Text>
              </div>
              <div>
                <Text className="text-xs font-medium text-gray-500 m-0 uppercase tracking-wide">
                  Aircraft
                </Text>
                <Text className="text-base font-semibold text-gray-900 m-0">
                  {aircraft.registration}
                </Text>
                <Text className="text-sm text-gray-600 m-0">
                  {aircraft.type}
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* Instructor */}
        {instructor && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Text className="text-green-600 font-bold m-0 text-lg">👨‍✈️</Text>
              </div>
              <div>
                <Text className="text-xs font-medium text-gray-500 m-0 uppercase tracking-wide">
                  Instructor
                </Text>
                <Text className="text-base font-semibold text-gray-900 m-0">
                  {instructor.name}
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* Flight Type */}
        {flightType && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Text className="text-purple-600 font-bold m-0 text-lg">🎯</Text>
              </div>
              <div>
                <Text className="text-xs font-medium text-gray-500 m-0 uppercase tracking-wide">
                  Flight Type
                </Text>
                <Text className="text-base font-semibold text-gray-900 m-0">
                  {flightType.name}
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* Lesson */}
        {lesson && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm col-span-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Text className="text-orange-600 font-bold m-0 text-lg">📚</Text>
              </div>
              <div>
                <Text className="text-xs font-medium text-gray-500 m-0 uppercase tracking-wide">
                  Lesson Topic
                </Text>
                <Text className="text-base font-semibold text-gray-900 m-0">
                  {lesson.name}
                </Text>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
