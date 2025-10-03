import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../state/auth_state.dart';
import '../widgets/app_scaffold.dart';
import '../widgets/gradient_text.dart';
import '../widgets/glass_card.dart';

class StartScreen extends StatelessWidget {
  const StartScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return AppScaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            GradientText('Dice', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            SizedBox(width: 4),
            Text('Tracker', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          ],
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Center(
        child: GlassCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Welcome', style: TextStyle(fontSize: 18)),
              const SizedBox(height: 12),
              if (!auth.isAuthenticated)
                FilledButton.icon(
                  onPressed: auth.signIn,
                  icon: const Icon(Icons.login),
                  label: const Text('Sign in with Google'),
                )
              else
                const CircleAvatar(radius: 28, child: Icon(Icons.check)),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => context.go('/home'),
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Enter'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
