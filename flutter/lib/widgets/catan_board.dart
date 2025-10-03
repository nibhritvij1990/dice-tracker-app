import 'package:flutter/material.dart';
import '../models/catan.dart';
import 'catan_widgets.dart';

class CatanBoard extends StatelessWidget {
  final List<List<Tile>> board; // columns or rows depending on players
  final int players;
  const CatanBoard({super.key, required this.board, required this.players});

  @override
  Widget build(BuildContext context) {
    const tileW = 84.0;
    const tileH = 74.0;
    const dx = tileW * 0.74;
    const dy = tileH * 0.98;
    final maxLen = players == 6
        ? [3, 4, 5, 6, 5, 4, 3].reduce((a, b) => a > b ? a : b)
        : players == 5
            ? [4, 5, 6, 5, 4].reduce((a, b) => a > b ? a : b)
            : 5;
    final containerWidth = players == 6 ? tileW + dx * (7 - 1) : tileW + dx * (5 - 1);
    final containerHeight = tileH + dy * (maxLen - 1);

    // If players==4 and board appears as 5 rows [3,4,5,4,3], transform to columns for rendering
    List<List<Tile>> asColumns(List<List<Tile>> rows) {
      const startIndexByRow = [0, 1, 0, 0, 2];
      final maxCols = 5;
      final cols = List.generate(maxCols, (_) => <Tile>[]);
      for (var r = 0; r < rows.length; r++) {
        final row = rows[r];
        final start = startIndexByRow[r];
        for (var j = 0; j < row.length; j++) {
          final absC = start + j;
          if (absC >= 0 && absC < maxCols) {
            cols[absC].add(row[j]);
          }
        }
      }
      return cols;
    }

    List<List<Tile>> columnsBoard = board;
    final is4pRowShape = players == 4 &&
        board.length == 5 &&
        board[0].length == 3 &&
        board[1].length == 4 &&
        board[2].length == 5;
    if (is4pRowShape) {
      columnsBoard = asColumns(board);
    }

    return SizedBox(
      width: containerWidth,
      height: containerHeight + 45,
      child: Stack(children: [
        // subtle water texture background
        Positioned.fill(
          child: Opacity(
            opacity: 0.12,
            child: Image.asset(
              'assets/images/water.webp',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Image.asset('assets/images/water.png', fit: BoxFit.cover),
            ),
          ),
        ),
        // soft hex frame background
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.white.withOpacity(0.08), Colors.transparent],
                ),
              ),
            ),
          ),
        ),
        // Treat board as columns by default
        for (int c = 0; c < columnsBoard.length; c++) ...[
          for (int i = 0; i < columnsBoard[c].length; i++) ...[
            Positioned(
              left: c * dx,
              top: (maxLen - columnsBoard[c].length) * (dy / 2) + i * dy,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  HexTile(terrain: columnsBoard[c][i].terrain, number: columnsBoard[c][i].number),
                  if (columnsBoard[c][i].terrain != Terrain.desert && columnsBoard[c][i].number != null)
                    Positioned(
                      child: NumberToken(value: columnsBoard[c][i].number!),
                    )
                ],
              ),
            )
          ]
        ]
      ]),
    );
  }
}


