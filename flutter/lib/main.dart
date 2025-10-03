import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'screens/splash.dart';
import 'screens/start.dart';
import 'screens/home.dart';
import 'screens/tracker.dart';
import 'screens/profile.dart';
import 'state/auth_state.dart';
import 'state/sync_state.dart';
import 'state/games_state.dart';
import 'state/tracker_state.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const DiceTrackerApp());
}

class DiceTrackerApp extends StatelessWidget {
  const DiceTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      initialLocation: '/splash',
      routes: [
        GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
        GoRoute(path: '/', builder: (_, __) => const StartScreen()),
        GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/tracker', builder: (_, __) => const TrackerScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    );

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()),
        ChangeNotifierProvider(create: (_) => SyncState()),
        ChangeNotifierProvider(create: (_) => GamesState()..load()),
        ChangeNotifierProxyProvider<GamesState, TrackerState>(
          create: (ctx) => TrackerState(ctx.read<GamesState>())..load(),
          update: (ctx, games, prev) => TrackerState(games)..load(),
        ),
      ],
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        title: 'Dice Tracker',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFFB6116B),
            brightness: Brightness.dark,
          ),
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF130B2B),
          navigationBarTheme: NavigationBarThemeData(
            backgroundColor: Colors.white.withOpacity(0.06),
            indicatorColor: const Color(0xFFB6116B).withOpacity(0.25),
            labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12)),
            iconTheme: WidgetStateProperty.all(const IconThemeData(size: 22)),
          ),
        ),
        routerConfig: router,
      ),
    );
  }
}
