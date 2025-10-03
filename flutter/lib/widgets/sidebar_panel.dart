import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';
import '../state/sync_state.dart';
import '../state/games_state.dart';

class SidebarPanel extends StatelessWidget {
  const SidebarPanel({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final sync = context.watch<SyncState>();
    final games = context.watch<GamesState>();
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              const Icon(Icons.tune, color: Colors.white),
              const SizedBox(width: 8),
              const Text('Settings', style: TextStyle(fontSize: 16)),
              const Spacer(),
              IconButton(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.close),
              )
            ],
          ),
          const SizedBox(height: 12),
          if (auth.isAuthenticated) ...[
            Row(
              children: [
                CircleAvatar(backgroundImage: auth.imageProvider, radius: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(auth.displayName ?? auth.email ?? 'User',
                          overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Text(auth.email ?? '',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ),
                TextButton(onPressed: auth.signOut, child: const Text('Sign out')),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Current game', style: TextStyle(fontSize: 12, color: Colors.white70)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                border: Border.all(color: Colors.white10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                games.games.firstWhere((g) => g['id'] == games.currentId, orElse: () => {'name': '—'})['name'] as String,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                FilledButton(onPressed: () => games.createGame(DateTime.now().toString()), child: const Text('New game')),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Load game', style: TextStyle(fontSize: 12, color: Colors.white70)),
            const SizedBox(height: 8),
            SizedBox(
              height: 220,
              child: ListView.builder(
                itemCount: games.recentGames.length,
                itemBuilder: (_, i) {
                  final g = games.recentGames[i];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      border: Border.all(color: Colors.white10),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => games.setCurrent(g['id'] as String),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(g['name'] as String, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 2),
                                  Text(
                                    DateTime.fromMillisecondsSinceEpoch((g['updatedAt'] ?? 0) as int).toLocal().toString(),
                                    style: const TextStyle(fontSize: 10, color: Colors.white70),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Rename',
                          onPressed: () async {
                            final controller = TextEditingController(text: g['name'] as String);
                            await showDialog(
                              context: context,
                              builder: (_) => AlertDialog(
                                title: const Text('Rename game'),
                                content: TextField(controller: controller),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                                  TextButton(onPressed: () { Navigator.pop(context); games.renameGame(g['id'] as String, controller.text.trim()); }, child: const Text('Save')),
                                ],
                              ),
                            );
                          },
                          icon: const Icon(Icons.edit),
                        ),
                        IconButton(
                          tooltip: 'Delete',
                          onPressed: () async {
                            final ok = await showDialog<bool>(
                              context: context,
                              builder: (_) => AlertDialog(
                                title: const Text('Delete game?'),
                                content: const Text('This action cannot be undone.'),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                  TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                                ],
                              ),
                            );
                            if (ok == true) { games.deleteGame(g['id'] as String); }
                          },
                          icon: const Icon(Icons.delete),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
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
                Switch(
                  value: sync.autoBackupEnabled,
                  onChanged: sync.setAutoBackupEnabled,
                ),
                const SizedBox(width: 8),
                const Text('Auto backup'),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: [
              FilledButton(onPressed: () => sync.backup(context), child: const Text('Backup')),
              OutlinedButton(onPressed: () => sync.restore(context), child: const Text('Restore')),
              OutlinedButton(onPressed: sync.exportJson, child: const Text('Export file')),
              OutlinedButton(onPressed: sync.importJson, child: const Text('Import file')),
            ]),
          ] else ...[
            FilledButton.icon(
              onPressed: context.read<AuthState>().signIn,
              icon: const Icon(Icons.login),
              label: const Text('Sign in with Google'),
            ),
          ]
        ],
      ),
    );
  }
}


