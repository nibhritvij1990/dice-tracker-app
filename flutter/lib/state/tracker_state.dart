import 'dart:math';
import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import 'games_state.dart';

class TrackerState extends ChangeNotifier {
  final StorageService _storage = StorageService();
  final GamesState gamesState;
  TrackerState(this.gamesState);

  List<Map<String, dynamic>> rolls = [];

  Future<void> load() async {
    final id = gamesState.currentId;
    if (id == null) return;
    rolls = await _storage.getRolls(id);
    notifyListeners();
  }

  Future<void> rollDice({String source = 'virtual'}) async {
    final a = Random().nextInt(6) + 1;
    final b = Random().nextInt(6) + 1;
    final total = a + b;
    final entry = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'total': total,
      'dice': [a, b],
      'source': source,
      'ts': DateTime.now().millisecondsSinceEpoch,
    };
    final id = gamesState.currentId;
    if (id == null) return;
    await _storage.addRoll(id, entry);
    rolls.add(entry);
    notifyListeners();
  }

  Map<int, int> get histogram {
    final h = <int, int>{ for (var i=2;i<=12;i++) i:0 };
    for (final r in rolls) {
      final t = (r['total'] as num).toInt();
      h[t] = (h[t] ?? 0) + 1;
    }
    return h;
  }
}


