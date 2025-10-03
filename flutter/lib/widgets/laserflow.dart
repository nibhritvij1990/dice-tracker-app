import 'dart:math';
import 'package:flutter/material.dart';

class Laserflow extends StatefulWidget {
  final Color color;
  final double speed;
  const Laserflow({super.key, this.color = const Color(0xFF07FBD3), this.speed = 1.0});

  @override
  State<Laserflow> createState() => _LaserflowState();
}

class _LaserflowState extends State<Laserflow> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  final _rand = Random();
  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: Duration(milliseconds: (6000 ~/ widget.speed)));
    _ctrl.repeat();
  }
  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        final t = _ctrl.value;
        return CustomPaint(
          painter: _LaserPainter(widget.color, t),
          child: const SizedBox.expand(),
        );
      },
    );
  }
}

class _LaserPainter extends CustomPainter {
  final Color color; final double t;
  _LaserPainter(this.color, this.t);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = LinearGradient(
        colors: [color.withOpacity(0), color.withOpacity(0.35), color.withOpacity(0)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    for (int i=0;i<6;i++) {
      final y = (size.height/6) * (i + ((t + i*0.17) % 1.0));
      canvas.drawRect(Rect.fromLTWH(0, y, size.width, 1.5), paint);
    }
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}


