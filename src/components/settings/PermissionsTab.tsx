"use client";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Shield, Users, Lock, Key, Shield as ShieldIcon, Clock } from "lucide-react";

export default function PermissionsTab() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldIcon className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Permissions Configuration</h2>
        </div>
      </div>

      <div className="space-y-6">
        {/* Role Management */}
        <CollapsibleCard
          title="Role Management"
          description="Define and manage user roles and their capabilities"
          icon={<Users className="w-5 h-5 text-gray-400" />}
          summary="Coming soon"
          className="border-l-4 border-l-gray-200 opacity-75"
        >
          <div className="text-gray-500 text-center py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Role management configuration coming soon...</p>
          </div>
        </CollapsibleCard>

        {/* Access Control */}
        <CollapsibleCard
          title="Access Control"
          description="Configure what different user types can access"
          icon={<Lock className="w-5 h-5 text-gray-400" />}
          summary="Coming soon"
          className="border-l-4 border-l-gray-200 opacity-75"
        >
          <div className="text-gray-500 text-center py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Access control configuration coming soon...</p>
          </div>
        </CollapsibleCard>

        {/* Security Settings */}
        <CollapsibleCard
          title="Security Settings"
          description="Configure password policies and security requirements"
          icon={<Shield className="w-5 h-5 text-gray-400" />}
          summary="Coming soon"
          className="border-l-4 border-l-gray-200 opacity-75"
        >
          <div className="text-gray-500 text-center py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Security settings configuration coming soon...</p>
          </div>
        </CollapsibleCard>

        {/* API Access */}
        <CollapsibleCard
          title="API Access"
          description="Manage API keys and third-party integrations"
          icon={<Key className="w-5 h-5 text-gray-400" />}
          summary="Coming soon"
          className="border-l-4 border-l-gray-200 opacity-75"
        >
          <div className="text-gray-500 text-center py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">API access management coming soon...</p>
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}