import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { InstructorComment } from "@/types/instructor_comments";
import { createClient } from "@/lib/SupabaseBrowserClient";
import { MessageCircle, User, Clock, Send, Plus } from "lucide-react";
import { format } from "date-fns";

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

  // Helper function to get current user ID for instructor comments
  const getCurrentUserId = async (): Promise<string> => {
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData.user) {
      throw new Error("User not authenticated");
    }

    return authData.user.id;
  };

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
            const instructorMap: Record<string, { first_name?: string; last_name?: string }> = {};
            
            // Fetch each instructor individually since instructor_id references instructors table
            for (const instructorId of uniqueIds) {
              try {
                const instructorRes = await fetch(`/api/instructors?id=${instructorId}`);
                const instructorData = await instructorRes.json();
                if (instructorData.instructor && instructorData.instructor.users) {
                  const user = instructorData.instructor.users;
                  instructorMap[instructorId] = {
                    first_name: user.first_name || "",
                    last_name: user.last_name || "",
                  };
                }
              } catch (error) {
                console.error(`Failed to fetch instructor ${instructorId}:`, error);
                instructorMap[instructorId] = {
                  first_name: "Unknown",
                  last_name: "Instructor",
                };
              }
            }
            setInstructors(instructorMap);
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
      // Get current user ID - the API will handle instructor lookup
      const userId = await getCurrentUserId();
      
      const res = await fetch("/api/instructor_comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          booking_id: bookingId, 
          user_id: userId,
          comment: newComment 
        }),
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
      <DialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col">
        <DialogHeader className="pb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Instructor Comments</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {comments.length === 0 ? "No comments yet" : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {loading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="w-full h-20" />
              <Skeleton className="w-full h-20" />
              <Skeleton className="w-3/4 h-20" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">Please try again</p>
            </div>
          ) : (
            <>
              {/* Comments List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No comments yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Be the first to add an instructor comment</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">
                              {instructors[c.instructor_id]
                                ? `${instructors[c.instructor_id].first_name ?? ''} ${instructors[c.instructor_id].last_name ?? ''}`.trim() || 'Unknown Instructor'
                                : 'Unknown Instructor'}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {format(new Date(c.created_at), 'dd MMM yyyy · HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-11 text-gray-700 whitespace-pre-line leading-relaxed">
                        {c.comment}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Add New Comment</span>
                </div>
                <Textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Share your observations, feedback, or important notes about this booking..."
                  rows={3}
                  className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAddComment} 
                    disabled={submitting || !newComment.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 min-w-[120px]"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Add Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 