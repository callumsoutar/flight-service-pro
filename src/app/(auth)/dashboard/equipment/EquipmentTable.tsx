"use client";
import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Equipment } from '@/types/equipment';
import type { EquipmentType } from '@/types/equipment';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, LogIn, LogOut, StickyNote, FileText, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useOrgContext } from "@/components/OrgContextProvider";
import { IssueEquipmentModal } from "@/components/equipment/IssueEquipmentModal";
import { UpdateEquipmentModal } from "@/components/equipment/UpdateEquipmentModal";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isBefore, isToday, parseISO } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddEquipmentModal } from "@/components/equipment/AddEquipmentModal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { EquipmentIssuance } from '@/types/equipment';
import type { UserResult } from '@/components/invoices/MemberSelect';

interface EquipmentTableProps {
  equipment: Equipment[];
}

const EQUIPMENT_TYPE_OPTIONS: { value: EquipmentType; label: string }[] = [
  { value: 'AIP', label: 'AIP' },
  { value: 'Stationery', label: 'Stationery' },
  { value: 'Headset', label: 'Headset' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Maps', label: 'Maps' },
  { value: 'Radio', label: 'Radio' },
  { value: 'Transponder', label: 'Transponder' },
  { value: 'ELT', label: 'ELT' },
  { value: 'Lifejacket', label: 'Lifejacket' },
  { value: 'FirstAidKit', label: 'First Aid Kit' },
  { value: 'FireExtinguisher', label: 'Fire Extinguisher' },
  { value: 'Other', label: 'Other' },
];

export default function EquipmentTable({ equipment }: EquipmentTableProps) {
  // Use state for equipment list so we can update it on add
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(Array.isArray(equipment) ? equipment : []);

  // Tabs state
  const [tab, setTab] = useState<string>('all');

  // State for open issuances (map by equipment_id)
  const [openIssuanceByEquipmentId, setOpenIssuanceByEquipmentId] = useState<Record<string, EquipmentIssuance>>({});
  const [loadingOpenIssuances, setLoadingOpenIssuances] = useState(false);
  const [issuedUsers, setIssuedUsers] = useState<Record<string, UserResult>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch all open issuances for the org on mount
  useEffect(() => {
    setLoadingOpenIssuances(true);
    fetch('/api/equipment_issuance?open_only=true')
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data.issuances) ? data.issuances : [];
        const map: Record<string, EquipmentIssuance> = {};
        arr.forEach((i: EquipmentIssuance) => { map[i.equipment_id] = i; });
        setOpenIssuanceByEquipmentId(map);
      })
      .finally(() => setLoadingOpenIssuances(false));
  }, []);

  // Fetch users for issued_to when openIssuanceByEquipmentId changes
  useEffect(() => {
    const userIds = Array.from(new Set(Object.values(openIssuanceByEquipmentId).map(i => i.issued_to)));
    if (userIds.length === 0) return;
    setLoadingUsers(true);
    fetch(`/api/users?ids=${userIds.join(',')}`)
      .then(res => res.json())
      .then(data => {
        const usersArr = Array.isArray(data.users) ? data.users : [];
        const userMap: Record<string, UserResult> = {};
        usersArr.forEach((u: UserResult) => { userMap[u.id] = u; });
        setIssuedUsers(userMap);
      })
      .finally(() => setLoadingUsers(false));
  }, [openIssuanceByEquipmentId]);

  // Dropdown filter state
  const [selectedType, setSelectedType] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Filtering logic based on tab
  const filteredEquipment = React.useMemo(() => {
    if (tab === 'issued') {
      // Only show equipment with an open issuance
      return equipmentList.filter(e => openIssuanceByEquipmentId[e.id]);
    }
    // For 'overdue' and 'all', filter with correct 'e' param
    return equipmentList.filter(e => {
      let matchesTab = true;
      if (tab === 'overdue') {
        const issuance = openIssuanceByEquipmentId[e.id];
        const expectedReturn = issuance?.expected_return_date as string | null | undefined;
        if (!issuance) matchesTab = false;
        else if (expectedReturn) {
          const today = new Date();
          const due = new Date(expectedReturn);
          matchesTab = due < today;
        } else {
          matchesTab = false;
        }
      }
      const matchesType = selectedType === 'All' || e.type === selectedType;
      const q = search.toLowerCase();
      const matchesSearch =
        e.name.toLowerCase().includes(q) ||
        (e.serial_number?.toLowerCase().includes(q) ?? false) ||
        (e.type?.toLowerCase().includes(q) ?? false);
      return matchesTab && matchesType && (!search || matchesSearch);
    });
  }, [tab, openIssuanceByEquipmentId, equipmentList, selectedType, search]);

  // Modal state
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [modalType, setModalType] = useState<null | "issue" | "return" | "note" | "history" | "edit">(null);

  const { currentOrgId } = useOrgContext();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const router = useRouter();

  // Helper: get status badge color
  function statusColor(status: string) {
    switch (status?.toLowerCase()) {
      case "available": return "bg-green-100 text-green-800";
      case "issued": return "bg-blue-100 text-blue-800";
      case "lost":
      case "stolen":
      case "damaged": return "bg-red-100 text-red-800";
      case "audited": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  // Helper: get issued to
  function getIssuedTo(item: Equipment) {
    const issuance = openIssuanceByEquipmentId[item.id];
    if (issuance) {
      const user = issuedUsers[issuance.issued_to];
      if (user) {
        return user.first_name || user.last_name
          ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
          : user.email;
      }
      return loadingUsers ? 'Loading...' : 'Unknown';
    }
    return '—';
  }

  // Helper: get expected return
  function getExpectedReturn(item: Equipment) {
    const issuance = openIssuanceByEquipmentId[item.id];
    const expectedReturn = issuance?.expected_return_date ?? null;
    if (expectedReturn) {
      const dateObj = parseISO(expectedReturn);
      const isLate = isToday(dateObj) || isBefore(dateObj, new Date());
      return (
        <span className={isLate ? 'text-red-600 font-semibold' : ''}>
          {format(dateObj, 'yyyy-MM-dd')}
        </span>
      );
    }
    return <span className="text-gray-400">—</span>;
  }

  function ReturnEquipmentModal({ open, onClose, equipment, issuance, member, issuedBy, refreshIssuances }: {
    open: boolean;
    onClose: () => void;
    equipment: Equipment;
    issuance: EquipmentIssuance;
    member: UserResult | undefined;
    issuedBy: UserResult | undefined;
    refreshIssuances: () => void;
  }) {
    const [returnDate, setReturnDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setLoading(true);
      setError(null);
      const payload = {
        id: issuance.id,
        returned_at: returnDate.toISOString().slice(0, 10),
      };
      const res = await fetch('/api/equipment_issuance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        refreshIssuances();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to return equipment');
      }
      setLoading(false);
    }

    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-0 w-full max-w-md shadow-xl border border-gray-100">
          <div className="px-8 pt-8 pb-4">
            <h3 className="text-2xl font-bold text-center mb-6">Return Equipment</h3>
            <div className="bg-muted rounded-xl p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs font-medium">Equipment</span>
                  <span className="font-semibold">
                    {equipment.name}
                    {equipment.serial_number && (
                      <span className="block text-xs font-normal text-muted-foreground mt-0.5">{equipment.serial_number}</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs font-medium">Issued To</span>
                  <span className="font-semibold">
                    {member ? ((member.first_name || member.last_name) ? `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() : member.email) : '—'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs font-medium">Issued By</span>
                  <span className="font-semibold">
                    {issuedBy ? ((issuedBy.first_name || issuedBy.last_name) ? `${issuedBy.first_name ?? ''} ${issuedBy.last_name ?? ''}`.trim() : issuedBy.email) : '—'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs font-medium">Issued Date</span>
                  <span className="font-semibold">
                    {issuance.issued_at ? format(parseISO(issuance.issued_at), 'd MMMM yyyy') : '—'}
                  </span>
                </div>
              </div>
              {issuance.notes && (
                <div className="flex flex-col mt-4">
                  <span className="text-muted-foreground text-xs font-medium">Notes</span>
                  <span className="font-normal text-gray-700">{issuance.notes}</span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 mb-6" />
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Return Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={"w-full justify-start text-left font-normal " + (returnDate ? "" : "text-muted-foreground")}
                    type="button"
                  >
                    {returnDate ? format(returnDate, "yyyy-MM-dd") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={returnDate || undefined}
                    onSelect={date => setReturnDate(date ?? new Date())}
                    initialFocus
                    required={false}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
          </div>
          <div className="flex justify-end gap-2 px-8 pb-6">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading} className="min-w-[90px]">Cancel</Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[110px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 text-base flex items-center gap-2 rounded-lg shadow"
            >
              <LogOut className="w-5 h-5" />
              {loading ? "Returning..." : "Return"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Tabs config
  const STATUS_TABS = [
    { id: 'all', label: 'All', icon: FileText },
    { id: 'issued', label: 'Issued', icon: LogOut },
    { id: 'overdue', label: 'Overdue', icon: AlertCircle },
  ];

  // Handler to add new equipment to the list
  function handleAddEquipment(newEquipment: Equipment) {
    setEquipmentList(prev => [newEquipment, ...prev]);
    toast.success("Equipment added successfully");
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
      {/* Tabs Row */}
      <div className="max-w-fit mb-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="inline-flex bg-gray-50 border border-gray-200 rounded-2xl shadow-sm p-1">
            {STATUS_TABS.map((tabItem) => {
              const Icon = tabItem.icon;
              return (
                <TabsTrigger
                  key={tabItem.id}
                  value={tabItem.id}
                  className="inline-flex items-center gap-2 px-4 py-2 pb-1 text-base font-medium border-b-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:border-indigo-700 data-[state=active]:text-indigo-800 data-[state=inactive]:text-muted-foreground hover:text-indigo-600 whitespace-nowrap"
                  style={{ background: "none", boxShadow: "none", borderRadius: 0 }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tabItem.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
      {/* Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <h2 className="text-xl font-bold">Equipment Inventory</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center justify-end">
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              {EQUIPMENT_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type.value} value={type.value} className="capitalize">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow text-base flex items-center gap-2" onClick={() => setAddModalOpen(true)}>
            {/* <PackagePlus className="h-4 w-4" /> */}
            Add Equipment
          </Button>
        </div>
      </div>
      {/* Data Table */}
      {loadingOpenIssuances ? (
        <div className="p-6 text-center text-muted-foreground">Loading issued equipment...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued To</TableHead>
              <TableHead>Expected Return</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">No equipment found.</TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={e => {
                    // Prevent row click if clicking on dropdown/actions
                    const target = e.target as HTMLElement;
                    if (target.closest('[data-ignore-row-click]')) return;
                    router.push(`/dashboard/equipment/view/${item.id}`);
                  }}
                >
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.serial_number || '—'}</TableCell>
                  <TableCell>{item.type || '—'}</TableCell>
                  <TableCell>
                    <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${statusColor(item.status)}`}>{item.status}</span>
                  </TableCell>
                  <TableCell>{getIssuedTo(item)}</TableCell>
                  <TableCell>{getExpectedReturn(item)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline" className="hover:bg-gray-100" data-ignore-row-click>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {openIssuanceByEquipmentId[item.id] ? (
                          <DropdownMenuItem onClick={() => { setSelectedEquipment(item); setModalType("return"); }}>
                            <LogOut className="w-4 h-4 mr-2" /> Return
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => { setSelectedEquipment(item); setModalType("issue"); }}>
                            <LogIn className="w-4 h-4 mr-2" /> Issue
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setSelectedEquipment(item); setModalType("note"); }}>
                          <StickyNote className="w-4 h-4 mr-2" /> Log Update
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <a href={`/dashboard/equipment/view/${item.id}`} className="flex items-center">
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {selectedEquipment && modalType === "issue" && (
        <IssueEquipmentModal
          open={true}
          onClose={() => { setSelectedEquipment(null); setModalType(null); }}
          equipment={selectedEquipment}
          orgId={currentOrgId || ''}
          refresh={() => {}}
        />
      )}
      {selectedEquipment && modalType === "return" && (() => {
        const issuance = openIssuanceByEquipmentId[selectedEquipment.id];
        const member = issuance ? issuedUsers[issuance.issued_to] : undefined;
        const issuedBy = issuance ? issuedUsers[issuance.issued_by] : undefined;
        return (
          <ReturnEquipmentModal
            open={true}
            onClose={() => { setSelectedEquipment(null); setModalType(null); }}
            equipment={selectedEquipment}
            issuance={issuance}
            member={member}
            issuedBy={issuedBy}
            refreshIssuances={() => {
              // Re-fetch open issuances after return
              setLoadingOpenIssuances(true);
              fetch('/api/equipment_issuance?open_only=true')
                .then(res => res.json())
                .then(data => {
                  const arr = Array.isArray(data.issuances) ? data.issuances : [];
                  const map: Record<string, EquipmentIssuance> = {};
                  arr.forEach((i: EquipmentIssuance) => { map[i.equipment_id] = i; });
                  setOpenIssuanceByEquipmentId(map);
                })
                .finally(() => setLoadingOpenIssuances(false));
            }}
          />
        );
      })()}
      {selectedEquipment && modalType === "note" && (
        <UpdateEquipmentModal
          open={true}
          onClose={() => { setSelectedEquipment(null); setModalType(null); }}
          equipment={selectedEquipment}
          orgId={currentOrgId || ''}
          refresh={() => {}}
        />
      )}
      {selectedEquipment && modalType === "history" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-bold mb-2">Equipment History</h3>
            <p>TODO: Show history for {selectedEquipment.name}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => { setSelectedEquipment(null); setModalType(null); }}>Close</Button>
            </div>
          </div>
        </div>
      )}
      {selectedEquipment && modalType === "edit" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-bold mb-2">Edit Equipment</h3>
            <p>TODO: Edit {selectedEquipment.name}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setSelectedEquipment(null); setModalType(null); }}>Cancel</Button>
              <Button>Save</Button>
            </div>
          </div>
        </div>
      )}
      <AddEquipmentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        orgId={currentOrgId || ''}
        refresh={() => {}}
        onAdd={handleAddEquipment}
      />
    </div>
  );
} 