import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Base URL for the FastAPI backend.
/// - Android emulator uses 10.0.2.2 to reach the host machine's localhost.
/// - iOS simulator / web / desktop can use localhost directly.
/// Override at build time with --dart-define=API_BASE_URL=... for real devices.
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8000',
);

class ApiException implements Exception {
  final String code;
  final String message;
  final int statusCode;
  ApiException(this.code, this.message, this.statusCode);

  @override
  String toString() => message;
}

/// Thin REST client. Every backend operation returns the standard
/// {success, data, message} / {success, error:{code,message}} envelope —
/// this class normalizes that into either a return value or a thrown
/// ApiException, so screens never touch raw HTTP status codes.
class ApiClient {
  static Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = {'Content-Type': 'application/json'};
    if (auth) {
      final token = await _token();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static dynamic _unwrap(http.Response resp) {
    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    if (resp.statusCode >= 200 && resp.statusCode < 300 && body['success'] == true) {
      return body['data'];
    }
    final err = body['error'] as Map<String, dynamic>?;
    throw ApiException(
      err?['code'] ?? 'UNKNOWN_ERROR',
      err?['message'] ?? 'Something went wrong. Please try again.',
      resp.statusCode,
    );
  }

  static Future<dynamic> get(String path, {Map<String, String>? query}) async {
    var uri = Uri.parse('$kApiBaseUrl$path');
    if (query != null) uri = uri.replace(queryParameters: query);
    final resp = await http.get(uri, headers: await _headers());
    return _unwrap(resp);
  }

  static Future<dynamic> post(String path, {Map<String, dynamic>? body, bool auth = true}) async {
    final uri = Uri.parse('$kApiBaseUrl$path');
    final resp = await http.post(uri, headers: await _headers(auth: auth), body: jsonEncode(body ?? {}));
    return _unwrap(resp);
  }
}
