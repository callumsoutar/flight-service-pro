import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useSendInvitation } from "@/hooks/use-send-invitation";
import { Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SendInvitationButtonProps {
  userId: string;
  userEmail: string;
  userName?: string;
  disabled?: boolean;
  asDropdownItem?: boolean;
}

export function SendInvitationButton({ 
  userId, 
  userEmail, 
  userName,
  disabled = false,
  asDropdownItem = false
}: SendInvitationButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { sendInvitation, loading, error, clearError } = useSendInvitation();

  const handleSendInvitation = async () => {
    try {
      const response = await sendInvitation(userId, {
        redirectTo: `${window.location.origin}/dashboard/members/view/${userId}`
      });
      
      // Check if this was a resend based on the response message
      const isResend = response?.message?.includes('resent');
      toast.success(isResend ? `Invitation resent to ${userEmail}` : `Invitation sent to ${userEmail}`);
      setShowDialog(false);
    } catch {
      // Error is handled by the hook and displayed in the dialog
    }
  };

  const handleOpenDialog = () => {
    clearError();
    setShowDialog(true);
  };

  if (asDropdownItem) {
    return (
      <>
        <div
          onClick={handleOpenDialog}
          className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
        >
          <Mail className="w-4 h-4" />
          Send Invitation
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Send Account Invitation
              </DialogTitle>
              <DialogDescription>
                Send an invitation email to <strong>{userEmail}</strong>
                {userName && ` (${userName})`} to create their account. 
                If they already have an account, this will send a new invitation link.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="py-4">
              <div className="space-y-2 text-sm text-gray-600">
                <p>This will send an invitation email that allows the user to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Create their own password</li>
                  <li>Set up their account preferences</li>
                  <li>Access the member portal</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvitation}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleOpenDialog}
        disabled={disabled}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Mail className="w-4 h-4" />
        Send Invitation
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Account Invitation
            </DialogTitle>
            <DialogDescription>
              Send an invitation email to <strong>{userEmail}</strong>
              {userName && ` (${userName})`} to create their account. 
              If they already have an account, this will send a new invitation link.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="py-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p>This will send an invitation email that allows the user to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Create their own password</li>
                <li>Set up their account preferences</li>
                <li>Access the member portal</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvitation}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
