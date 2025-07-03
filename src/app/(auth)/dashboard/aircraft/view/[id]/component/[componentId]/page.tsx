"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import AircraftComponentForm from "@/components/aircraft/AircraftComponentForm";
import { toast } from "sonner";

interface ComponentHeaderData {
  name: string;
  status: string;
  registration: string;
}

export default function AircraftComponentDetailsPage() {
  const router = useRouter();
  const { id, componentId } = useParams<{ id: string; componentId?: string }>();
  const formRef = useRef<HTMLFormElement>(null);
  const [success, setSuccess] = useState(false);
  const [header, setHeader] = useState<ComponentHeaderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!componentId) return;
    setLoading(true);
    fetch(`/api/aircraft_components?component_id=${componentId}`)
      .then(res => res.json())
      .then(async (data) => {
        if (Array.isArray(data) && data.length > 0) {
          const comp = data[0];
          // Fetch aircraft registration
          let registration = "";
          if (comp.aircraft_id) {
            const aircraftRes = await fetch(`/api/aircraft?id=${comp.aircraft_id}`);
            const aircraftData = await aircraftRes.json();
            registration = aircraftData?.aircraft?.registration || "";
          }
          setHeader({
            name: comp.name,
            status: comp.status,
            registration,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [componentId]);

  const handleSuccess = () => {
    setSuccess(true);
    toast.success("Component updated successfully");
  };

  return (
    <main className="max-w-screen-xl mx-auto p-6 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
            <a href={`/dashboard/aircraft/view/${id}`} className="text-indigo-600 hover:underline text-base">&larr; Back to Aircraft</a>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2">
            {loading ? <span className="text-muted-foreground">Loading...</span> : header?.name || "Component"}
          </h1>
          <div className="text-muted-foreground text-base mt-1">
            {header?.registration ? `Component for ${header.registration}` : ""}
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2 md:mt-0">
          {header?.status && (
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1.5 text-sm font-semibold capitalize">{header.status}</Badge>
          )}
        </div>
      </div>

      {/* Editable Component Info */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold mb-0">Component Details</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => formRef.current?.reset()}
            >
              Cancel
            </Button>
          </div>
        </div>
        <AircraftComponentForm
          ref={formRef}
          aircraftId={id}
          componentId={componentId}
          onSuccess={handleSuccess}
        />
      </Card>

      {/* Maintenance History Table */}
      {componentId && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Maintenance History</h2>
          {/* TODO: Render maintenance visits table here */}
          <div className="text-muted-foreground">Maintenance visits table goes here.</div>
        </Card>
      )}

      {/* Cost History Table */}
      {componentId && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Cost History</h2>
          {/* TODO: Render maintenance costs table here */}
          <div className="text-muted-foreground">Maintenance costs table goes here.</div>
        </Card>
      )}
    </main>
  );
} 