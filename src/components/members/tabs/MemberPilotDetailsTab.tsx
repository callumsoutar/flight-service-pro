import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Plus, Edit, Trash2 } from "lucide-react";

interface PilotDetailsTabProps {
  memberId: string;
}

interface PilotLicense {
  id: string;
  license_type: string;
  license_number: string;
  issue_date: string;
  expiry_date: string;
  issuing_authority: string;
  status: 'active' | 'expired' | 'suspended';
}

export default function MemberPilotDetailsTab({ memberId }: PilotDetailsTabProps) {
  const [licenses, setLicenses] = useState<PilotLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mark as intentionally unused during development
  void setError;
  const [editingLicense, setEditingLicense] = useState<PilotLicense | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    // Simulate loading pilot licenses
    setLoading(true);
    setTimeout(() => {
      setLicenses([
        {
          id: '1',
          license_type: 'Private Pilot License',
          license_number: 'PPL-123456',
          issue_date: '2020-03-15',
          expiry_date: '2025-03-15',
          issuing_authority: 'CASA',
          status: 'active'
        },
        {
          id: '2',
          license_type: 'Night Rating',
          license_number: 'NR-789012',
          issue_date: '2021-06-20',
          expiry_date: '2026-06-20',
          issuing_authority: 'CASA',
          status: 'active'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [memberId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading pilot details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pilot Licenses & Certifications</h3>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add License
        </Button>
      </div>

      {licenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground mb-4">No pilot licenses found</div>
            <Button 
              onClick={() => setShowAddForm(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First License
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {licenses.map((license) => (
            <Card key={license.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{license.license_type}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(license.status)}>
                      {license.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingLicense(license)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">License Number</label>
                    <div className="text-lg font-semibold">{license.license_number}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Issuing Authority</label>
                    <div className="text-lg">{license.issuing_authority}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Issue Date</label>
                    <div className="text-lg">{format(new Date(license.issue_date), 'PPP')}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                    <div className="text-lg">{format(new Date(license.expiry_date), 'PPP')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit License Form */}
      {(showAddForm || editingLicense) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingLicense ? 'Edit License' : 'Add New License'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="license-type" className="block text-sm font-medium mb-1">License Type</label>
                <Input 
                  id="license-type"
                  defaultValue={editingLicense?.license_type || ''}
                  placeholder="e.g., Private Pilot License"
                />
              </div>
              <div>
                <label htmlFor="license-number" className="block text-sm font-medium mb-1">License Number</label>
                <Input 
                  id="license-number"
                  defaultValue={editingLicense?.license_number || ''}
                  placeholder="e.g., PPL-123456"
                />
              </div>
              <div>
                <label htmlFor="issuing-authority" className="block text-sm font-medium mb-1">Issuing Authority</label>
                <Input 
                  id="issuing-authority"
                  defaultValue={editingLicense?.issuing_authority || ''}
                  placeholder="e.g., CASA"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                <select 
                  id="status"
                  className="w-full p-2 border rounded-md"
                  defaultValue={editingLicense?.status || 'active'}
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Issue Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingLicense?.issue_date ? format(new Date(editingLicense.issue_date), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingLicense?.issue_date ? new Date(editingLicense.issue_date) : undefined}
                      onSelect={() => {}}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expiry Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingLicense?.expiry_date ? format(new Date(editingLicense.expiry_date), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingLicense?.expiry_date ? new Date(editingLicense.expiry_date) : undefined}
                      onSelect={() => {}}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingLicense(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                {editingLicense ? 'Update License' : 'Add License'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 