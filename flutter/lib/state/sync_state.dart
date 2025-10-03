import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import 'package:provider/provider.dart';
import '../services/drive_service.dart';
import 'auth_state.dart';
import '../services/storage_service.dart';
import 'games_state.dart';

class SyncState extends ChangeNotifier {
  DateTime? _lastBackupAt;
  bool _autoBackupEnabled = false;

  DateTime? get lastBackupAt => _lastBackupAt;
  bool get autoBackupEnabled => _autoBackupEnabled;

  String get lastBackupLabel =>
      _lastBackupAt != null ? DateFormat.yMd().add_jm().format(_lastBackupAt!) : '—';

  void setAutoBackupEnabled(bool v) {
    _autoBackupEnabled = v;
    notifyListeners();
  }

  Future<void> backup([BuildContext? context]) async {
    _lastBackupAt = DateTime.now();
    notifyListeners();
    if (kIsWeb || context == null) return;
    final auth = context.read<AuthState>();
    final token = await auth.getAccessToken();
    if (token == null) return;
    final drive = DriveService({'Authorization': 'Bearer $token'});
    final storage = StorageService();
    final snapshot = await storage.dumpAll();
    await drive.createOrUpdateJson('app_data.json', { 'snapshot': snapshot, 'ts': DateTime.now().millisecondsSinceEpoch });
  }

  Future<void> restore([BuildContext? context]) async {
    notifyListeners();
    if (kIsWeb || context == null) return;
    final auth = context.read<AuthState>();
    final token = await auth.getAccessToken();
    if (token == null) return;
    final drive = DriveService({'Authorization': 'Bearer $token'});
    final js = await drive.readJson('app_data.json');
    if (js == null) return;
    final snap = (js['snapshot'] as Map?)?.cast<String, dynamic>();
    if (snap == null) return;
    final storage = StorageService();
    final Map<String, String> normalized = {};
    for (final e in snap.entries) {
      final k = e.key;
      final v = e.value;
      if (v is String) {
        normalized[k] = v;
      } else if (v is Map || v is List) {
        normalized[k] = jsonEncode(v);
      } else {
        normalized[k] = v.toString();
      }
    }
    await storage.restoreAll(normalized);
  }

  Future<void> exportJson() async {
    // TODO: implement file export
  }

  Future<void> importJson() async {
    // TODO: implement file import
  }
}


