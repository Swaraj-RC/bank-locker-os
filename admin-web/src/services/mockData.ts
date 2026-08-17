import {
  Locker,
  LockerRequest,
  AuditEvent,
  DashboardKpis,
  CustomerContract,
  AIResultContract,
  DecisionEngineContract,
  VerificationSession,
  SecurityAlert,
  AuditLogItem,
} from "../types";

export interface MockBranch {
  id: string;
  code: string;
  name: string;
  city: string;
}

export const MOCK_BRANCHES: MockBranch[] = [
  { id: "b1", code: "PUNE-CAMP-01", name: "Pune Camp Main Branch", city: "Pune" },
  { id: "b2", code: "BKC-MUM-04", name: "BKC Executive Branch", city: "Mumbai" },
  { id: "b3", code: "CP-DELHI-02", name: "Connaught Place Branch", city: "New Delhi" },
];

export const MOCK_KPIS: DashboardKpis = {
  total_lockers: 120,
  today_verifications: 48,
  approved_today: 44,
  failed_attempts: 4,
  occupied: 98,
  available: 22,
  active_requests: 6,
  access_today: 48,
  pending_verifications: 2,
};

// -------------------------------------------------------------
// MOCK CUSTOMERS (Contract compliant)
// -------------------------------------------------------------

export const MOCK_CUSTOMERS: Record<string, CustomerContract> = {
  "CUST-4410": {
    customerId: "CUST-4410",
    name: "Rajesh Kumar",
    lockerId: "L-102",
    branch: "Pune Camp",
    status: "ACTIVE",
    mobile: "+91 98230 44102",
    email: "rajesh.kumar@outlook.com",
    lockerStatus: "OCCUPIED",
  },
  "CUST-3189": {
    customerId: "CUST-3189",
    name: "Ananya Sharma",
    lockerId: "L-104",
    branch: "Pune Camp",
    status: "ACTIVE",
    mobile: "+91 98111 22334",
    email: "ananya.sharma@gmail.com",
    lockerStatus: "VERIFICATION_PENDING",
  },
  "CUST-1049": {
    customerId: "CUST-1049",
    name: "Vikram Malhotra",
    lockerId: "L-108",
    branch: "Pune Camp",
    status: "ACTIVE",
    mobile: "+91 97222 33445",
    email: "vikram.m@corporation.in",
    lockerStatus: "OCCUPIED",
  },
  "CUST-9012": {
    customerId: "CUST-9012",
    name: "Priya Mehta",
    lockerId: "L-101",
    branch: "Pune Camp",
    status: "ACTIVE",
    mobile: "+91 99333 44556",
    email: "priya.mehta@yahoo.com",
    lockerStatus: "OCCUPIED",
  },
  "CUST-8812": {
    customerId: "CUST-8812",
    name: "Sanjay Singhania",
    lockerId: "L-109",
    branch: "Pune Camp",
    status: "SUSPENDED",
    mobile: "+91 98666 77889",
    email: "sanjay.s@enterprise.com",
    lockerStatus: "RESTRICTED",
  },
};

export const DEFAULT_CUSTOMER = MOCK_CUSTOMERS["CUST-4410"];

// -------------------------------------------------------------
// DEMO SCENARIOS (Contract compliant)
// -------------------------------------------------------------

