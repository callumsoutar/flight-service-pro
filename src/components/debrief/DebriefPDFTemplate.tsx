import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Booking } from "@/types/bookings";
import type { User as UserType } from "@/types/users";
import type { Aircraft } from "@/types/aircraft";
import type { Lesson } from "@/types/lessons";
import type { LessonProgress } from "@/types/lesson_progress";
import type { FlightExperience } from "@/types/flight_experience";
import type { ExperienceType } from "@/types/experience_types";

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1e40af',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  infoCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  flightDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  flightDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  flightDetailLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
  },
  flightDetailValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusPass: {
    backgroundColor: '#16a34a',
  },
  statusNotCompetent: {
    backgroundColor: '#dc2626',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  content: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#374151',
  },
  assessmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  assessmentItem: {
    width: '48%',
    marginBottom: 12,
  },
  assessmentLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  assessmentContent: {
    fontSize: 9,
    lineHeight: 1.5,
    color: '#6b7280',
  },
  experienceTable: {
    marginTop: 8,
  },
  experienceRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  experienceHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
    fontSize: 8,
  },
  experienceCell: {
    fontSize: 9,
  },
  experienceType: {
    flex: 2,
  },
  experienceDuration: {
    flex: 1,
    textAlign: 'right',
  },
  experienceNotes: {
    flex: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
});

// Define types
interface BookingWithJoins extends Booking {
  user?: UserType;
  instructor?: UserType;
  lesson?: Lesson;
  aircraft?: Aircraft;
}

interface LessonProgressWithInstructor extends LessonProgress {
  instructor?: {
    id: string;
    user?: {
      id: string;
      first_name?: string;
      last_name?: string;
      email?: string;
    };
  };
}

interface DebriefPDFTemplateProps {
  booking: BookingWithJoins;
  lessonProgress: LessonProgressWithInstructor | null;
  lesson: Lesson | null;
  flightExperiences: FlightExperience[];
  experienceTypes: ExperienceType[];
}

