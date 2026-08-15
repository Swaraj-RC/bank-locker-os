import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/app_card.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile'), automaticallyImplyLeading: false),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: CircleAvatar(
              radius: 36,
              backgroundColor: AppTheme.primary,
              child: Text(
                (user?.fullName ?? '').split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join(),
                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Center(child: Text(user?.fullName ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
          Center(child: Text(user?.role.replaceAll('_', ' ') ?? '', style: const TextStyle(color: Colors.grey))),
          const SizedBox(height: 24),
          AppCard(
            child: Column(
              children: [
                _row('Email', user?.email ?? '—'),
                const Divider(),
                _row('Phone', user?.phone ?? '—'),
                const Divider(),
                _row('Account Status', user?.status ?? '—'),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.logout, size: 18, color: AppTheme.danger),
              label: const Text('Sign Out', style: TextStyle(color: AppTheme.danger)),
              onPressed: () async {
                await auth.logout();
                if (context.mounted) {
                  Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: Colors.grey)),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );
}
