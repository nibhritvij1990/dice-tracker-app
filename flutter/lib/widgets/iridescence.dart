import 'package:flutter/material.dart';

class Iridescence extends StatefulWidget {
  final List<Color> colors;
  final double speed;
  final BlendMode blendMode;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;
  const Iridescence({super.key, this.colors = const [Color(0xFF64C8FF), Color(0xFFB593FF), Color(0xFFFF6BD5)], this.speed = 0.15, this.blendMode = BlendMode.screen, this.padding, this.borderRadius});

  @override
  State<Iridescence> createState() => _IridescenceState();
}

class _IridescenceState extends State<Iridescence> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    final ms = (12000 / widget.speed).clamp(2000, 60000).toInt();
    _ctrl = AnimationController(vsync: this, duration: Duration(milliseconds: ms));
    _ctrl.repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, _) {
        final t = _ctrl.value;
        final angle = t * 6.28318; // 2*pi
        return ShaderMask(
          blendMode: widget.blendMode,
          shaderCallback: (rect) {
            final center = Alignment(0.3 * (2*t - 1), -0.2 * (2*t - 1)).alongSize(rect.size);
            return SweepGradient(
              center: Alignment.center,
              startAngle: angle,
              endAngle: angle + 6.28318,
              colors: [
                widget.colors[0].withOpacity(0.65),
                widget.colors[1].withOpacity(0.65),
                widget.colors[2].withOpacity(0.65),
                widget.colors[0].withOpacity(0.65),
              ],
              stops: const [0.0, 0.33, 0.66, 1.0],
            ).createShader(Rect.fromCircle(center: center, radius: rect.longestSide));
          },
          child: Container(
            padding: widget.padding,
            decoration: BoxDecoration(
              borderRadius: widget.borderRadius,
              gradient: LinearGradient(
                colors: [Colors.white.withOpacity(0.12), Colors.white.withOpacity(0.04)],
              ),
            ),
          ),
        );
      },
    );
  }
}


