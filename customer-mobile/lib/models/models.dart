class AppUser {
  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String role;
  final String? branchId;
  final String status;

  AppUser({
    required this.id, required this.fullName, required this.email,
    required this.phone, required this.role, this.branchId, required this.status,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'], fullName: j['full_name'], email: j['email'], phone: j['phone'],
        role: j['role'], branchId: j['branch_id'], status: j['status'],
      );
}

class LockerModel {
  final String id;
  final String branchId;
  final String lockerNumber;
  final String lockerSize;
  final String status;
  final String? customerId;
  final DateTime? lastOperationAt;

  LockerModel({
    required this.id, required this.branchId, required this.lockerNumber,
    required this.lockerSize, required this.status, this.customerId, this.lastOperationAt,
  });

  factory LockerModel.fromJson(Map<String, dynamic> j) => LockerModel(
        id: j['id'], branchId: j['branch_id'], lockerNumber: j['locker_number'],
        lockerSize: j['locker_size'], status: j['status'], customerId: j['customer_id'],
        lastOperationAt: j['last_operation_at'] != null ? DateTime.parse(j['last_operation_at']) : null,
      );
}

class LockerRequestModel {
  final String id;
  final String lockerId;
  final String customerId;
  final String requestType;
  final String status;
  final DateTime requestedAt;
  final DateTime? scheduledAt;
  final DateTime? completedAt;
  final String? rejectionReason;
  final String correlationId;

  LockerRequestModel({
    required this.id, required this.lockerId, required this.customerId,
    required this.requestType, required this.status, required this.requestedAt,
    this.scheduledAt, this.completedAt, this.rejectionReason, required this.correlationId,
  });

  factory LockerRequestModel.fromJson(Map<String, dynamic> j) => LockerRequestModel(
        id: j['id'], lockerId: j['locker_id'], customerId: j['customer_id'],
        requestType: j['request_type'], status: j['status'],
        requestedAt: DateTime.parse(j['requested_at']),
        scheduledAt: j['scheduled_at'] != null ? DateTime.parse(j['scheduled_at']) : null,
        completedAt: j['completed_at'] != null ? DateTime.parse(j['completed_at']) : null,
        rejectionReason: j['rejection_reason'], correlationId: j['correlation_id'],
      );
}

class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool read;
  final DateTime createdAt;

  NotificationModel({
    required this.id, required this.title, required this.message,
    required this.type, required this.read, required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> j) => NotificationModel(
        id: j['id'], title: j['title'], message: j['message'], type: j['type'],
        read: j['read'], createdAt: DateTime.parse(j['created_at']),
      );
}