export interface DemoScenario {
  id: "scenario1" | "scenario2" | "scenario3";
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  customer: CustomerContract;
  aiResult: AIResultContract;
  decisionEngine: DecisionEngineContract;
}

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  scenario1: {
    id: "scenario1",
    title: "Scenario 1: Legitimate Customer",
    badge: "APPROVED",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Real account holder present in-person. High confidence biometric & passive 3D liveness match.",
    customer: MOCK_CUSTOMERS["CUST-4410"],
    aiResult: {
      faceMatch: true,
      confidence: 98.4,
      liveness: true,
      riskScore: 12,
      riskLevel: "LOW",
    },
    decisionEngine: {
      decision: "APPROVED",
      recommendedAction: "Locker operation authorized.",
    },
  },
  scenario2: {
    id: "scenario2",
    title: "Scenario 2: Wrong Person",
    badge: "BLOCKED",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    description: "Live human presenting themselves, but facial feature embeddings fail customer record comparison.",
    customer: {
      customerId: "CUST-4410",
      name: "Rajesh Kumar",
      lockerId: "L-102",
      branch: "Pune Camp",
      status: "ACTIVE",
      mobile: "+91 98230 44102",
    },
    aiResult: {
      faceMatch: false,
      confidence: 42.0,
      liveness: true,
      riskScore: 88,
      riskLevel: "HIGH",
    },
    decisionEngine: {
      decision: "BLOCKED",
      recommendedAction: "Face biometric mismatch. Locker access blocked. Security alert dispatched.",
    },
  },
  scenario3: {
    id: "scenario3",
    title: "Scenario 3: Spoof Attempt",
    badge: "MANUAL REVIEW",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    description: "Presentation attack detected (printed photo / digital screen replay). Immediate supervisory flag.",
    customer: MOCK_CUSTOMERS["CUST-4410"],
    aiResult: {
      faceMatch: true,
      confidence: 97.0,
      liveness: false,
      riskScore: 94,
      riskLevel: "HIGH",
    },
    decisionEngine: {
      decision: "MANUAL REVIEW",
      recommendedAction: "Liveness verification failed (2D Presentation Attack). Manual physical ID inspection required.",
    },
  },
};

// -------------------------------------------------------------
// RECENT DASHBOARD VERIFICATION ACTIVITY
// -------------------------------------------------------------

export interface RecentActivityItem {
  id: string;
  time: string;
  customerName: string;
  customerId: string;
  lockerId: string;
  decision: "APPROVED" | "MANUAL REVIEW" | "BLOCKED";
  confidence: number;
}

export const MOCK_RECENT_ACTIVITIES: RecentActivityItem[] = [
  { id: "ACT-101", time: "16:42", customerName: "Rajesh Kumar", customerId: "CUST-4410", lockerId: "L-102", decision: "APPROVED", confidence: 98.4 },
  { id: "ACT-102", time: "16:15", customerName: "Ananya Sharma", customerId: "CUST-3189", lockerId: "L-104", decision: "APPROVED", confidence: 99.1 },
  { id: "ACT-103", time: "15:48", customerName: "Vikram Malhotra", customerId: "CUST-1049", lockerId: "L-108", decision: "APPROVED", confidence: 96.8 },
  { id: "ACT-104", time: "15:20", customerName: "Sanjay Singhania", customerId: "CUST-8812", lockerId: "L-109", decision: "MANUAL REVIEW", confidence: 97.0 },
  { id: "ACT-105", time: "14:55", customerName: "Unknown Claimant", customerId: "CUST-7721", lockerId: "L-106", decision: "BLOCKED", confidence: 42.0 },
  { id: "ACT-106", time: "14:10", customerName: "Priya Mehta", customerId: "CUST-9012", lockerId: "L-101", decision: "APPROVED", confidence: 98.9 },
];

// -------------------------------------------------------------
// SECURITY ALERTS
// -------------------------------------------------------------

export const MOCK_SECURITY_ALERTS: SecurityAlert[] = [
  {
    id: "ALT-901",
    type: "HIGH_RISK_ATTEMPT",
    title: "High Risk Attempt",
    description: "Claimant biometric vector mismatch against assigned locker holder profile.",
    customerId: "CUST-7721",
    lockerId: "L-106",
    timestamp: "Today, 14:55",
    severity: "CRITICAL",
  },
  {
    id: "ALT-902",
    type: "MANUAL_REVIEW_PENDING",
    title: "Manual Review Pending",
    description: "Supervisory physical ID verification required due to borderline liveness confidence.",
    customerId: "CUST-8812",
    lockerId: "L-109",
    timestamp: "Today, 15:20",
    severity: "HIGH",
  },
  {
    id: "ALT-903",
    type: "LIVENESS_FAILURE",
    title: "Liveness Failure",
    description: "Sub-surface reflectance analysis triggered presentation attack alert.",
    customerId: "CUST-4410",
    lockerId: "L-102",
    timestamp: "Today, 12:14",
    severity: "MEDIUM",
  },
];

