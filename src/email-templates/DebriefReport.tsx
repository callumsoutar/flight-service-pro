import { Text, Button, Hr } from '@react-email/components';
import EmailLayout from './components/EmailLayout';
import { format, parseISO } from 'date-fns';

interface DebriefReportProps {
  booking: any;
  lessonProgress: any;
  lesson?: any;
  flightExperiences?: any[];
  dashboardUrl?: string;
}

export default function DebriefReport({
  booking,
  lessonProgress,
  lesson,
  dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com',
}: DebriefReportProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'not yet competent':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    }
  };

  const instructorName = lessonProgress.instructor?.user
    ? `${lessonProgress.instructor.user.first_name ?? ''} ${lessonProgress.instructor.user.last_name ?? ''}`.trim() ||
      lessonProgress.instructor.user.email
    : 'Not assigned';

  return (
    <EmailLayout title="Flight Debrief Report - Aero Safety Flight School">
      {/* Header */}
      <div className="text-center mb-6">
        <Text className="text-2xl font-bold text-blue-700 m-0 mb-2">
          ✈️ Flight Debrief Report
        </Text>
        <Text className="text-sm text-gray-600 m-0">
          Hi {booking.user?.first_name}, here's your personalized flight debrief from today's lesson.
        </Text>
      </div>

      {/* Flight Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-100">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Text className="text-gray-800 font-semibold m-0 text-sm mb-1">
              {lessonProgress.date
                ? format(parseISO(lessonProgress.date), 'd MMM yyyy')
                : format(parseISO(booking.start_time), 'd MMM yyyy')}
            </Text>
            <Text className="text-gray-600 m-0 text-xs">
              Aircraft: {booking.flight_logs?.[0]?.checked_out_aircraft?.registration || '—'}
              {booking.flight_logs?.[0]?.checked_out_aircraft?.type &&
                ` (${booking.flight_logs[0].checked_out_aircraft.type})`}
            </Text>
            {lesson && (
              <Text className="text-gray-600 m-0 text-xs mt-1">
                Lesson: {lesson.name}
              </Text>
            )}
          </div>
          {lessonProgress.status && (
            <div
              className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                lessonProgress.status,
              )}`}
            >
              {lessonProgress.status.charAt(0).toUpperCase() + lessonProgress.status.slice(1)}
            </div>
          )}
        </div>
      </div>

      {/* Student & Instructor */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-100">
          <Text className="text-xs font-medium text-blue-600 m-0 uppercase mb-1">Student</Text>
          <Text className="text-sm font-semibold text-gray-900 m-0">
            👨‍🎓 {booking.user?.first_name} {booking.user?.last_name}
          </Text>
        </div>
        <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-100">
          <Text className="text-xs font-medium text-green-600 m-0 uppercase mb-1">Instructor</Text>
          <Text className="text-sm font-semibold text-gray-900 m-0">👨‍✈️ {instructorName}</Text>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-5">
        {/* Instructor Comments */}
        <div className="mb-4">
          <Text className="text-base font-bold text-gray-900 mb-2">💬 Instructor Comments</Text>
          <div className="bg-gray-50 rounded p-3 border border-gray-100">
            {lessonProgress.instructor_comments ? (
              <div 
                style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5', margin: 0 }}
                dangerouslySetInnerHTML={{ __html: lessonProgress.instructor_comments }}
              />
            ) : (
              <Text className="text-gray-800 text-sm m-0">
                No instructor comments recorded.
              </Text>
            )}
          </div>
        </div>

        {/* Lesson Assessment Grid */}
        <div>
          <Text className="text-base font-bold text-gray-900 mb-3">✅ Lesson Assessment</Text>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: '⭐', title: 'Highlights', text: lessonProgress.lesson_highlights, bg: 'bg-yellow-50', border: 'border-yellow-100' },
              { icon: '🧭', title: 'Airmanship', text: lessonProgress.airmanship, bg: 'bg-blue-50', border: 'border-blue-100' },
              { icon: '📈', title: 'Strengths', text: lessonProgress.focus_next_lesson, bg: 'bg-green-50', border: 'border-green-100' },
              { icon: '🎯', title: 'Areas for Improvement', text: lessonProgress.areas_for_improvement, bg: 'bg-red-50', border: 'border-red-100' },
            ].map((item, idx) => (
              <div key={idx} className={`${item.bg} ${item.border} rounded p-3 border`}>
                <div className="flex items-center gap-2 mb-1">
                  <Text className="m-0 text-sm">{item.icon}</Text>
                  <Text className="text-xs font-semibold text-gray-700 m-0 uppercase">{item.title}</Text>
                </div>
                <Text className="text-gray-800 text-xs whitespace-pre-line m-0">
                  {item.text || `No ${item.title.toLowerCase()} recorded.`}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-5">
        <Text className="text-base font-bold text-gray-900 mb-2">➡️ Next Steps</Text>
        <Text className="text-gray-800 text-sm whitespace-pre-line m-0">
          {lessonProgress.focus_next_lesson || 'No next steps recorded.'}
        </Text>
      </div>

      {/* Action Button */}
      <div className="text-center">
        <Button
          href={`${dashboardUrl}/dashboard/bookings/debrief/view/${booking.id}`}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-sm shadow-md"
        >
          View Full Debrief Report
        </Button>
        <Text className="text-gray-600 text-xs m-0 mt-3">
          Questions about your debrief? Contact your instructor or give us a call.
        </Text>
      </div>
    </EmailLayout>
  );
}
