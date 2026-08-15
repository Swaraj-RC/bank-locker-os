import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/models.dart';
import '../services/api_client.dart';
import '../widgets/app_card.dart';

const _typeIcons = {
  'REQUEST_UPDATE': Icons.assignment_outlined,
  'VERIFICATION': Icons.verified_user_outlined,
  'APPROVAL': Icons.check_circle_outline,
  'REJECTION': Icons.cancel_outlined,
  'SCHEDULED_ACCESS': Icons.schedule_outlined,
  'SYSTEM': Icons.info_outline,
};

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<NotificationModel> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.get('/api/v1/notifications');
      setState(() => _notifications = (data as List).map((e) => NotificationModel.fromJson(e)).toList());
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _markRead(NotificationModel n) async {
    if (n.read) return;
    try {
      await ApiClient.post('/api/v1/notifications/${n.id}/read');
      _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications'), automaticallyImplyLeading: false),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _notifications.isEmpty
                  ? ListView(
                      children: const [
                        Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(child: Text('No notifications yet.', style: TextStyle(color: Colors.grey))),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _notifications.length,
                      itemBuilder: (context, i) {
                        final n = _notifications[i];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () => _markRead(n),
                            child: AppCard(
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(_typeIcons[n.type] ?? Icons.info_outline,
                                      color: n.read ? Colors.grey : AppTheme.info, size: 20),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(n.title, style: TextStyle(fontWeight: n.read ? FontWeight.w500 : FontWeight.w700)),
                                        const SizedBox(height: 2),
                                        Text(n.message, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                  if (!n.read)
                                    Container(
                                      margin: const EdgeInsets.only(left: 8, top: 4),
                                      width: 8, height: 8,
                                      decoration: const BoxDecoration(color: AppTheme.info, shape: BoxShape.circle),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