// -------------------------------------------------------------
// BRANCH STATUS INDICATORS
// -------------------------------------------------------------

export const MOCK_BRANCH_STATUS = {
  vault: {
    status: "ONLINE",
    label: "Vault Online",
    detail: "Primary Electromagnetic Interlock Active (Bays A1-D4 Normal)",
    isOk: true,
  },
  aiService: {
    status: "CONNECTED",
    label: "AI Service Connected",
    detail: "Edge Neural Pipeline v2.4 Active · Latency: 14ms",
    isOk: true,
  },
  database: {
    status: "CONNECTED",
    label: "Database Connected",
    detail: "PostgreSQL Master Cluster · Zero-lag replica sync",
    isOk: true,
  },
};

// -------------------------------------------------------------
// VERIFICATION SESSIONS
// -------------------------------------------------------------

export const MOCK_SESSIONS: VerificationSession[] = [
  {
    sessionId: "SES-9821",
    customerId: "CUST-4410",
    customerName: "Rajesh Kumar",
    lockerId: "L-102",
    startedTime: "2026-08-17 16:40:12",
    status: "APPROVED",
    operatorId: "EMP1001",
    branch: "Pune Camp",
    aiResult: { faceMatch: true, confidence: 98.4, liveness: true, riskScore: 12, riskLevel: "LOW" },
    decision: { decision: "APPROVED", recommendedAction: "Locker operation authorized." },
  },
  {
    sessionId: "SES-9822",
    customerId: "CUST-3189",
    customerName: "Ananya Sharma",
    lockerId: "L-104",
    startedTime: "2026-08-17 16:12:00",
    status: "COMPLETED",
    operatorId: "EMP1001",
    branch: "Pune Camp",
    aiResult: { faceMatch: true, confidence: 99.1, liveness: true, riskScore: 8, riskLevel: "LOW" },
    decision: { decision: "APPROVED", recommendedAction: "Locker operation authorized." },
  },
  {
    sessionId: "SES-9823",
    customerId: "CUST-1049",
    customerName: "Vikram Malhotra",
    lockerId: "L-108",
    startedTime: "2026-08-17 15:45:30",
    status: "VERIFYING",
    operatorId: "EMP1001",
    branch: "Pune Camp",
  },
  {
    sessionId: "SES-9824",
    customerId: "CUST-8812",
    customerName: "Sanjay Singhania",
    lockerId: "L-109",
    startedTime: "2026-08-17 15:18:22",
    status: "REVIEW",
    operatorId: "EMP1002",
    branch: "Pune Camp",
    aiResult: { faceMatch: true, confidence: 97.0, liveness: false, riskScore: 94, riskLevel: "HIGH" },
    decision: { decision: "MANUAL REVIEW", recommendedAction: "Manual identity verification required." },
  },
  {
    sessionId: "SES-9825",
    customerId: "CUST-7721",
    customerName: "Unknown Claimant",
    lockerId: "L-106",
    startedTime: "2026-08-17 14:52:10",
    status: "BLOCKED",
    operatorId: "EMP1001",
    branch: "Pune Camp",
    aiResult: { faceMatch: false, confidence: 42.0, liveness: true, riskScore: 88, riskLevel: "HIGH" },
    decision: { decision: "BLOCKED", recommendedAction: "Locker access blocked. Security alert dispatched." },
  },
  {
    sessionId: "SES-9826",
    customerId: "CUST-9012",
    customerName: "Priya Mehta",
    lockerId: "L-101",
    startedTime: "2026-08-17 14:05:44",
    status: "COMPLETED",
    operatorId: "EMP1003",
    branch: "Pune Camp",
    aiResult: { faceMatch: true, confidence: 98.9, liveness: true, riskScore: 10, riskLevel: "LOW" },
    decision: { decision: "APPROVED", recommendedAction: "Locker operation authorized." },
  },
  {
    sessionId: "SES-9827",
    customerId: "CUST-5521",
    customerName: "Sunil Deshmukh",
    lockerId: "L-105",
    startedTime: "2026-08-17 13:30:00",
    status: "STARTED",
    operatorId: "EMP1001",
    branch: "Pune Camp",
  },
];

