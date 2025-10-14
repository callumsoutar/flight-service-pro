import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import type { User } from '@/types/users';
import { User as UserIcon, StickyNote, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  refresh?: () => void;
  onAdd?: (user: User) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onClose, refresh, onAdd }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [createAuthUser, setCreateAuthUser] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setCreateAuthUser(false);
      setNotesExpanded(false);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!email) {
      setError("Email is required.");
      setLoading(false);
      return;
    }
    const payload = {
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      phone: phone || null,
      notes: notes || null,
      role: "member", // Default role for new members (will be assigned via user_roles table)
      create_auth_user: createAuthUser, // Only create auth user if explicitly requested
    };
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (onAdd && data && data.user) onAdd(data.user as User);
      if (refresh) refresh();
      
      // Show success message
      if (data.message) {
        setError(null);
        // Show success message to user
        alert(data.message); // TODO: Replace with proper toast notification
        console.log(data.message);
      }
      
      if (data && data.user && data.user.id) {
        window.location.assign(`/dashboard/members/view/${data.user.id}`);
        return;
      }
      onClose();
    } else {
      const data = await res.json();
      let errorMsg = data.error || "Failed to add member";
      // If error is an object (e.g., Zod error), format it for display
      if (typeof errorMsg === 'object' && errorMsg !== null) {
        if (errorMsg.formErrors && Array.isArray(errorMsg.formErrors) && errorMsg.formErrors.length > 0) {
          errorMsg = errorMsg.formErrors.join(' ');
        } else if (errorMsg.fieldErrors && typeof errorMsg.fieldErrors === 'object') {
          errorMsg = Object.entries(errorMsg.fieldErrors)
            .map(([field, errs]) => `${field}: ${(errs as string[]).join(', ')}`)
            .join(' | ');
        } else {
          errorMsg = JSON.stringify(errorMsg);
        }
      }
      setError(errorMsg);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[600px] max-w-[98vw] mx-auto p-0 bg-white rounded-2xl shadow-xl border border-muted overflow-y-auto max-h-[90vh]">
        <div className="px-8 pt-8 pb-4">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-bold mb-1 tracking-tight">Add New Member</DialogTitle>
            <DialogDescription className="mb-2 text-base text-muted-foreground font-normal">Enter details for the new member. Email is required.</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-6 w-full" onSubmit={handleSubmit}>
            {/* Member Info */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold">Member Info</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block font-medium mb-1">First Name</label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" autoFocus />
                </div>
                <div>
                  <label className="block font-medium mb-1">Last Name</label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-medium mb-1">Email <span className="text-red-500">*</span></label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email address" />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-medium mb-1">Phone</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
                </div>
              </div>
            </div>
            <hr className="border-muted" />
            {/* Account Access Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold">Account Access</h3>
              </div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="createAuthUser"
                  className="text-sm font-medium"
                >
                  Create login account for this member
                </label>
                <Switch
                  id="createAuthUser"
                  checked={createAuthUser}
                  onCheckedChange={setCreateAuthUser}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {createAuthUser
                  ? "This member will be able to log in and access their account. You can send them an invitation email later."
                  : "This member will be added to the system but won't have login access. You can create an account and send an invitation later from their profile page."
                }
              </p>
            </div>
            <hr className="border-muted" />
            {/* Notes Section */}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setNotesExpanded(!notesExpanded)}
                className="flex items-center gap-2 text-left hover:opacity-70 transition-opacity"
              >
                {notesExpanded ? (
                  <ChevronDown className="w-5 h-5 text-purple-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-purple-600" />
                )}
                <StickyNote className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold">Notes</h3>
              </button>
              {notesExpanded && (
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="min-h-[80px]"
                />
              )}
            </div>
            <DialogFooter className="pt-6 flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
              <DialogClose asChild>
                <Button variant="outline" type="button" className="w-full sm:w-auto border border-muted hover:border-indigo-400">Cancel</Button>
              </DialogClose>
              <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md" disabled={loading || !email}>
                {loading ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
            {error && <div className="text-red-600 text-sm mb-2 text-center w-full">{error}</div>}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 