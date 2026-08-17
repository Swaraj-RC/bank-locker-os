import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  Bell,
  Building2,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  User,
  Vault,
  ListTodo,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  MOCK_CUSTOMERS,
  MOCK_LOCKERS,
  MOCK_SESSIONS,
  MOCK_SECURITY_ALERTS,
} from "../services/mockData";
import { StatusBadge } from "./StatusBadge";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  customerId: string;
  lockerId?: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  read?: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  ...MOCK_SECURITY_ALERTS,
  {
    id: "ALT-904",
    type: "VERIFICATION_APPROVED",
    title: "Verification Approved",
    description: "Customer Rajesh Kumar passed 3D biometric passive liveness verification (98.4%).",
    customerId: "CUST-4410",
    lockerId: "L-102",
    timestamp: "Today, 16:42",
    severity: "INFO",
  },
];

export function Topbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search Palette State
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // Notification State
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Keyboard shortcut listener (Ctrl+K or / to focus search)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search Filtering
  const q = searchTerm.trim().toLowerCase();

  const matchedCustomers = q
    ? Object.values(MOCK_CUSTOMERS).filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.customerId.toLowerCase().includes(q) ||
          c.lockerId.toLowerCase().includes(q)
      )
    : [];

  const matchedLockers = q
    ? MOCK_LOCKERS.filter(
        (l) =>
          l.locker_number.toLowerCase().includes(q) ||
          (l.customer_name && l.customer_name.toLowerCase().includes(q)) ||
          (l.customer_id && l.customer_id.toLowerCase().includes(q))
      )
    : [];

  const matchedSessions = q
    ? MOCK_SESSIONS.filter(
        (s) =>
          s.sessionId.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.customerId.toLowerCase().includes(q) ||
          s.lockerId.toLowerCase().includes(q)
      )
    : [];

  const totalMatches =
    matchedCustomers.length + matchedLockers.length + matchedSessions.length;

  const handleSelectCustomer = (cId: string) => {
    setIsSearchOpen(false);
    setSearchTerm("");
    navigate(`/verification?cust=${cId}`);
  };

  const handleSelectLocker = (lockerNum: string) => {
    setIsSearchOpen(false);
    setSearchTerm("");
    navigate("/lockers");
  };

  const handleSelectSession = (cId: string) => {
    setIsSearchOpen(false);
    setSearchTerm("");
    navigate(`/verification?cust=${cId}`);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDismissNotif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-xs">
      {/* Global Search Bar with Command Palette Dropdown */}
      <div ref={searchContainerRef} className="relative w-96 max-w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          placeholder="Search Customer ID, Locker #, Session (Ctrl+K)..."
          className="w-full pl-10 pr-12 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition-all"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>

        {/* Search Results Dropdown Palette */}
        {isSearchOpen && q && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {totalMatches === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching customers, lockers, or sessions for &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              <>
                {/* Matched Customers */}
                {matchedCustomers.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <User size={12} /> Customers ({matchedCustomers.length})
                    </div>
                    {matchedCustomers.map((c) => (
                      <button
                        key={c.customerId}
                        type="button"
                        onClick={() => handleSelectCustomer(c.customerId)}
                        className="w-full p-2 rounded-lg hover:bg-slate-50 text-left flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#003366]/10 text-[#003366] font-bold text-xs flex items-center justify-center">
                            {c.name[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{c.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              ID: {c.customerId} · Locker: {c.lockerId}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={c.status} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Matched Lockers */}
                {matchedLockers.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Vault size={12} /> Lockers ({matchedLockers.length})
                    </div>
                    {matchedLockers.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => handleSelectLocker(l.locker_number)}
                        className="w-full p-2 rounded-lg hover:bg-slate-50 text-left flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-[#003366] bg-slate-100 px-2 py-1 rounded">
                            {l.locker_number}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {l.customer_name || "Unassigned"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {l.locker_size} · Pune Camp
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={l.status} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Matched Sessions */}
                {matchedSessions.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <ListTodo size={12} /> Verification Sessions ({matchedSessions.length})
                    </div>
                    {matchedSessions.map((s) => (
                      <button
                        key={s.sessionId}
                        type="button"
                        onClick={() => handleSelectSession(s.customerId)}
                        className="w-full p-2 rounded-lg hover:bg-slate-50 text-left flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-blue-600">
                            {s.sessionId}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{s.customerName}</div>
                            <div className="text-[10px] text-slate-400">
                              Target: {s.lockerId} · {s.startedTime}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={s.status} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Branch Selector Pill */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <Building2 size={14} className="text-[#003366]" />
          <span className="font-semibold text-slate-800">Pune Camp Main Branch</span>
          <span className="font-mono text-[10px] text-slate-500">(PUNE-01)</span>
        </div>

        {/* AI Engine Status */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 font-medium border-r border-slate-200 pr-4">
          <ShieldCheck size={15} className="text-emerald-600" /> AI Vision Engine Ready
        </div>

        {/* Notification Center Bell & Dropdown */}
        <div ref={notifContainerRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className={`relative p-2 rounded-lg transition-colors ${
              isNotifOpen ? "bg-slate-100 text-[#003366]" : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Notifications & Alerts"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Alerts & Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[#2563EB] font-bold hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No active notifications or alerts.
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isCritical = notif.severity === "CRITICAL";
                    const isHigh = notif.severity === "HIGH";
                    const isInfo = notif.severity === "INFO";

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setIsNotifOpen(false);
                          if (notif.customerId) {
                            navigate(`/verification?cust=${notif.customerId}`);
                          }
                        }}
                        className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors space-y-1 ${
                          !notif.read ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {isCritical ? (
                              <AlertOctagon size={14} className="text-rose-600 shrink-0" />
                            ) : isHigh ? (
                              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                            ) : (
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-900">
                              {notif.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                isCritical
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : isHigh
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {notif.severity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDismissNotif(notif.id, e)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug">
                          {notif.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                          <span>
                            Cust: <strong className="text-slate-700">{notif.customerId}</strong>
                            {notif.lockerId && (
                              <> · Locker: <strong className="text-[#003366]">{notif.lockerId}</strong></>
                            )}
                          </span>
                          <span>{notif.timestamp}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                <Link
                  to="/audit-logs"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs text-[#003366] font-bold hover:underline inline-flex items-center gap-1"
                >
                  View Complete Compliance Audit Logs <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Card */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="w-9 h-9 rounded-lg bg-[#003366] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <UserCheck size={16} />
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-bold text-slate-900">{user?.full_name || "Rajesh Varma"}</div>
            <div className="text-[11px] font-mono text-slate-500">
              {user?.employee_id || "EMP1001"} · Verification Officer
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


