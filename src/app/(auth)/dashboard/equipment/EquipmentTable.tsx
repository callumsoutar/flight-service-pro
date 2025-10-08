"use client";
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Edit, MoreVertical, Package, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Equipment, EquipmentIssuance } from "@/types/equipment";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { UserResult } from '@/components/invoices/MemberSelect';
import { IssueEquipmentModal } from "@/components/equipment/IssueEquipmentModal";
import { UpdateEquipmentModal } from "@/components/equipment/UpdateEquipmentModal";
import { AddEquipmentModal } from "@/components/equipment/AddEquipmentModal";
import { ReturnEquipmentModal } from "@/components/equipment/ReturnEquipmentModal";
import { toast } from "sonner";

interface EquipmentTableProps {
  equipment: Equipment[];
  openIssuanceByEquipmentId: Record<string, EquipmentIssuance>;
  issuedUsers: Record<string, UserResult>;
}

const EQUIPMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Headset', label: 'Headset' },
  { value: 'Technology', label: 'Technology' },
  { value: 'AIP', label: 'AIP' },
  { value: 'Stationery', label: 'Stationery' },
  { value: 'Maps', label: 'Maps' },
  { value: 'Radio', label: 'Radio' },
  { value: 'Transponder', label: 'Transponder' },
  { value: 'ELT', label: 'ELT' },
  { value: 'Lifejacket', label: 'Lifejacket' },
  { value: 'FirstAidKit', label: 'First Aid Kit' },
  { value: 'FireExtinguisher', label: 'Fire Extinguisher' },
  { value: 'Other', label: 'Other' },
];

export default function EquipmentTable({ equipment, openIssuanceByEquipmentId, issuedUsers }: EquipmentTableProps) {
  // State for equipment list so we can update it on add
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(equipment);

  // Tabs state
  const [tab, setTab] = useState<string>('all');

  // Filter state
  const [selectedType, setSelectedType] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Modal state
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [modalType, setModalType] = useState<null | "issue" | "return" | "note" | "history" | "edit">(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const router = useRouter();

  // Filtering logic based on tab
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter(e => {
      // Tab filter
      let matchesTab = true;
      if (tab === 'issued') {
        matchesTab = !!openIssuanceByEquipmentId[e.id];
      } else if (tab === 'overdue') {
        const issuance = openIssuanceByEquipmentId[e.id];
        if (!issuance || !issuance.expected_return) {
          matchesTab = false;
        } else {
          const expectedDate = new Date(issuance.expected_return);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          matchesTab = expectedDate < today;
        }
      }

      // Type filter
      const matchesType = selectedType === 'All' || e.type === selectedType;

      // Search filter
      const matchesSearch = !search || (
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
        e.type?.toLowerCase().includes(search.toLowerCase())
      );

      return matchesTab && matchesType && matchesSearch;
    });
  }, [tab, openIssuanceByEquipmentId, equipmentList, selectedType, search]);

  // Helper: get effective status for badge (open issuance takes precedence)
  const getEffectiveStatus = (item: Equipment): string => {
    return openIssuanceByEquipmentId[item.id] ? 'Issued' : item.status;
  };

  // Helper: get status badge color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      issued: "bg-blue-100 text-blue-800",
      lost: "bg-red-100 text-red-800",
      stolen: "bg-red-100 text-red-800",
      damaged: "bg-red-100 text-red-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      retired: "bg-gray-100 text-gray-800",
    };
    return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  // Helper: get issued to user name
  const getIssuedToName = (item: Equipment): string => {
    const issuance = openIssuanceByEquipmentId[item.id];
    if (!issuance) return '—';
    
    const user = issuedUsers[issuance.user_id];
    if (!user) return 'Unknown';
    
    return user.first_name || user.last_name
      ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
      : user.email;
  };

  // Helper: get expected return date
  const getExpectedReturn = (item: Equipment): React.ReactNode => {
    const issuance = openIssuanceByEquipmentId[item.id];
    if (!issuance || !issuance.expected_return) {
      return <span className="text-gray-400">—</span>;
    }

    const expectedDate = new Date(issuance.expected_return);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = expectedDate < today;
    
    return (
      <span className={isOverdue ? "text-red-600 font-semibold" : "text-gray-900"}>
        {expectedDate.toLocaleDateString()}
      </span>
    );
  };

  // Handler to add new equipment to the list
  function handleAddEquipment(newEquipment: Equipment) {
    setEquipmentList(prev => [newEquipment, ...prev]);
    toast.success("Equipment added successfully");
  }

  // Tabs config
  const STATUS_TABS = [
    { id: 'all', label: 'All', icon: Package },
    { id: 'issued', label: 'Issued', icon: CheckCircle },
    { id: 'overdue', label: 'Overdue', icon: AlertTriangle },
  ];

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
            onChange={(e) => setSearch(e.target.value)}
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
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg shadow text-base flex items-center gap-2"
            onClick={() => setAddModalOpen(true)}
          >
            <Package className="h-4 w-4" />
            Add Equipment
          </Button>
        </div>
      </div>

      {/* Data Table */}
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
                <TableCell className="capitalize">{item.type || '—'}</TableCell>
                <TableCell>
                  <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getStatusColor(getEffectiveStatus(item))}`}>
                    {getEffectiveStatus(item)}
                  </span>
                </TableCell>
                <TableCell>{getIssuedToName(item)}</TableCell>
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
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedEquipment(item); setModalType("return"); }}>
                          <CheckCircle className="w-4 h-4 mr-2" /> Return
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedEquipment(item); setModalType("issue"); }}>
                          <Clock className="w-4 h-4 mr-2" /> Issue
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedEquipment(item); setModalType("note"); }}>
                        <Eye className="w-4 h-4 mr-2" /> Log Update
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

      {/* Modals */}
      {selectedEquipment && modalType === "issue" && (
        <IssueEquipmentModal
          open={true}
          onClose={() => { setSelectedEquipment(null); setModalType(null); }}
          equipment={selectedEquipment}
          refresh={() => {
            // Refresh the page to get updated data
            window.location.reload();
          }}
        />
      )}
      {selectedEquipment && modalType === "note" && (
        <UpdateEquipmentModal
          open={true}
          onClose={() => { setSelectedEquipment(null); setModalType(null); }}
          equipment={selectedEquipment}
          refresh={() => {
            // Refresh the page to get updated data
            window.location.reload();
          }}
        />
      )}
      {selectedEquipment && modalType === "return" && (() => {
        const issuance = openIssuanceByEquipmentId[selectedEquipment.id];
        const issuedUser = issuedUsers[issuance?.user_id];
        
        // Only render if we have the required data
        if (!issuance || !issuedUser) {
          return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
                <h3 className="text-lg font-bold mb-2">Error</h3>
                <p>Unable to load return data. Please refresh and try again.</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button onClick={() => { setSelectedEquipment(null); setModalType(null); }}>Close</Button>
                </div>
              </div>
            </div>
          );
        }
        
        return (
          <ReturnEquipmentModal
            open={true}
            onClose={() => { setSelectedEquipment(null); setModalType(null); }}
            equipment={selectedEquipment}
            issuance={issuance}
            issuedUser={issuedUser}
            refresh={() => {
              // Refresh the page to get updated data
              window.location.reload();
            }}
          />
        );
      })()}
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
        refresh={() => {
          // Refresh the page to get updated data
          window.location.reload();
        }}
        onAdd={handleAddEquipment}
      />
    </div>
  );
} 