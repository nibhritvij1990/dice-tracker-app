import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';
import '../widgets/app_scaffold.dart';
import '../widgets/gradient_text.dart';
import '../widgets/glass_card.dart';
import '../widgets/sidebar_panel.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/responsive_catan_board.dart';
import '../models/catan.dart';
import '../widgets/iridescence.dart';
import '../widgets/laserflow.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int players = 4;
  late List<List<Tile>> board;

  @override
  void initState() {
    super.initState();
    final seed = DateTime.now().millisecondsSinceEpoch;
    board = generateBoard4(seed);
  }

  void regenerate() {
    final seed = DateTime.now().millisecondsSinceEpoch;
    setState(() {
      board = players == 6
          ? generateBoard6(seed)
          : players == 5
              ? generateBoard5(seed)
              : generateBoard4(seed);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return AppScaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back',
          onPressed: null,
          icon: const Opacity(opacity: 0, child: Icon(Icons.arrow_back)),
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            GradientText('Dice', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(width: 4),
            Text('Tracker', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          Builder(
            builder: (context) => IconButton(
              tooltip: 'Options',
              onPressed: () => Scaffold.of(context).openEndDrawer(),
              icon: const Icon(Icons.menu),
            ),
          ),
        ],
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      endDrawer: const Drawer(child: SidebarPanel()),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              GlassCard(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Players'),
                    Row(
                      children: [
                        for (final n in [4,5,6])
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: ChoiceChip(
                              label: Text('$n'),
                              selected: players == n,
                              onSelected: (_) {
                                setState(() { players = n; });
                                regenerate();
                              },
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Stack(
                children: [
                  GlassCard(
                    child: Column(
                      children: [
                        SizedBox(
                          height: 8,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: const Laserflow(),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Stack(
                            children: [
                              Positioned.fill(child: Iridescence(borderRadius: BorderRadius.circular(12), padding: EdgeInsets.zero)),
                              ResponsiveCatanBoard(board: board, players: players),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                          onPressed: regenerate,
                          icon: const Icon(Icons.auto_awesome),
                          label: const Text('Generate Map'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      bottomNav: const BottomNav(index: 0),
    );
  }
}