export default function DebriefPDFTemplate({
  booking,
  lessonProgress,
  lesson,
  flightExperiences,
  experienceTypes,
}: DebriefPDFTemplateProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getExperienceTypeName = (typeId: string) => {
    const type = experienceTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown';
  };

  // Strip HTML tags and decode HTML entities for PDF display
  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';

    // First, replace <br> and <p> tags with newlines before stripping all tags
    let text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p>/gi, '');

    // Remove all other HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");

    // Remove extra whitespace and trim
    text = text.replace(/\n\s*\n/g, '\n\n').trim();

    return text;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Flight Debrief Report</Text>

          {/* Student and Instructor Info */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>STUDENT PILOT</Text>
              <Text style={styles.infoValue}>
                {booking.user?.first_name} {booking.user?.last_name}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>FLIGHT INSTRUCTOR</Text>
              <Text style={styles.infoValue}>
                {lessonProgress?.instructor?.user
                  ? `${lessonProgress.instructor.user.first_name ?? ''} ${lessonProgress.instructor.user.last_name ?? ''}`.trim() || lessonProgress.instructor.user.email
                  : 'Not assigned'}
              </Text>
            </View>
          </View>

          {/* Flight Details */}
          <View style={styles.flightDetailsGrid}>
            <View style={styles.flightDetailItem}>
              <Text style={styles.flightDetailLabel}>Date</Text>
              <Text style={styles.flightDetailValue}>
                {formatDate(lessonProgress?.date)}
              </Text>
            </View>
            <View style={styles.flightDetailItem}>
              <Text style={styles.flightDetailLabel}>Aircraft</Text>
              <Text style={styles.flightDetailValue}>
                {booking.flight_logs?.[0]?.checked_out_aircraft
                  ? booking.flight_logs[0].checked_out_aircraft.registration
                  : '—'}
              </Text>
            </View>
            <View style={styles.flightDetailItem}>
              <Text style={styles.flightDetailLabel}>Flight Time</Text>
              <Text style={styles.flightDetailValue}>
                {booking.flight_logs?.[0]?.flight_time != null
                  ? `${booking.flight_logs[0].flight_time}h`
                  : '—'}
              </Text>
            </View>
            <View style={styles.flightDetailItem}>
              <Text style={styles.flightDetailLabel}>Lesson</Text>
              <Text style={styles.flightDetailValue}>{lesson?.name || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Instructor Comments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Instructor Comments</Text>
          </View>
          {lessonProgress?.status && (
            <View
              style={[
                styles.statusBadge,
                lessonProgress.status === 'pass' ? styles.statusPass : styles.statusNotCompetent,
              ]}
            >
              <Text style={styles.statusText}>
                {lessonProgress.status === 'pass' ? 'PASS' : 'NOT YET COMPETENT'}
              </Text>
            </View>
          )}
          <Text style={[styles.content, { marginTop: 8 }]}>
            {stripHtml(lessonProgress?.instructor_comments) || 'No comments provided.'}
          </Text>
        </View>

        {/* Lesson Assessment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lesson Assessment</Text>
          </View>
          <View style={styles.assessmentGrid}>
            <View style={styles.assessmentItem}>
              <Text style={styles.assessmentLabel}>Lesson Highlights</Text>
              <Text style={styles.assessmentContent}>
                {lessonProgress?.lesson_highlights || 'No highlights recorded.'}
              </Text>
            </View>
            <View style={styles.assessmentItem}>
              <Text style={styles.assessmentLabel}>General Airmanship</Text>
              <Text style={styles.assessmentContent}>
                {lessonProgress?.airmanship || 'No airmanship notes recorded.'}
              </Text>
            </View>
            <View style={styles.assessmentItem}>
              <Text style={styles.assessmentLabel}>Student Strengths</Text>
              <Text style={styles.assessmentContent}>
                {lessonProgress?.focus_next_lesson || 'No strengths recorded.'}
              </Text>
            </View>
            <View style={styles.assessmentItem}>
              <Text style={styles.assessmentLabel}>Areas for Improvement</Text>
              <Text style={styles.assessmentContent}>
                {lessonProgress?.areas_for_improvement || 'No areas for improvement recorded.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Flight Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flight Details</Text>
          </View>
          <View style={styles.assessmentGrid}>
            <View style={styles.assessmentItem}>
              <Text style={styles.assessmentLabel}>Weather Conditions</Text>
              <Text style={styles.assessmentContent}>
                {lessonProgress?.weather_conditions || 'No weather conditions recorded.'}
              </Text>
            </View>
            <View style={styles.assessmentItem}>
              <Text style={styles.assessmentLabel}>Safety Observations</Text>
              <Text style={styles.assessmentContent}>
                {lessonProgress?.safety_concerns || 'No safety observations recorded.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Next Steps</Text>
          </View>
          <Text style={styles.content}>
            {lessonProgress?.focus_next_lesson || 'No next steps recorded.'}
          </Text>
        </View>

        {/* Flight Experience */}
        {flightExperiences.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Flight Experience</Text>
            </View>
            <View style={styles.experienceTable}>
              <View style={[styles.experienceRow, styles.experienceHeader]}>
                <Text style={[styles.experienceCell, styles.experienceType]}>Type</Text>
                <Text style={[styles.experienceCell, styles.experienceDuration]}>Duration</Text>
                <Text style={[styles.experienceCell, styles.experienceNotes]}>Notes</Text>
              </View>
              {flightExperiences.map((exp) => (
                <View key={exp.id} style={styles.experienceRow}>
                  <Text style={[styles.experienceCell, styles.experienceType]}>
                    {getExperienceTypeName(exp.experience_type_id)}
                  </Text>
                  <Text style={[styles.experienceCell, styles.experienceDuration]}>
                    {exp.duration_hours}h
                  </Text>
                  <Text style={[styles.experienceCell, styles.experienceNotes]}>
                    {exp.notes || '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated on {new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })} at {new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text style={{ marginTop: 4 }}>Flight Desk Pro - Flight Training Management System</Text>
        </View>
      </Page>
    </Document>
  );
}
