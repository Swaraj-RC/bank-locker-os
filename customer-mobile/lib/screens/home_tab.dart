import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../widgets/app_card.dart';
import '../widgets/status_badge.dart';
import 'request_access_screen.dart';
import 'request_tracking_screen.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  LockerModel? _locker;
  List<LockerRequestModel> _requests = [];
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
        _requests = (requestsData as List).map((e) => LockerRequestModel.fromJson(e)).toList();
      });
    } catch (_) {
      // Keep screen usable even if a fetch fails; user can pull to refresh.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().user;
    final activeRequest = _requests.where((r) => ![
          'COMPLETED', 'REJECTED', 'EXPIRED', 'CANCELLED'
        ].contains(r.status)).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Hello, ${user?.fullName.split(' ').first ?? ''}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.primary)),
          const Text('Here is what\'s happening with your locker', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 20),

          if (_loading) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),

          if (!_loading && _locker != null)
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Locker ${_locker!.lockerNumber}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      StatusBadge(status: _locker!.status),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('Size: ${_locker!.lockerSize}', style: const TextStyle(color: Colors.grey)),
                  if (_locker!.lastOperationAt != null)
                    Text('Last activity: ${_locker!.lastOperationAt}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  const SizedBox(height: 14),
                  if (activeRequest.isEmpty)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.lock_open, size: 18),
                        label: const Text('Request Access'),
                        onPressed: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => RequestAccessScreen(locker: _locker!)),
                          );
                          _load();
                        },
                      ),
                    )
                  else
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.timeline, size: 18),
                        label: const Text('Track Active Request'),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => RequestTrackingScreen(requestId: activeRequest.first.id)),
                          ).then((_) => _load());
                        },
                      ),
                    ),
                ],
              ),
            ),

          if (!_loading && _locker == null)
            const AppCard(child: Text('No locker is currently assigned to your account.')),

          const SizedBox(height: 20),
          const Text('Recent Activity', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.primary)),
          const SizedBox(height: 8),
          ..._requests.take(5).map((r) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: AppCard(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r.requestType, style: const TextStyle(fontWeight: FontWeight.w600)),
                          Text(_formatDate(r.requestedAt), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                      StatusBadge(status: r.status),
                    ],
                  ),
                ),
              )),
          if (!_loading && _requests.isEmpty)
            const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('No activity yet.', style: TextStyle(color: Colors.grey))),
        ],
      ),
    );
  }

  String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}
