'use client';
import { useState } from 'react';
import BookingsClientView from '@/components/bookings/BookingsClientView';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, AlertCircle, Send } from 'lucide-react';
import { NewBookingModal } from '@/components/bookings/NewBookingModal';
import type { Booking } from '@/types/bookings';
import { SettingsProvider } from '@/contexts/SettingsContext';

interface MemberOption { id: string; name: string; }
interface InstructorOption { id: string; name: string; }
interface AircraftOption { id: string; registration: string; type: string; }

interface BookingsPageClientProps {
  bookings: Booking[];
  members: MemberOption[];
  instructors: InstructorOption[];
  aircraftList: AircraftOption[];
  userRole: string;
}

function getStatusCounts(bookings: Booking[]) {
  const counts = { total: bookings.length, today: 0, unconfirmed: 0, confirmed: 0, flying: 0 };
  const todayStr = new Date().toISOString().slice(0, 10);
  for (const b of bookings) {
    if (b.start_time.slice(0, 10) === todayStr) counts.today++;
    if (b.status === 'unconfirmed') counts.unconfirmed++;
    if (b.status === 'confirmed') counts.confirmed++;
    if (b.status === 'flying') counts.flying++;
  }
  return counts;
}

export default function BookingsPageClient({ bookings, members, instructors, aircraftList, userRole }: BookingsPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const statusCounts = getStatusCounts(bookings);

  return (
    <SettingsProvider>
      <main className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-2">Manage and track all your flight bookings</p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow text-base flex items-center gap-2"
          onClick={() => setModalOpen(true)}
        >
          <Send className="w-5 h-5" /> New Booking
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><CalendarDays className="w-6 h-6 text-indigo-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Total</h3>
          <p className="text-3xl font-bold text-indigo-600">{statusCounts.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><Clock className="w-6 h-6 text-green-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Today</h3>
          <p className="text-3xl font-bold text-green-600">{statusCounts.today}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><AlertCircle className="w-6 h-6 text-yellow-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Unconfirmed</h3>
          <p className="text-3xl font-bold text-yellow-600">{statusCounts.unconfirmed}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <span className="mb-2"><Send className="w-6 h-6 text-blue-600" /></span>
          <h3 className="text-zinc-600 font-medium mb-2">Flying</h3>
          <p className="text-3xl font-bold text-blue-600">{statusCounts.flying}</p>
        </div>
      </div>
      <BookingsClientView bookings={bookings} members={members} instructors={instructors} aircraftList={aircraftList} userRole={userRole} />
      <NewBookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aircraft={aircraftList}
        bookings={bookings}
      />
    </main>
    </SettingsProvider>
  );
} 