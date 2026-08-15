import { useAuth } from "../hooks/useAuth";

export function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-primary">Settings</h1>
        <p className="text-sm text-slate-500">Your account details.</p>
      </div>
      <div className="card p-6 max-w-md space-y-3 text-sm">
        <Row label="Name" value={user?.full_name} />
        <Row label="Email" value={user?.email} />
        <Row label="Role" value={user?.role?.replace("_", " ")} />
        <Row label="Status" value={user?.status} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-primary font-medium">{value || "—"}</span>
    </div>
  );
}
