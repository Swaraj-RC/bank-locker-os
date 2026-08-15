import 'package:flutter/material.dart';
import 'dart:async';
import '../core/theme.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../widgets/app_card.dart';
import '../widgets/status_badge.dart';

const _steps = ['SUBMITTED', 'VERIFICATION_PENDING', 'APPROVED', 'ACCESS_ACTIVE', 'COMPLETED'];
const _stepLabels = {
  'SUBMITTED': 'Request Submitted',
  'VERIFICATION_PENDING': 'Verification',
  'APPROVED': 'Bank Approval',
  'ACCESS_ACTIVE': 'Access Active',
  'COMPLETED': 'Completed',
};

class RequestTrackingScreen extends StatefulWidget {
  final String requestId;
  const RequestTrackingScreen({super.key, required this.requestId});

  @override
  State<RequestTrackingScreen> createState() => _RequestTrackingScreenState();
}

class _RequestTrackingScreenState extends State<RequestTrackingScreen> {
  LockerRequestModel? _request;
  Timer? _poller;
  final _tokenController = TextEditingController();
  bool _verifying = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _poller = Timer.periodic(const Duration(seconds: 4), (_) => _load());
  }

  @override
  void dispose() {
    _poller?.cancel();
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/api/v1/requests/${widget.requestId}');
      if (mounted) setState(() => _request = LockerRequestModel.fromJson(data));
    } catch (_) {}
  }

  Future<void> _verifyToken() async {
    setState(() {
      _verifying = true;
      _error = null;
    });
    try {
      await ApiClient.post('/api/v1/verification/${widget.requestId}/verify/customer', body: {
        'token': _tokenController.text.trim(),
      });
      _tokenController.clear();
      await _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  int get _currentStepIndex {
    final req = _request;
    if (req == null) return 0;
    if (['TOKEN_A_VERIFIED', 'TOKEN_B_VERIFIED'].contains(req.status)) {
      return _steps.indexOf('VERIFICATION_PENDING');
    }
    final idx = _steps.indexOf(req.status);
    return idx == -1 ? 0 : idx;
  }

  @override
  Widget build(BuildContext context) {
    final req = _request;
    final needsCustomerToken = req?.status == 'VERIFICATION_PENDING';

    return Scaffold(
      appBar: AppBar(title: const Text('Track Request')),
      body: req == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                AppCard(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(req.requestType, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      StatusBadge(status: req.status),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const Text('Progress', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary)),
                const SizedBox(height: 12),
                ..._buildStepper(),
                if (req.status == 'REJECTED') ...[
                  const SizedBox(height: 16),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Request Rejected', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.danger)),
                        const SizedBox(height: 4),
                        Text(req.rejectionReason ?? 'No reason provided.', style: const TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                ],
                if (needsCustomerToken) ...[
                  const SizedBox(height: 20),
                  const Text('Dual Control Verification', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary)),
                  const SizedBox(height: 8),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Enter the 6-digit verification code shared with you by the bank to confirm your identity.',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _tokenController,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          decoration: const InputDecoration(labelText: 'Verification Code', counterText: ''),
                        ),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4, bottom: 8),
                            child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 12)),
                          ),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _verifying ? null : _verifyToken,
                            child: _verifying
                                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Verify'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (['TOKEN_A_VERIFIED'].contains(req.status)) ...[
                  const SizedBox(height: 16),
                  AppCard(
                    child: Row(
                      children: const [
                        Icon(Icons.check_circle, color: AppTheme.success, size: 18),
                        SizedBox(width: 8),
                        Expanded(child: Text('Your identity is verified. Waiting for bank authorization…')),
                      ],
                    ),
                  ),
                ],
                if (['APPROVED', 'ACCESS_ACTIVE', 'COMPLETED'].contains(req.status)) ...[
                  const SizedBox(height: 16),
                  AppCard(
                    child: Row(
                      children: const [
                        Icon(Icons.verified_user, color: AppTheme.success, size: 20),
                        SizedBox(width: 8),
                        Text('ACCESS AUTHORIZED', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.success)),
                      ],
                    ),
                  ),
                ],
              ],
            ),
    );
  }

  List<Widget> _buildStepper() {
    final current = _currentStepIndex;
    final isRejectedOrCancelled = ['REJECTED', 'CANCELLED', 'EXPIRED'].contains(_request?.status);
    return List.generate(_steps.length, (i) {
      final done = i < current || (i == current && _request?.status == 'COMPLETED');
      final active = i == current && !isRejectedOrCancelled;
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          children: [
            Icon(
              done ? Icons.check_circle : (active ? Icons.radio_button_checked : Icons.radio_button_unchecked),
              size: 20,
              color: done || active ? AppTheme.success : Colors.grey.shade400,
            ),
            const SizedBox(width: 10),
            Text(
              _stepLabels[_steps[i]]!,
              style: TextStyle(
                fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                color: done || active ? AppTheme.primary : Colors.grey,
              ),
            ),
          ],
        ),
      );
    });
  }
}
