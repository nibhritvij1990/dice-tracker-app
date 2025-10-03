import 'package:flutter/material.dart';
import '../widgets/app_scaffold.dart';
import '../widgets/gradient_text.dart';
import '../widgets/sidebar_panel.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/glass_card.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';
import '../state/sync_state.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final sync = context.watch<SyncState>();
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
        child: ListView(
          children: [
            GlassCard(
              child: Row(
                children: [
                  CircleAvatar(backgroundImage: auth.imageProvider, radius: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(auth.displayName ?? 'Guest', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text(auth.email ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      ],
                    ),
                  ),
                  if (auth.isAuthenticated)
                    TextButton(onPressed: auth.signOut, child: const Text('Sign out'))
                  else
                    FilledButton.icon(onPressed: auth.signIn, icon: const Icon(Icons.login), label: const Text('Sign in')),
                ],
              ),
            ),
            const SizedBox(height: 12),
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Backup & Sync', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Last backup:', style: TextStyle(fontSize: 12, color: Colors.white70)),
                      Text(sync.lastBackupLabel, style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Switch(value: sync.autoBackupEnabled, onChanged: sync.setAutoBackupEnabled),
                      const SizedBox(width: 8),
                      const Text('Auto backup'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    FilledButton(onPressed: () => sync.backup(context), child: const Text('Backup')),
                    OutlinedButton(onPressed: () => sync.restore(context), child: const Text('Restore')),
                    OutlinedButton(onPressed: sync.exportJson, child: const Text('Export file')),
                    OutlinedButton(onPressed: sync.importJson, child: const Text('Import file')),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNav: const BottomNav(index: 2),
    );
  }
}