// -------------------------------------------------------------
// AUDIT LOGS (Page 6 Table contract)
// -------------------------------------------------------------

export const MOCK_AUDIT_LOG_ITEMS: AuditLogItem[] = [
  {
    id: "AUD-801",
    timestamp: "2026-08-17 16:42:15",
    sessionId: "SES-9821",
    customerId: "CUST-4410",
    customerName: "Rajesh Kumar",
    locker: "L-102",
    faceMatch: true,
    liveness: true,
    riskScore: 12,
    riskLevel: "LOW",
    decision: "APPROVED",
    operatorId: "EMP1001",
  },
  {
    id: "AUD-802",
    timestamp: "2026-08-17 16:15:20",
    sessionId: "SES-9822",
    customerId: "CUST-3189",
    customerName: "Ananya Sharma",
    locker: "L-104",
    faceMatch: true,
    liveness: true,
    riskScore: 8,
    riskLevel: "LOW",
    decision: "APPROVED",
    operatorId: "EMP1001",
  },
  {
    id: "AUD-803",
    timestamp: "2026-08-17 15:20:45",
    sessionId: "SES-9824",
    customerId: "CUST-8812",
    customerName: "Sanjay Singhania",
    locker: "L-109",
    faceMatch: true,
    liveness: false,
    riskScore: 94,
    riskLevel: "HIGH",
    decision: "MANUAL REVIEW",
    operatorId: "EMP1002",
  },
  {
    id: "AUD-804",
    timestamp: "2026-08-17 14:55:02",
    sessionId: "SES-9825",
    customerId: "CUST-7721",
    customerName: "Unknown Claimant",
    locker: "L-106",
    faceMatch: false,
    liveness: true,
    riskScore: 88,
    riskLevel: "HIGH",
    decision: "BLOCKED",
    operatorId: "EMP1001",
  },
  {
    id: "AUD-805",
    timestamp: "2026-08-17 14:10:18",
    sessionId: "SES-9826",
    customerId: "CUST-9012",
    customerName: "Priya Mehta",
    locker: "L-101",
    faceMatch: true,
    liveness: true,
    riskScore: 10,
    riskLevel: "LOW",
    decision: "APPROVED",
    operatorId: "EMP1003",
  },
  {
    id: "AUD-806",
    timestamp: "2026-08-17 12:45:10",
    sessionId: "SES-9818",
    customerId: "CUST-4410",
    customerName: "Rajesh Kumar",
    locker: "L-102",
    faceMatch: true,
    liveness: true,
    riskScore: 14,
    riskLevel: "LOW",
    decision: "APPROVED",
    operatorId: "EMP1001",
  },
  {
    id: "AUD-807",
    timestamp: "2026-08-17 11:30:55",
    sessionId: "SES-9815",
    customerId: "CUST-1049",
    customerName: "Vikram Malhotra",
    locker: "L-108",
    faceMatch: true,
    liveness: true,
    riskScore: 11,
    riskLevel: "LOW",
    decision: "APPROVED",
    operatorId: "EMP1002",
  },
  {
    id: "AUD-808",
    timestamp: "2026-08-17 10:15:30",
    sessionId: "SES-9810",
    customerId: "CUST-8812",
    customerName: "Sanjay Singhania",
    locker: "L-109",
    faceMatch: false,
    liveness: false,
    riskScore: 98,
    riskLevel: "HIGH",
    decision: "BLOCKED",
    operatorId: "EMP1001",
  },
];

// -------------------------------------------------------------
// LOCKERS WITH AUTHORIZED USERS (Page 4)
// -------------------------------------------------------------

