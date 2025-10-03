import 'package:flutter/material.dart';
import 'catan_board.dart';
import '../models/catan.dart';

class ResponsiveCatanBoard extends StatelessWidget {
  final List<List<Tile>> board;
  final int players;
  const ResponsiveCatanBoard({super.key, required this.board, required this.players});

  @override
  Widget build(BuildContext context) {
    const tileW = 82.0;
    const dx = tileW * 0.75;
    final containerWidth = players == 6 ? tileW + dx * (7 - 1) : tileW + dx * (5 - 1);
    return LayoutBuilder(
      builder: (context, constraints) {
        final dvw = constraints.maxWidth;
        final scale = (dvw.isFinite && dvw > 0) ? (0.925 * dvw / containerWidth) : 1.0;
        return Center(
          child: Transform.scale(
            scale: scale,
            alignment: Alignment.center,
            child: CatanBoard(board: board, players: players),
          ),
        );
      },
    );
  }
}


