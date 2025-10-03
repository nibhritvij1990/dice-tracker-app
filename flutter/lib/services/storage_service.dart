import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const _gamesKey = 'dice_tracker_games';
  static const _currentGameIdKey = 'dice_tracker_current_game_id';

  static String dataKey(String id) => 'dice_tracker_game_$id';

  Future<SharedPreferences> get _prefs async => SharedPreferences.getInstance();

  Future<List<Map<String, dynamic>>> getGames() async {
    final p = await _prefs;
    final raw = p.getString(_gamesKey);
    if (raw == null) return [];
    try { return (jsonDecode(raw) as List).cast<Map>().map((e) => e.cast<String, dynamic>()).toList(); } catch (_) { return []; }
  }

  Future<void> saveGames(List<Map<String, dynamic>> list) async {
    final p = await _prefs;
    await p.setString(_gamesKey, jsonEncode(list));
  }

  Future<String?> getCurrentId() async {
    final p = await _prefs;
    return p.getString(_currentGameIdKey);
  }

  Future<void> setCurrentId(String id) async {
    final p = await _prefs;
    await p.setString(_currentGameIdKey, id);
  }

  Future<Map<String, dynamic>> getData(String id) async {
    final p = await _prefs;
    final raw = p.getString(dataKey(id));
    if (raw == null) return { 'rolls': [] };
    try { return (jsonDecode(raw) as Map).cast<String, dynamic>(); } catch (_) { return { 'rolls': [] }; }
  }

  Future<void> saveData(String id, Map<String, dynamic> data) async {
    final p = await _prefs;
    await p.setString(dataKey(id), jsonEncode(data));
  }

  Future<List<Map<String, dynamic>>> getRolls(String id) async {
    final data = await getData(id);
    final rolls = (data['rolls'] as List?) ?? [];
    return rolls.cast<Map>().map((e) => e.cast<String, dynamic>()).toList();
  }

  Future<void> addRoll(String id, Map<String, dynamic> roll) async {
    final data = await getData(id);
    final rolls = (data['rolls'] as List?) ?? [];
    rolls.add(roll);
    data['rolls'] = rolls;
    await saveData(id, data);
  }

  // Export/import all shared preferences (string-only snapshot)
  Future<Map<String, String>> dumpAll() async {
    final p = await _prefs;
    final keys = p.getKeys();
    final out = <String, String>{};
    for (final k in keys) {
      final v = p.get(k);
      if (v is String) out[k] = v;
    }
    return out;
  }

  Future<void> restoreAll(Map<String, String> data) async {
    final p = await _prefs;
    // naive strategy: clear only our app keys
    final keys = p.getKeys().where((k) => k.startsWith('dice_tracker_'));
    for (final k in keys) { await p.remove(k); }
    for (final e in data.entries) {
      await p.setString(e.key, e.value);
    }
  }
}


