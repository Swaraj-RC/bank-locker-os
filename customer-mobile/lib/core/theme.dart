import 'package:flutter/material.dart';

/// Banking-grade Material 3 theme matching the admin portal's design
/// language (Section 24/25 of the spec) so both apps feel like one product.
class AppTheme {
  static const primary = Color(0xFF0F172A);
  static const bg = Color(0xFFF8FAFC);
  static const surface = Color(0xFFFFFFFF);
  static const borderColor = Color(0xFFE2E8F0);
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFD97706);
  static const danger = Color(0xFFDC2626);
  static const info = Color(0xFF2563EB);

  static ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: bg,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        surface: surface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        foregroundColor: primary,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: borderColor),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: borderColor),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }

  static Color statusColor(String status) {
    switch (status) {
      case 'AVAILABLE':
      case 'COMPLETED':
        return success;
      case 'VERIFICATION_PENDING':
      case 'TOKEN_A_VERIFIED':
      case 'TOKEN_B_VERIFIED':
      case 'APPROVAL_PENDING':
      case 'MAINTENANCE':
        return warning;
      case 'ACCESS_ACTIVE':
      case 'APPROVED':
        return info;
      case 'REJECTED':
      case 'EXPIRED':
      case 'RESTRICTED':
        return danger;
      default:
        return Colors.grey;
    }
  }
}
