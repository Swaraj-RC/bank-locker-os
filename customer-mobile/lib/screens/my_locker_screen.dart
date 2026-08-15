import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../widgets/app_card.dart';
import '../widgets/status_badge.dart';

class MyLockerScreen extends StatefulWidget {
  const MyLockerScreen({super.key});

  @override
  State<MyLockerScreen> createState() => _MyLockerScreenState();
}

class _MyLockerScreenState extends State<MyLockerScreen> {
  LockerModel? _locker;
  List<LockerRequestModel> _history = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final lockerData = await ApiClient.get('/api/v1/customers/me/locker');
      final requestsData = await ApiClient.get('/api/v1/customers/me/requests');
      setState(() {
        _locker = lockerData != null ? LockerModel.fromJson(lockerData) : null;
        _history = (requestsData as List)
            .map((e) => LockerRequestModel.fromJson(e))
            .where((r) => r.status == 'COMPLETED')
            .toList();
      });
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Locker')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_locker == null)
                    const AppCard(child: Text('No locker is currently assigned to your account.'))
                  else ...[
                    AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Locker ${_locker!.lockerNumber}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                              StatusBadge(status: _locker!.status),
                            ],
                          ),
                          const Divider(height: 24),
                          _row('Branch ID', _locker!.branchId.substring(0, 8)),
                          _row('Locker Size', _locker!.lockerSize),
                          _row('Status', _locker!.status.replaceAll('_', ' ')),
                          _row('Last Operation', _locker!.lastOperationAt?.toString().split('.').first ?? '—'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text('Locker History', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary)),
                    const SizedBox(height: 8),
                    ..._history.map((r) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: AppCard(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(r.requestType),
                                Text(r.completedAt?.toString().split(' ').first ?? '', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                          ),
                        )),
                    if (_history.isEmpty)
                      const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('No completed operations yet.', style: TextStyle(color: Colors.grey))),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: Colors.grey)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );
}
