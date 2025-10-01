import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Observation } from '@/types/observations';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddObservationModal } from './AddObservationModal';
import { ViewObservationModal } from './ViewObservationModal';
import { ResolveObservationModal } from './ResolveObservationModal';

interface ObservationsTableProps {
  aircraftId: string;
}

const priorityColor: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const stageColor: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  investigation: 'bg-orange-100 text-orange-800',
  resolution: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-200 text-gray-700',
};

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export function ObservationsTable({ aircraftId }: ObservationsTableProps) {
  const [view, setView] = useState<'open' | 'all'>('open');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);
  const [resolveObservationId, setResolveObservationId] = useState<string | null>(null);
  const { data: observations, isLoading, isError, refetch } = useQuery<Observation[]>({
    queryKey: ['observations', aircraftId],
    queryFn: async () => {
      const res = await fetch(`/api/observations?aircraft_id=${aircraftId}`);
      if (!res.ok) throw new Error('Failed to fetch observations');
      return res.json();
    },
  });

  // Fetch users for the displayed observations
  const userIds = React.useMemo(() =>
    observations ? Array.from(new Set(observations.map(o => o.reported_by))) : [],
    [observations]
  );

  // Fetch users and build a userMap (Record<string, string>)
  const { data: userMap } = useQuery<Record<string, string>>({
    queryKey: ['users', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const params = userIds.map(id => `id=${id}`).join('&');
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const result = await res.json();
      const users: User[] = result.users || [];
      const map: Record<string, string> = {};
      users.forEach(u => {
        map[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown';
      });
      return map;
    },
  });

  const getUserName = (userId: string) => {
    if (!userMap) return 'Unknown';
    return userMap[userId] || 'Unknown';
  };

  if (isLoading) {
    return <Skeleton className="w-full h-32" />;
  }
  if (isError) {
    return <div className="text-red-600">Failed to load observations.</div>;
  }

  // Filter observations based on view
  const filteredObservations = observations && observations.length > 0
    ? (view === 'open'
        ? observations.filter(o => o.stage !== 'closed')
        : observations)
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Tabs value={view} onValueChange={v => setView(v as 'open' | 'all')}>
          <TabsList>
            <TabsTrigger value="open">Open Observations</TabsTrigger>
            <TabsTrigger value="all">All Observations</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow text-base flex items-center gap-2"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="w-4 h-4" /> Add Observation
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created at</TableHead>
            <TableHead>Reported By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredObservations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                {!observations || observations.length === 0
                  ? "No observations found for this aircraft."
                  : view === 'open'
                    ? "No open observations"
                    : "No observations"}
              </TableCell>
            </TableRow>
          ) : (
            filteredObservations.map((obs) => (
              <TableRow key={obs.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{obs.name}</TableCell>
                <TableCell>
                  <Badge className={stageColor[obs.stage] || ''} variant="outline">{obs.stage}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={priorityColor[obs.priority || 'medium'] || ''} variant="outline">{obs.priority || 'medium'}</Badge>
                </TableCell>
                <TableCell>{format(new Date(obs.created_at), 'dd MMM yyyy · HH:mm')}</TableCell>
                <TableCell>{getUserName(obs.reported_by)}</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setResolveObservationId(obs.id)}>Resolve</Button>
                  <Button size="sm" onClick={() => setSelectedObservationId(obs.id)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <AddObservationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aircraftId={aircraftId}
        refresh={refetch}
      />
      {selectedObservationId && (
        <ViewObservationModal
          open={!!selectedObservationId}
          onClose={() => setSelectedObservationId(null)}
          observationId={selectedObservationId}
        />
      )}
      {resolveObservationId && (
        <ResolveObservationModal
          open={!!resolveObservationId}
          onClose={() => setResolveObservationId(null)}
          observationId={resolveObservationId}
          refresh={refetch}
        />
      )}
    </div>
  );
}

export default ObservationsTable; 