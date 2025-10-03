import 'dart:math';

enum Terrain { forest, pasture, fields, hills, mountains, desert }

class Tile {
  final Terrain terrain;
  final int? number; // null for desert
  Tile({required this.terrain, required this.number});
}

List<List<Tile>> generateBoard4(int seed) {
  final rand = Random(seed);
  final bag = <Terrain>[
    ...List.filled(4, Terrain.forest),
    ...List.filled(4, Terrain.pasture),
    ...List.filled(4, Terrain.fields),
    ...List.filled(3, Terrain.hills),
    ...List.filled(3, Terrain.mountains),
    Terrain.desert,
  ];
  bag.shuffle(rand);

  // rows 3,4,5,4,3
  final rows = [3, 4, 5, 4, 3];
  final tiles = <List<Tile>>[];
  var idx = 0;
  for (final n in rows) {
    final row = <Tile>[];
    for (var i = 0; i < n; i++) {
      row.add(Tile(terrain: bag[idx++], number: null));
    }
    tiles.add(row);
  }

  const numberOrder4 = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
  const outer = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [4, 1],
    [4, 2],
    [3, 3],
    [2, 4],
    [1, 3],
    [0, 2],
    [0, 1],
  ];
  const inner = [
    [1, 1],
    [2, 1],
    [3, 1],
    [3, 2],
    [2, 3],
    [1, 2],
  ];
  const center = [
    [2, 2]
  ];
  final spiralAbs = [...outer, ...inner, ...center];
  final startIndexByRowMap = [0, 1, 0, 0, 2];
  final columns = List.generate(5, (_) => <Map<String, int>>[]);
  for (var r = 0; r < tiles.length; r++) {
    final row = tiles[r];
    final start = startIndexByRowMap[r];
    for (var c = 0; c < row.length; c++) {
      final x = start + c;
      columns[x].add({'r': r, 'c': c});
    }
  }
  var ni = 0;
  for (final pair in spiralAbs) {
    final x = pair[0];
    final y = pair[1];
    final pos = (y < columns[x].length) ? columns[x][y] : null;
    if (pos == null) continue;
    final t = tiles[pos['r']!][pos['c']!];
    if (t.terrain != Terrain.desert) {
      tiles[pos['r']!][pos['c']!] = Tile(terrain: t.terrain, number: numberOrder4[ni++]);
      if (ni >= numberOrder4.length) break;
    }
  }
  return tiles;
}

List<List<Tile>> generateBoard5(int seed) {
  final rand = Random(seed);
  final bag = <Terrain>[
    ...List.filled(5, Terrain.forest),
    ...List.filled(5, Terrain.pasture),
    ...List.filled(5, Terrain.fields),
    ...List.filled(4, Terrain.hills),
    ...List.filled(4, Terrain.mountains),
    Terrain.desert,
  ];
  bag.shuffle(rand);
  const columnsHeights = [4, 5, 6, 5, 4];
  final cols = List.generate(columnsHeights.length,
      (x) => List.generate(columnsHeights[x], (y) => Tile(terrain: Terrain.desert, number: null)));
  var bi = 0;
  for (var x = 0; x < cols.length; x++) {
    for (var y = 0; y < cols[x].length; y++) {
      cols[x][y] = Tile(terrain: bag[bi++], number: null);
    }
  }
  const numberOrder5 = [2, 5, 4, 6, 3, 9, 8, 11, 11, 10, 6, 3, 8, 4, 8, 10, 11, 12, 10, 5, 4, 9, 5];
  const spiral5 = [
    [0, 3],
    [0, 2],
    [0, 1],
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [3, 4],
    [2, 5],
    [1, 4],
    [1, 3],
    [1, 2],
    [1, 1],
    [2, 1],
    [3, 1],
    [3, 2],
    [3, 3],
    [2, 4],
    [2, 3],
  ];
  var ni = 0;
  for (final p in spiral5) {
    final x = p[0];
    final y = p[1];
    if (x < 0 || x >= cols.length) continue;
    if (y < 0 || y >= cols[x].length) continue;
    final t = cols[x][y];
    if (t.terrain != Terrain.desert) {
      cols[x][y] = Tile(terrain: t.terrain, number: numberOrder5[ni++]);
      if (ni >= numberOrder5.length) break;
    }
  }
  return cols;
}

List<List<Tile>> generateBoard6(int seed) {
  final rand = Random(seed);
  final bag = <Terrain>[
    ...List.filled(6, Terrain.forest),
    ...List.filled(6, Terrain.pasture),
    ...List.filled(6, Terrain.fields),
    ...List.filled(5, Terrain.hills),
    ...List.filled(5, Terrain.mountains),
    ...List.filled(2, Terrain.desert),
  ];
  bag.shuffle(rand);
  const columnsHeights = [3, 4, 5, 6, 5, 4, 3];
  final cols = List.generate(columnsHeights.length,
      (x) => List.generate(columnsHeights[x], (y) => Tile(terrain: Terrain.desert, number: null)));
  var bi = 0;
  for (var x = 0; x < cols.length; x++) {
    for (var y = 0; y < cols[x].length; y++) {
      cols[x][y] = Tile(terrain: bag[bi++], number: null);
    }
  }
  const numberOrder6 = [2, 5, 4, 6, 3, 9, 8, 11, 11, 10, 6, 3, 8, 4, 8, 10, 11, 12, 10, 5, 4, 9, 5, 9, 12, 3, 2, 6];
  const spiral6 = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
    [6, 0],
    [6, 1],
    [6, 2],
    [5, 3],
    [4, 4],
    [3, 5],
    [2, 4],
    [1, 3],
    [0, 2],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
    [5, 2],
    [4, 3],
    [3, 4],
    [2, 3],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [3, 3],
  ];
  var ni = 0;
  for (final p in spiral6) {
    final x = p[0];
    final y = p[1];
    if (x < 0 || x >= cols.length) continue;
    if (y < 0 || y >= cols[x].length) continue;
    final t = cols[x][y];
    if (t.terrain != Terrain.desert) {
      cols[x][y] = Tile(terrain: t.terrain, number: numberOrder6[ni++]);
      if (ni >= numberOrder6.length) break;
    }
  }
  return cols;
}


