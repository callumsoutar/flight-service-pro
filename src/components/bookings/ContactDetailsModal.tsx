import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, MapPin, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User as UserType } from "@/types/users";

interface ContactDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  loading?: boolean;
  error?: string | null;
  userData?: UserType | null;
}

// Hook to fetch user contact details
function useUserContactDetails(userId: string | null) {
  const [data, setData] = React.useState<UserType | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) {
      setData(null);
      setError(null);
      return;
    }

    const fetchUserDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/users?id=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user details');
        }
        const result = await response.json();
        // API returns { users: [user] } format, so get the first user
        setData(result.users?.[0] || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user details');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId]);

  return { data, loading, error };
}

export function ContactDetailsModal({
  open,
  onOpenChange,
  userId,
  loading: externalLoading = false,
  error: externalError,
  userData
}: ContactDetailsModalProps) {
  // Only fetch user data if not provided as prop
  const { data: fetchedUser, loading: fetchLoading, error: fetchError } = useUserContactDetails(
    userData ? null : userId
  );

  const user = userData || fetchedUser;
  const loading = externalLoading || (userData ? false : fetchLoading);
  const error = externalError || (userData ? null : fetchError);

  const handleClose = () => {
    onOpenChange(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatAddress = (user: UserType) => {
    const parts = [
      user.street_address,
      user.city,
      user.state,
      user.postal_code,
      user.country
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Contact Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Loading contact details...</span>
            </div>
          )}

          {/* Contact Details */}
          {!loading && !error && user && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label className="font-medium text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    Full Name
                  </Label>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-2">
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.email || 'Not provided'
                    }
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="font-medium text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    Email
                  </Label>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-2">
                    {user.email || 'Not provided'}
                  </div>
                </div>

                {user.phone && (
                  <div className="flex flex-col gap-2">
                    <Label className="font-medium text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      Phone
                    </Label>
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-2">
                      {user.phone}
                    </div>
                  </div>
                )}

                {user.date_of_birth && (
                  <div className="flex flex-col gap-2">
                    <Label className="font-medium text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      Date of Birth
                    </Label>
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-2">
                      {formatDate(user.date_of_birth)}
                    </div>
                  </div>
                )}
              </div>

              {/* Address Information */}
              {(user.street_address || user.city || user.state || user.postal_code || user.country) && (
                <div className="border-t pt-4">
                  <div className="flex flex-col gap-2">
                    <Label className="font-medium text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      Address
                    </Label>
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-2">
                      {formatAddress(user)}
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {(user.next_of_kin_name || user.next_of_kin_phone) && (
                <div className="border-t pt-4">
                  <Label className="font-medium text-sm text-gray-800 mb-2 block">
                    Emergency Contact
                  </Label>
                  <div className="space-y-2">
                    {user.next_of_kin_name && (
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-gray-500">Name</Label>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-2">
                          {user.next_of_kin_name}
                          {user.emergency_contact_relationship && (
                            <span className="text-gray-500 ml-1">
                              ({user.emergency_contact_relationship})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {user.next_of_kin_phone && (
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-gray-500">Phone</Label>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-md p-2">
                          {user.next_of_kin_phone}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No User Found */}
          {!loading && !error && !user && (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No contact details available</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}