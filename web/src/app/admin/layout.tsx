import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import "./admin.css";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="login-page"><div className="login-card login-card--checking">Chargement…</div></div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
