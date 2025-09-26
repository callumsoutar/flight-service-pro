"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePublicDirectory } from "@/hooks/use-public-directory";
import { Loader2, Users, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function PublicDirectoryToggle() {
  const {
    publicDirectoryOptIn,
    isLoading,
    error,
    updatePublicDirectory,
    isUpdating,
    updateError,
  } = usePublicDirectory();

  const handleToggle = (checked: boolean) => {
    updatePublicDirectory(checked);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Public Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Public Directory
        </CardTitle>
        <CardDescription>
          Control your visibility in the member directory. When enabled, other members can see your contact information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="public-directory-toggle" className="text-base">
              Show in Member Directory
            </Label>
            <div className="text-sm text-muted-foreground">
              {publicDirectoryOptIn ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Eye className="h-3 w-3" />
                  Visible to other members
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <EyeOff className="h-3 w-3" />
                  Private - only visible to admins
                </span>
              )}
            </div>
          </div>
          <Switch
            id="public-directory-toggle"
            checked={publicDirectoryOptIn}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
          />
        </div>

        {updateError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to update directory visibility: {updateError.message}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load directory settings: {error.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• When enabled: Your name, email, and phone will be visible to other members</p>
          <p>• When disabled: Only administrators can see your full contact information</p>
          <p>• You can change this setting at any time</p>
        </div>
      </CardContent>
    </Card>
  );
}
