import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import 'api_client.dart';

/// Holds the logged-in user + session tokens, backed by SharedPreferences so
/// the session survives app restarts. Notifies listeners so the router can
/// react to login/logout.
class AuthService extends ChangeNotifier {
  AppUser? _user;
  AppUser? get user => _user;
  bool get isLoggedIn => _user != null;

  Future<void> restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    if (token == null) return;
    try {
      final data = await ApiClient.get('/api/v1/customers/me');
      _user = AppUser.fromJson(data);
      notifyListeners();
    } catch (_) {
      await logout();
    }
  }

  Future<void> login(String email, String password) async {
    final data = await ApiClient.post(
      '/api/v1/auth/login',
      body: {'email': email, 'password': password},
      auth: false,
    );
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', data['access_token']);
    await prefs.setString('refresh_token', data['refresh_token']);
    _user = AppUser.fromJson(data['user']);
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
    _user = null;
    notifyListeners();
    try {
      await ApiClient.post('/api/v1/auth/logout');
    } catch (_) {
      // best-effort; local session is already cleared
    }
  }
}
