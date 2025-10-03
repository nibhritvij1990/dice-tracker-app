import 'package:flutter/material.dart';

class AppScaffold extends StatelessWidget {
  final PreferredSizeWidget? appBar;
  final Widget? drawer;
  final Widget? endDrawer;
  final Widget body;
  final Widget? bottomNav;
  const AppScaffold({super.key, this.appBar, this.drawer, this.endDrawer, required this.body, this.bottomNav});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: appBar,
      drawer: drawer,
      endDrawer: endDrawer,
      bottomNavigationBar: bottomNav,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF2E1371), Color(0xFF130B2B)],
          ),
        ),
        child: Stack(
          children: [
            // Glow blobs
            Positioned(
              left: -132,
              top: 178,
              child: Container(
                width: 300,
                height: 300,
                decoration: const BoxDecoration(
                  color: Color.fromRGBO(96, 255, 231, 0.4),
                  boxShadow: [BoxShadow(blurRadius: 100)],
                ),
              ),
            ),
            Positioned(
              right: -147,
              top: 375,
              child: Container(
                width: 300,
                height: 300,
                decoration: const BoxDecoration(
                  color: Color(0xFFFF53C0),
                  boxShadow: [BoxShadow(blurRadius: 100)],
                ),
              ),
            ),
            // soft footer glass
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: IgnorePointer(
                child: Container(
                  height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.06),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.white.withOpacity(0.08), Colors.transparent],
                    ),
                  ),
                ),
              ),
            ),
            // Content
            SafeArea(child: body),
          ],
        ),
      ),
    );
  }
}


