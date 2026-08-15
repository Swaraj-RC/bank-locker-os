export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  branch_id: string | null;
  status: string;
}

export interface LockerModel {
  id: string;
  branch_id: string;
  locker_number: string;
  locker_size: string;
  status: string;
  customer_id: string | null;
  last_operation_at: string | null;
}

export interface LockerRequestModel {
  id: string;
  locker_id: string;
  customer_id: string;
  request_type: string;
  status: string;
  requested_at: string;
  scheduled_at: string | null;
  completed_at: string | null;
  rejection_reason: string | null;
  correlation_id: string;
}

export interface NotificationModel {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}
