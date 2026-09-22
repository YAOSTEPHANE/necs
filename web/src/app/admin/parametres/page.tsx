import { Suspense } from "react";
import { SettingsWorkspace } from "@/components/admin/SettingsPage";

export default function ParametresPage() {
  return (
    <Suspense
      fallback={
        <div className="settings-page" aria-busy="true">
          <div className="settings-skel settings-skel--lg" />
          <div className="settings-kpis">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="settings-skel" />
            ))}
          </div>
        </div>
      }
    >
      <SettingsWorkspace />
    </Suspense>
  );
}
