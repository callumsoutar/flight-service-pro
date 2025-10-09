import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// Define styles for PDF - Landscape with 50/50 split
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  mainContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  leftHalf: {
    flex: 1,
    paddingRight: 12,
    borderRightWidth: 2,
    borderRightColor: '#d1d5db',
    borderRightStyle: 'dashed',
  },
  rightHalf: {
    flex: 1,
    paddingLeft: 12,
  },

  // Header
  header: {
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8,
    color: '#6b7280',
  },

  // Section
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Detail Rows
  detailRow: {
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 9,
    color: '#111827',
    fontWeight: 'bold',
  },

  // ATIS Grid
  atisSection: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  atisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  atisItem: {
    width: '30%',
  },
  atisLabel: {
    fontSize: 6,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  atisValue: {
    fontSize: 8,
    color: '#111827',
  },

  // Flight Recordings
  recordingsGrid: {
    gap: 8,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  recordingLabel: {
    fontSize: 7,
    color: '#374151',
    textTransform: 'uppercase',
    width: '35%',
    fontWeight: 'bold',
  },
  recordingUnderline: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    paddingBottom: 2,
  },
  recordingValue: {
    fontSize: 9,
    color: '#111827',
  },

  // Time Boxes (for circuits, landings, SAR, SSR)
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 6,
    borderRadius: 2,
  },
  timeLabel: {
    fontSize: 6,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
  },

  // Fuel Table
  fuelTable: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 8,
  },
  fuelHeader: {
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  fuelHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  fuelRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  fuelCell: {
    flex: 1,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  fuelCellLast: {
    flex: 1,
    padding: 4,
  },
  fuelCellText: {
    fontSize: 7,
    color: '#111827',
    textAlign: 'center',
  },

  // Equipment
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 4,
  },
  checkbox: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: '#9ca3af',
    marginRight: 3,
    backgroundColor: '#ffffff',
  },
  equipmentLabel: {
    fontSize: 7,
    color: '#374151',
  },

  // Notes
  notesBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 8,
    minHeight: 50,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  notesText: {
    fontSize: 7,
    color: '#9ca3af',
    lineHeight: 1.3,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 6,
    color: '#9ca3af',
  },
});

interface CheckOutSheetProps {
  booking: {
    aircraft_registration: string;
    member_name: string;
    booking_type: string;
    lease_start_date: string | null;
    lease_end_date: string | null;
    instructor_name?: string | null;
    purpose?: string | null;
  };
  flightLog?: {
    hobbs_start: number | null;
    hobbs_end: number | null;
    tacho_start: number | null;
    tacho_end: number | null;
    flight_time: number | null;
    circuits: number | null;
    landings: number | null;
    sar_time: string | null;
    ssr_code: string | null;
    eta?: string | null;
  };
}

