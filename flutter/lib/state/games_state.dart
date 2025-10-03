import 'package:flutter/material.dart';
import '../services/storage_service.dart';

class GamesState extends ChangeNotifier {
  final StorageService _storage = StorageService();
  List<Map<String, dynamic>> games = [];
  String? currentId;

  Future<void> load() async {
    games = await _storage.getGames();
    currentId = await _storage.getCurrentId();
    if (currentId == null) {
      await createGame(DateTime.now().toIso8601String());
    }
    notifyListeners();
  }

  Future<void> createGame(String name) async {
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final now = DateTime.now().millisecondsSinceEpoch;
    final meta = { 'id': id, 'name': name, 'createdAt': now, 'updatedAt': now };
    games.insert(0, meta);
    await _storage.saveGames(games);
    await _storage.saveData(id, { 'rolls': [] });
    currentId = id;
    await _storage.setCurrentId(id);
    notifyListeners();
  }

  Future<void> renameGame(String id, String name) async {
    final i = games.indexWhere((g) => g['id'] == id);
    if (i >= 0) {
      games[i]['name'] = name;
      games[i]['updatedAt'] = DateTime.now().millisecondsSinceEpoch;
      await _storage.saveGames(games);
      notifyListeners();
    }
  }

  Future<void> deleteGame(String id) async {
    games.removeWhere((g) => g['id'] == id);
    await _storage.saveGames(games);
    if (currentId == id) {
      currentId = games.isNotEmpty ? games.first['id'] as String : null;
      if (currentId != null) await _storage.setCurrentId(currentId!);
    }
    notifyListeners();
  }

  Future<void> setCurrent(String id) async {
    currentId = id;
    await _storage.setCurrentId(id);
    final i = games.indexWhere((g) => g['id'] == id);
    if (i >= 0) {
      games[i]['updatedAt'] = DateTime.now().millisecondsSinceEpoch;
      await _storage.saveGames(games);
    }
    notifyListeners();
  }

  Future<void> touchGame(String id) async {
    final i = games.indexWhere((g) => g['id'] == id);
    if (i >= 0) {
      games[i]['updatedAt'] = DateTime.now().millisecondsSinceEpoch;
      await _storage.saveGames(games);
      notifyListeners();
    }
  }

  List<Map<String, dynamic>> get recentGames {
    final list = [...games];
    list.sort((a,b) => ((b['updatedAt'] ?? 0) as int).compareTo((a['updatedAt'] ?? 0) as int));
    return list.take(10).toList();
  }
}


