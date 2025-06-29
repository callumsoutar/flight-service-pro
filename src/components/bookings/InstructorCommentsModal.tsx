import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InstructorComment } from "@/types/instructor_comments";

interface InstructorCommentsModalProps {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InstructorCommentsModal({ bookingId, open, onOpenChange }: InstructorCommentsModalProps) {
  const [comments, setComments] = React.useState<InstructorComment[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newComment, setNewComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [instructors, setInstructors] = React.useState<Record<string, { first_name?: string; last_name?: string }>>({});

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      fetch(`/api/instructor_comments?booking_id=${bookingId}`)
        .then(res => res.json())
        .then(async (data: InstructorComment[] | { error: string }) => {
          if (!Array.isArray(data) && data.error) throw new Error(data.error);
          if (!Array.isArray(data)) return;
          setComments(data);
          // Fetch instructor names
          const uniqueIds = Array.from(new Set(data.map(c => c.instructor_id).filter(Boolean)));
          if (uniqueIds.length > 0) {
            const usersRes = await fetch(`/api/members?ids=${uniqueIds.join(",")}`);
            const usersData: { id: string; first_name?: string; last_name?: string }[] = await usersRes.json();
            const userMap: Record<string, { first_name?: string; last_name?: string }> = {};
            usersData.forEach(u => { userMap[u.id] = { first_name: u.first_name, last_name: u.last_name }; });
            setInstructors(userMap);
          } else {
            setInstructors({});
          }
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [open, bookingId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor_comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, comment: newComment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add comment");
      }
      setNewComment("");
      // Refetch comments
      const updated = await fetch(`/api/instructor_comments?booking_id=${bookingId}`).then(r => r.json());
      setComments(Array.isArray(updated) ? updated : []);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Instructor Comments</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : (
          <div className="space-y-4">
            {comments.length === 0 && <div className="text-muted-foreground text-center">No comments yet.</div>}
            {comments.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 bg-muted/50">
                <div className="font-semibold text-sm mb-1">
                  {instructors[c.instructor_id]
                    ? `${instructors[c.instructor_id].first_name ?? ''} ${instructors[c.instructor_id].last_name ?? ''}`.trim() || 'Unknown'
                    : 'Unknown'}
                </div>
                <div className="text-xs text-muted-foreground mb-1">{new Date(c.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</div>
                <div className="text-sm">{c.comment}</div>
              </div>
            ))}
            <div className="pt-2">
              <Textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Type your comment here..."
                rows={3}
                className="mb-2"
              />
              <Button onClick={handleAddComment} disabled={submitting || !newComment.trim()} className="w-full">
                {submitting ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 