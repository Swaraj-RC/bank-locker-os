import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../widgets/app_card.dart';
import 'request_tracking_screen.dart';

class RequestAccessScreen extends StatefulWidget {
  final LockerModel locker;
  const RequestAccessScreen({super.key, required this.locker});

  @override
  State<RequestAccessScreen> createState() => _RequestAccessScreenState();
}

class _RequestAccessScreenState extends State<RequestAccessScreen> {
  String _requestType = 'ACCESS';
  bool _submitting = false;
  String? _error;

  final _types = const [
    {'value': 'ACCESS', 'label': 'Locker Access', 'icon': Icons.lock_open},
    {'value': 'INSPECTION', 'label': 'Inspection', 'icon': Icons.search},
  ];

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final data = await ApiClient.post('/api/v1/requests', body: {
        'locker_id': widget.locker.id,
        'request_type': _requestType,
      });
      final request = LockerRequestModel.fromJson(data);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => RequestTrackingScreen(requestId: request.id)),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Unable to submit your request right now. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Request Access')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppCard(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Locker ${widget.locker.lockerNumber}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  Text(widget.locker.lockerSize, style: const TextStyle(color: Colors.grey)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Select Operation', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary)),
            const SizedBox(height: 10),
            ..._types.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    onTap: () => setState(() => _requestType = t['value'] as String),
                    borderRadius: BorderRadius.circular(12),
                    child: AppCard(
                      child: Row(
                        children: [
                          Icon(t['icon'] as IconData, color: _requestType == t['value'] ? AppTheme.info : Colors.grey),
                          const SizedBox(width: 12),
                          Expanded(child: Text(t['label'] as String, style: const TextStyle(fontWeight: FontWeight.w600))),
                          if (_requestType == t['value']) const Icon(Icons.check_circle, color: AppTheme.info, size: 20),
                        ],
                      ),
                    ),
                  ),
                )),
            const Spacer(),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                  child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Confirm & Submit Request'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