export const MOCK_LOCKERS: Locker[] = [
  {
    id: "L-102",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-102",
    locker_size: "Large",
    status: "OCCUPIED",
    customer_id: "CUST-4410",
    customer_name: "Rajesh Kumar",
    last_operation_at: "2026-08-17 16:42",
    authorized_users: [
      { id: "AU-1", name: "Rajesh Kumar", relationship: "Self (Primary Holder)", biometricEnrolled: true, authorizationType: "PRIMARY_OWNER", status: "ACTIVE", lastAccess: "2026-08-17 16:42" },
      { id: "AU-2", name: "Sunita Kumar", relationship: "Spouse (Joint Holder)", biometricEnrolled: true, authorizationType: "JOINT_HOLDER", status: "ACTIVE", lastAccess: "2026-08-10 11:20" },
      { id: "AU-3", name: "Amit Kumar", relationship: "Son (Nominee)", biometricEnrolled: false, authorizationType: "NOMINEE", status: "PENDING", lastAccess: "Never" },
    ],
  },
  {
    id: "L-101",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-101",
    locker_size: "Medium",
    status: "OCCUPIED",
    customer_id: "CUST-9012",
    customer_name: "Priya Mehta",
    last_operation_at: "2026-08-17 14:10",
    authorized_users: [
      { id: "AU-4", name: "Priya Mehta", relationship: "Self (Primary Holder)", biometricEnrolled: true, authorizationType: "PRIMARY_OWNER", status: "ACTIVE", lastAccess: "2026-08-17 14:10" },
      { id: "AU-5", name: "Rohan Mehta", relationship: "Brother (Mandate)", biometricEnrolled: true, authorizationType: "MANDATE_HOLDER", status: "ACTIVE", lastAccess: "2026-07-28 15:30" },
    ],
  },
  {
    id: "L-103",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-103",
    locker_size: "Small",
    status: "AVAILABLE",
    customer_id: null,
    customer_name: null,
    last_operation_at: "2026-08-14 10:00",
    authorized_users: [],
  },
  {
    id: "L-104",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-104",
    locker_size: "XL",
    status: "VERIFICATION_PENDING",
    customer_id: "CUST-3189",
    customer_name: "Ananya Sharma",
    last_operation_at: "2026-08-17 16:15",
    authorized_users: [
      { id: "AU-6", name: "Ananya Sharma", relationship: "Self (Primary Holder)", biometricEnrolled: true, authorizationType: "PRIMARY_OWNER", status: "ACTIVE", lastAccess: "2026-08-17 16:15" },
    ],
  },
  {
    id: "L-105",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-105",
    locker_size: "Medium",
    status: "MAINTENANCE",
    customer_id: null,
    customer_name: null,
    last_operation_at: "2026-08-12 18:00",
    authorized_users: [],
  },
  {
    id: "L-106",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-106",
    locker_size: "Executive",
    status: "RESTRICTED",
    customer_id: "CUST-7721",
    customer_name: "Unknown Claimant",
    last_operation_at: "2026-08-17 14:55",
    authorized_users: [
      { id: "AU-7", name: "Kunal Singhal", relationship: "Self (Frozen)", biometricEnrolled: false, authorizationType: "PRIMARY_OWNER", status: "SUSPENDED", lastAccess: "2026-06-15 09:40" },
    ],
  },
  {
    id: "L-107",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-107",
    locker_size: "Small",
    status: "AVAILABLE",
    customer_id: null,
    customer_name: null,
    last_operation_at: "2026-08-01 10:00",
    authorized_users: [],
  },
  {
    id: "L-108",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-108",
    locker_size: "Medium",
    status: "OCCUPIED",
    customer_id: "CUST-1049",
    customer_name: "Vikram Malhotra",
    last_operation_at: "2026-08-17 15:48",
    authorized_users: [
      { id: "AU-8", name: "Vikram Malhotra", relationship: "Self (Primary Holder)", biometricEnrolled: true, authorizationType: "PRIMARY_OWNER", status: "ACTIVE", lastAccess: "2026-08-17 15:48" },
      { id: "AU-9", name: "Neha Malhotra", relationship: "Spouse", biometricEnrolled: true, authorizationType: "JOINT_HOLDER", status: "ACTIVE", lastAccess: "2026-08-02 12:15" },
    ],
  },
  {
    id: "L-109",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-109",
    locker_size: "Large",
    status: "RESTRICTED",
    customer_id: "CUST-8812",
    customer_name: "Sanjay Singhania",
    last_operation_at: "2026-08-17 15:20",
    authorized_users: [
      { id: "AU-10", name: "Sanjay Singhania", relationship: "Self (Primary Holder)", biometricEnrolled: true, authorizationType: "PRIMARY_OWNER", status: "SUSPENDED", lastAccess: "2026-08-17 15:20" },
    ],
  },
  {
    id: "L-110",
    branch_id: "b1",
    branch_name: "Pune Camp",
    locker_number: "L-110",
    locker_size: "Medium",
    status: "AVAILABLE",
    customer_id: null,
    customer_name: null,
    last_operation_at: "2026-08-05 12:40",
    authorized_users: [],
  },
];

