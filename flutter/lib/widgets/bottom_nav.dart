import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'icons.dart';

class BottomNav extends StatelessWidget {
  final int index;
  const BottomNav({super.key, required this.index});

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: index,
      destinations: const [
        NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
        NavigationDestination(icon: DiceIcon(color: Colors.white70), selectedIcon: DiceIcon(color: Colors.white), label: 'Tracker'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: ProfileSolidIcon(), label: 'Profile'),
      ],
      onDestinationSelected: (i) {
        if (i == 0) context.go('/home');
        if (i == 1) context.go('/tracker');
        if (i == 2) context.go('/profile');
      },
    );
  }
}


