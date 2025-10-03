import 'package:flutter/material.dart';

class DiceIcon extends StatelessWidget {
  final Color color;
  final double size;
  const DiceIcon({super.key, this.color = Colors.white, this.size = 24});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size.square(size),
      painter: _DicePainter(color),
    );
  }
}

class _DicePainter extends CustomPainter {
  final Color color;
  _DicePainter(this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final rect = RRect.fromRectAndRadius(Offset(0,0)&size, const Radius.circular(4));
    final paint = Paint()..color = color;
    canvas.drawRRect(rect, paint);
    final stroke = Paint()
      ..color = color.withOpacity(0.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawRRect(rect, stroke);
    // pips mask
    final pipPaint = Paint()..color = Colors.transparent..blendMode = BlendMode.clear;
    void pip(double x, double y) { canvas.drawCircle(Offset(x*size.width, y*size.height), size.width*0.09, pipPaint); }
    final save = canvas.saveLayer(Offset.zero & size, Paint());
    canvas.drawRRect(rect, Paint()..color = color);
    pip(0.25,0.25); pip(0.75,0.25); pip(0.5,0.5); pip(0.25,0.75); pip(0.75,0.75);
    canvas.restore();
    // redraw stroke
    canvas.drawRRect(rect, stroke);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class ProfileSolidIcon extends StatelessWidget {
  final Color color; final double size;
  const ProfileSolidIcon({super.key, this.color = Colors.white, this.size = 24});
  @override
  Widget build(BuildContext context) {
    return CustomPaint(size: Size.square(size), painter: _ProfilePainter(color));
  }
}

class _ProfilePainter extends CustomPainter {
  final Color color; _ProfilePainter(this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final headCenter = Offset(size.width/2, size.height*0.35);
    canvas.drawCircle(headCenter, size.width*0.225, paint);
    final bodyRect = RRect.fromRectAndCorners(
      Rect.fromLTWH(size.width*0.15, size.height*0.52, size.width*0.7, size.height*0.36),
      topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
      bottomLeft: const Radius.circular(4), bottomRight: const Radius.circular(4),
    );
    canvas.drawRRect(bodyRect, paint);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}