// Preserved for legacy routes if accessed
export const MOCK_REQUESTS: LockerRequest[] = [
  { id: "REQ-8021", locker_id: "L-102", customer_id: "Rajesh Kumar (CUST-4410)", request_type: "Locker Access Visit", status: "APPROVED", requested_at: "2026-08-17 16:40", scheduled_at: "2026-08-17 16:42", approved_by: "EMP1001", completed_at: null, rejection_reason: null, correlation_id: "CORR-9921-X" },
  { id: "REQ-8022", locker_id: "L-104", customer_id: "Ananya Sharma (CUST-3189)", request_type: "Locker Verification", status: "VERIFICATION_PENDING", requested_at: "2026-08-17 16:10", scheduled_at: "2026-08-17 16:15", approved_by: null, completed_at: null, rejection_reason: null, correlation_id: "CORR-9922-Y" },
  { id: "REQ-8023", locker_id: "L-108", customer_id: "Vikram Malhotra (CUST-1049)", request_type: "Routine Access", status: "APPROVED", requested_at: "2026-08-17 15:40", scheduled_at: "2026-08-17 15:48", approved_by: "EMP1001", completed_at: null, rejection_reason: null, correlation_id: "CORR-9923-Z" },
];

export const MOCK_AUDIT_LOGS: AuditEvent[] = [
  { id: "AUD-1001", actor_id: "EMP1001", actor_role: "BANK_OPERATOR", action: "AI_BIOMETRIC_FACE_MATCH_PASSED", entity_type: "VERIFICATION_SESSION", entity_id: "SES-9821", previous_state: "VERIFYING", new_state: "APPROVED", event_metadata: { confidence: 98.4, liveness: true, risk_score: 12 }, correlation_id: "CORR-9921-X", created_at: "2026-08-17 16:42:15" },
  { id: "AUD-1002", actor_id: "EMP1001", actor_role: "BANK_OPERATOR", action: "LOCKER_ACCESS_AUTHORIZED", entity_type: "LOCKER", entity_id: "L-102", previous_state: "OCCUPIED", new_state: "ACCESS_ACTIVE", event_metadata: { bay: "Bay-A-02", terminal: "TERM-PUNE-01" }, correlation_id: "CORR-9921-X", created_at: "2026-08-17 16:42:30" },
  { id: "AUD-1003", actor_id: "EMP1002", actor_role: "BANK_OPERATOR", action: "LIVENESS_FAILURE_TRIGGERED_REVIEW", entity_type: "VERIFICATION_SESSION", entity_id: "SES-9824", previous_state: "VERIFYING", new_state: "REVIEW", event_metadata: { liveness: false, risk_score: 94 }, correlation_id: "CORR-9924-R", created_at: "2026-08-17 15:20:45" },
];
