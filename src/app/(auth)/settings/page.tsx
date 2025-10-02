import SettingsClient from "./SettingsClient";
import { withRoleProtection, ROLE_CONFIGS, ProtectedPageProps } from "@/lib/rbac-page-wrapper";

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic';

async function SettingsPage({ user, userRole }: ProtectedPageProps) {
  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <div className="w-full max-w-6xl px-4 pt-8 pb-12 flex flex-col gap-8">
        {/* Title */}
        <div className="flex flex-row items-center w-full mb-2 gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-start gap-0">
            <h1 className="text-[3rem] font-extrabold tracking-tight text-gray-900" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>Settings</h1>
            <p className="text-lg text-muted-foreground">Configure your flight school settings and preferences.</p>
          </div>
        </div>

        {/* Settings Content */}
        <SettingsClient />
      </div>
    </div>
  );
}

// Export protected component using standardized HOC
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withRoleProtection(SettingsPage, ROLE_CONFIGS.ADMIN_ONLY) as any;