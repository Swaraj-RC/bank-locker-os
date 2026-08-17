export type UserRole = "CUSTOMER" | "BANK_OPERATOR" | "BRANCH_MANAGER" | "SUPER_ADMIN";

export interface AuthUser {
  id: string;
  employee_id?: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  branch_id: string | null;
  branch_name?: string;
  status: string;
}

// -------------------------------------------------------------
// EXACT MOCK BACKEND CONTRACTS SPECIFIED IN MASTER PROMPT
// -------------------------------------------------------------

export interface CustomerContract {
  customerId: string;
  name: string;
  lockerId: string;
  branch: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "KYC_PENDING" | string;
  mobile?: string;
  email?: string;
  lockerStatus?: string;
}

export interface AIResultContract {
  faceMatch: boolean;
  confidence: number;
  liveness: boolean;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface DecisionEngineContract {
  decision: "APPROVED" | "MANUAL REVIEW" | "BLOCKED";
  recommendedAction: string;
}

// -------------------------------------------------------------
// VERIFICATION SESSIONS & TIMELINE
// -------------------------------------------------------------

export type SessionStatus = "STARTED" | "VERIFYING" | "APPROVED" | "REVIEW" | "BLOCKED" | "COMPLETED";

export interface VerificationSession {
  sessionId: string;
  customerId: string;
  customerName: string;
  lockerId: string;
  startedTime: string;
  status: SessionStatus;
  operatorId: string;
  branch: string;
  aiResult?: AIResultContract;
  decision?: DecisionEngineContract;
}

// -------------------------------------------------------------
// SECURITY ALERTS & AUDIT TRAIL
// -------------------------------------------------------------

export type SecurityAlertType = "HIGH_RISK_ATTEMPT" | "MANUAL_REVIEW_PENDING" | "LIVENESS_FAILURE";

export interface SecurityAlert {
  id: string;
  type: SecurityAlertType;
  title: string;
  description: string;
  customerId: string;
  lockerId: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  resolved?: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  sessionId: string;
  customerId: string;
  customerName?: string;
  locker: string;
  faceMatch: boolean | null;
  liveness: boolean | null;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  decision: "APPROVED" | "MANUAL REVIEW" | "BLOCKED";
  operatorId: string;
}

// -------------------------------------------------------------
// LOCKERS & AUTHORIZED USERS
// -------------------------------------------------------------

export type LockerStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "VERIFICATION_PENDING"
  | "ACCESS_ACTIVE"
  | "MAINTENANCE"
  | "RESTRICTED";

export interface AuthorizedUser {
  id: string;
  name: string;
  relationship: string;
  biometricEnrolled: boolean;
  authorizationType: "PRIMARY_OWNER" | "JOINT_HOLDER" | "NOMINEE" | "MANDATE_HOLDER";
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  lastAccess: string;
}

export interface Locker {
  id: string;
  branch_id: string;
  branch_name?: string;
  locker_number: string;
  locker_size: "Small" | "Medium" | "Large" | "XL" | "Executive" | string;
  status: LockerStatus;
  customer_id: string | null;
  customer_name?: string | null;
  last_operation_at: string | null;
  authorized_users?: AuthorizedUser[];
}

export type RequestStatus =
  | "SUBMITTED"
  | "VERIFICATION_PENDING"
  | "TOKEN_A_VERIFIED"
  | "TOKEN_B_VERIFIED"
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "ACCESS_ACTIVE"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export interface LockerRequest {
  id: string;
  locker_id: string;
  customer_id: string;
  request_type: string;
  status: RequestStatus;
  requested_at: string;
  scheduled_at: string | null;
  approved_by: string | null;
  completed_at: string | null;
  rejection_reason: string | null;
  correlation_id: string;
}

export interface AuditEvent {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_state: string | null;
  new_state: string | null;
  event_metadata: Record<string, unknown> | null;
  correlation_id: string | null;
  created_at: string;
}

export interface Branch {
  id: string;
  branch_code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status: string;
}

export interface DashboardKpis {
  total_lockers: number;
  today_verifications: number;
  approved_today: number;
  failed_attempts: number;
  occupied: number;
  available: number;
  active_requests: number;
  access_today: number;
  pending_verifications: number;
}