export default function CheckOutSheet({ booking, flightLog }: CheckOutSheetProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-NZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentDate = new Date().toLocaleDateString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.mainContainer}>
          {/* LEFT HALF */}
          <View style={styles.leftHalf}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Flight Check Out Sheet</Text>
              <Text style={styles.subtitle}>Kapiti Aero Club</Text>
            </View>

            {/* Flight Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Flight Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Aircraft</Text>
                <Text style={styles.detailValue}>{booking.aircraft_registration || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Member</Text>
                <Text style={styles.detailValue}>{booking.member_name || 'N/A'}</Text>
              </View>
              {booking.instructor_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Instructor</Text>
                  <Text style={styles.detailValue}>{booking.instructor_name}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booking Type</Text>
                <Text style={styles.detailValue}>{booking.booking_type || 'Flight'}</Text>
              </View>
              {booking.purpose && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Purpose</Text>
                  <Text style={styles.detailValue}>{booking.purpose}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ETA</Text>
                <Text style={styles.detailValue}>
                  {flightLog?.eta ? `${formatDate(flightLog.eta)} ${formatTime(flightLog.eta)}` : '-'}
                </Text>
              </View>
            </View>

            {/* ATIS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Airport Information (ATIS)</Text>
              <View style={styles.atisSection}>
                <View style={styles.atisGrid}>
                  <View style={styles.atisItem}>
                    <Text style={styles.atisLabel}>Runway</Text>
                    <Text style={styles.atisValue}>_______</Text>
                  </View>
                  <View style={styles.atisItem}>
                    <Text style={styles.atisLabel}>Wind</Text>
                    <Text style={styles.atisValue}>_______</Text>
                  </View>
                  <View style={styles.atisItem}>
                    <Text style={styles.atisLabel}>Visibility</Text>
                    <Text style={styles.atisValue}>_______</Text>
                  </View>
                  <View style={styles.atisItem}>
                    <Text style={styles.atisLabel}>Cloud</Text>
                    <Text style={styles.atisValue}>_______</Text>
                  </View>
                  <View style={styles.atisItem}>
                    <Text style={styles.atisLabel}>Temp/DP</Text>
                    <Text style={styles.atisValue}>_______</Text>
                  </View>
                  <View style={styles.atisItem}>
                    <Text style={styles.atisLabel}>QNH</Text>
                    <Text style={styles.atisValue}>_______</Text>
                  </View>
                  <View style={styles.atisItem}>
                    <Text style={styles.atisLabel}>2000FT Wind</Text>
                    <Text style={styles.atisValue}>_______</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Flight Recordings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Flight Recordings</Text>
              <View style={styles.recordingsGrid}>
                <View style={styles.recordingRow}>
                  <Text style={styles.recordingLabel}>Hobbs Start:</Text>
                  <View style={styles.recordingUnderline}>
                    <Text style={styles.recordingValue}>{flightLog?.hobbs_start?.toFixed(1) || ''}</Text>
                  </View>
                </View>
                <View style={styles.recordingRow}>
                  <Text style={styles.recordingLabel}>Hobbs End:</Text>
                  <View style={styles.recordingUnderline}>
                    <Text style={styles.recordingValue}>{flightLog?.hobbs_end?.toFixed(1) || ''}</Text>
                  </View>
                </View>
                <View style={styles.recordingRow}>
                  <Text style={styles.recordingLabel}>Tacho Start:</Text>
                  <View style={styles.recordingUnderline}>
                    <Text style={styles.recordingValue}>{flightLog?.tacho_start?.toFixed(1) || ''}</Text>
                  </View>
                </View>
                <View style={styles.recordingRow}>
                  <Text style={styles.recordingLabel}>Tacho End:</Text>
                  <View style={styles.recordingUnderline}>
                    <Text style={styles.recordingValue}>{flightLog?.tacho_end?.toFixed(1) || ''}</Text>
                  </View>
                </View>
                <View style={styles.recordingRow}>
                  <Text style={styles.recordingLabel}>Flight Time:</Text>
                  <View style={styles.recordingUnderline}>
                    <Text style={styles.recordingValue}>{flightLog?.flight_time?.toFixed(1) ? `${flightLog.flight_time.toFixed(1)} hrs` : ''}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Additional Flight Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Flight Information</Text>
              <View style={styles.timesGrid}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Circuits</Text>
                  <Text style={styles.timeValue}>{flightLog?.circuits || '-'}</Text>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Landings (F/S)</Text>
                  <Text style={styles.timeValue}>{flightLog?.landings || '-'}</Text>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>SAR Time (UTC)</Text>
                  <Text style={styles.timeValue}>{flightLog?.sar_time || '-'}</Text>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>SSR Code</Text>
                  <Text style={styles.timeValue}>{flightLog?.ssr_code || '-'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* RIGHT HALF */}
          <View style={styles.rightHalf}>
            {/* Fuel Log */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fuel Log</Text>
              <View style={styles.fuelTable}>
                <View style={styles.fuelHeader}>
                  <Text style={styles.fuelHeaderText}>Left Tank</Text>
                </View>
                <View style={styles.fuelRow}>
                  <View style={styles.fuelCell}>
                    <Text style={styles.fuelCellText}>Time</Text>
                  </View>
                  <View style={styles.fuelCellLast}>
                    <Text style={styles.fuelCellText}>Fuel (L)</Text>
                  </View>
                </View>
                {[1, 2, 3].map((i) => (
                  <View key={`left-${i}`} style={styles.fuelRow}>
                    <View style={styles.fuelCell}>
                      <Text style={styles.fuelCellText}>_____</Text>
                    </View>
                    <View style={styles.fuelCellLast}>
                      <Text style={styles.fuelCellText}>_____</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.fuelTable}>
                <View style={styles.fuelHeader}>
                  <Text style={styles.fuelHeaderText}>Right Tank</Text>
                </View>
                <View style={styles.fuelRow}>
                  <View style={styles.fuelCell}>
                    <Text style={styles.fuelCellText}>Time</Text>
                  </View>
                  <View style={styles.fuelCellLast}>
                    <Text style={styles.fuelCellText}>Fuel (L)</Text>
                  </View>
                </View>
                {[1, 2, 3].map((i) => (
                  <View key={`right-${i}`} style={styles.fuelRow}>
                    <View style={styles.fuelCell}>
                      <Text style={styles.fuelCellText}>_____</Text>
                    </View>
                    <View style={styles.fuelCellLast}>
                      <Text style={styles.fuelCellText}>_____</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Equipment Check */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipment (Taken / Returned)</Text>
              <View style={styles.equipmentGrid}>
                {['Life Jackets', 'Headsets', 'Pickets', 'Maps', 'AIP', 'Cushions'].map((item) => (
                  <View key={item} style={styles.equipmentItem}>
                    <View style={styles.checkbox} />
                    <View style={styles.checkbox} />
                    <Text style={styles.equipmentLabel}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Other Charges */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Other Charges</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>Enter other items to be charged...</Text>
              </View>
            </View>

            {/* Defects & Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Defects & Notes</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>
                  Please note anything about the aircraft that needs attention...
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Kapiti Aero Club - Flight Check Out Sheet</Text>
          <Text style={styles.footerText}>Printed: {currentDate}</Text>
        </View>
      </Page>
    </Document>
  );
}
