import { Text, Button } from '@react-email/components';
import EmailLayout from './components/EmailLayout';
import { format, parseISO } from 'date-fns';

interface DebriefReportProps {
  booking: {
    id?: string;
    user?: { first_name?: string; last_name?: string };
    start_time?: string;
    aircraft?: { registration?: string };
  };
  lessonProgress: {
    instructor?: {
      user?: {
        first_name?: string;
        last_name?: string;
        email?: string;
      };
    };
    completed_date?: string;
    flight_time?: number;
    remarks?: string;
    status?: string;
    instructor_comments?: string;
    lesson_highlights?: string;
    airmanship?: string;
    focus_next_lesson?: string;
    areas_for_improvement?: string;
  };
  lesson?: {
    name?: string;
  } | null;
  flightExperiences?: unknown[];
  dashboardUrl?: string;
  schoolName?: string;
  contactEmail?: string;
  contactPhone?: string;
  tagline?: string;
}

export default function DebriefReport({
  booking,
  lessonProgress,
  lesson,
  dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com',
  schoolName,
  contactEmail,
  contactPhone,
  tagline,
}: DebriefReportProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pass':
        return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
      case 'not yet competent':
        return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      default:
        return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
    }
  };

  const instructorName = lessonProgress.instructor?.user
    ? `${lessonProgress.instructor.user.first_name ?? ''} ${lessonProgress.instructor.user.last_name ?? ''}`.trim() ||
      lessonProgress.instructor.user.email
    : 'Not assigned';

  const statusStyles = getStatusColor(lessonProgress.status || '');

  return (
    <EmailLayout
      title={`Flight Debrief Report - ${schoolName || 'Flight Desk Pro'}`}
      schoolName={schoolName}
      contactEmail={contactEmail}
      contactPhone={contactPhone}
      tagline={tagline}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Text style={{ margin: '0 0 12px 0', fontSize: '32px', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
          ✈️ Flight Debrief Report
        </Text>
        <Text style={{ margin: 0, fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
          Hi {booking.user?.first_name}, here&apos;s your personalized flight debrief from today&apos;s lesson.
        </Text>
      </div>

      {/* Flight Summary Card */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <Text style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
              {lessonProgress.completed_date
                ? format(parseISO(lessonProgress.completed_date), 'd MMM yyyy')
                : booking.start_time ? format(parseISO(booking.start_time), 'd MMM yyyy') : 'N/A'}
            </Text>
            <Text style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280' }}>
              Aircraft: {booking.aircraft?.registration || '—'}
            </Text>
            {lesson && (
              <Text style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                Lesson: {lesson.name}
              </Text>
            )}
          </div>
          {lessonProgress.status && (
            <div style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              ...statusStyles
            }}>
              {lessonProgress.status.charAt(0).toUpperCase() + lessonProgress.status.slice(1)}
            </div>
          )}
        </div>
      </div>

      {/* Student & Instructor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div>
          <Text style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
            👨‍🎓 Student
          </Text>
          <Text style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
            {booking.user?.first_name} {booking.user?.last_name}
          </Text>
        </div>
        <div>
          <Text style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
            👨‍✈️ Instructor
          </Text>
          <Text style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
            {instructorName}
          </Text>
        </div>
      </div>

      {/* Instructor Comments */}
      <div style={{ marginBottom: '20px' }}>
        <Text style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
          💬 Instructor Comments
        </Text>
        <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          {lessonProgress.instructor_comments ? (
            <div
              style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5', margin: 0 }}
              dangerouslySetInnerHTML={{ __html: lessonProgress.instructor_comments }}
            />
          ) : (
            <Text style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              No instructor comments recorded.
            </Text>
          )}
        </div>
      </div>

      {/* Lesson Assessment */}
      <div style={{ marginBottom: '20px' }}>
        <Text style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
          ✅ Lesson Assessment
        </Text>
        <div>
          {[
            { icon: '⭐', title: 'Highlights', text: lessonProgress.lesson_highlights, bg: '#fef3c7', border: '#fcd34d' },
            { icon: '🧭', title: 'Airmanship', text: lessonProgress.airmanship, bg: '#dbeafe', border: '#93c5fd' },
            { icon: '📈', title: 'Strengths', text: lessonProgress.focus_next_lesson, bg: '#dcfce7', border: '#86efac' },
            { icon: '🎯', title: 'Areas for Improvement', text: lessonProgress.areas_for_improvement, bg: '#fee2e2', border: '#fca5a5' },
          ].map((item, idx) => (
            <div key={idx} style={{ backgroundColor: item.bg, border: `1px solid ${item.border}`, borderRadius: '8px', padding: '12px', marginBottom: idx < 3 ? '8px' : '0' }}>
              <Text style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase' }}>
                {item.icon} {item.title}
              </Text>
              <Text style={{ margin: 0, fontSize: '14px', color: '#111827', whiteSpace: 'pre-line' }}>
                {item.text || `No ${item.title.toLowerCase()} recorded.`}
              </Text>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div style={{ backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
        <Text style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
          ➡️ Next Steps
        </Text>
        <Text style={{ margin: 0, fontSize: '14px', color: '#374151', whiteSpace: 'pre-line' }}>
          {lessonProgress.focus_next_lesson || 'No next steps recorded.'}
        </Text>
      </div>

      {/* Action Button */}
      <div style={{ textAlign: 'center' }}>
        <Button
          href={`${dashboardUrl}/dashboard/bookings/debrief/view/${booking.id}`}
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
          View Full Debrief Report
        </Button>
        <Text style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
          Questions about your debrief? Contact your instructor or give us a call.
        </Text>
      </div>
    </EmailLayout>
  );
}
