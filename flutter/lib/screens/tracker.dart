import 'package:flutter/material.dart';
import '../widgets/app_scaffold.dart';
import '../widgets/gradient_text.dart';
import '../widgets/sidebar_panel.dart';
import '../widgets/bottom_nav.dart';
import 'package:provider/provider.dart';
import '../state/tracker_state.dart';
import '../widgets/glass_card.dart';

class TrackerScreen extends StatelessWidget {
  const TrackerScreen({super.key});
  @override
  Widget build(BuildContext context) {
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
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            GlassCard(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Dice Roller'),
                  FilledButton.icon(
                    onPressed: () => context.read<TrackerState>().rollDice(),
                    icon: const Icon(Icons.casino),
                    label: const Text('Roll'),
                  )
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: GlassCard(
                child: Consumer<TrackerState>(
                  builder: (_, state, __) {
                    final h = state.histogram;
                    final max = h.values.fold<int>(0, (m, v) => v > m ? v : m);
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        for (var n = 2; n <= 12; n++)
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Container(
                                  height: max > 0 ? 8.0 + (h[n]! / max) * 120.0 : 8.0,
                                  decoration: BoxDecoration(
                                    color: n == 6 || n == 8 ? const Color(0xFFB6116B) : Colors.white.withOpacity(0.7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text('$n', style: const TextStyle(fontSize: 12)),
                              ],
                            ),
                          )
                      ],
                    );
                  },
                ),
              ),
            )
          ],
        ),
      ),
      bottomNav: const BottomNav(index: 1),
    );
  }
}
