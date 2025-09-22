import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { License, CreateLicenseRequest, UpdateLicenseRequest } from "@/types/licenses";

// Fetch all licenses
export function useLicenses() {
  return useQuery({
    queryKey: ["licenses"],
    queryFn: async (): Promise<License[]> => {
      const response = await fetch("/api/licenses");
      if (!response.ok) {
        throw new Error("Failed to fetch licenses");
      }
      const data = await response.json();
      return data.licenses;
    },
  });
}

// Fetch a single license by ID
export function useLicense(id: string) {
  return useQuery({
    queryKey: ["licenses", id],
    queryFn: async (): Promise<License> => {
      const response = await fetch(`/api/licenses/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch license");
      }
      const data = await response.json();
      return data.license;
    },
    enabled: !!id,
  });
}

// Create a new license
export function useCreateLicense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (licenseData: CreateLicenseRequest): Promise<License> => {
      const response = await fetch("/api/licenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(licenseData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create license");
      }
      
      const data = await response.json();
      return data.license;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
    },
  });
}

// Update a license
export function useUpdateLicense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data: licenseData 
    }: { 
      id: string; 
      data: UpdateLicenseRequest 
    }): Promise<License> => {
      const response = await fetch(`/api/licenses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(licenseData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update license");
      }
      
      const data = await response.json();
      return data.license;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      queryClient.invalidateQueries({ queryKey: ["licenses", id] });
    },
  });
}

// Delete a license
export function useDeleteLicense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/licenses/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete license");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
    },
  });
}
