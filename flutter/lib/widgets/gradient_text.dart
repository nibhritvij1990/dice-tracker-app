import 'package:flutter/material.dart';

class GradientText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final Gradient gradient;
  const GradientText(
    this.text, {
    super.key,
    this.style,
    this.gradient = const LinearGradient(
      colors: [Color(0xFFCF9EFF), Color(0xFFA071FF), Color(0xFFCF9EFF)],
      begin: Alignment.centerLeft,
      end: Alignment.centerRight,
    ),
  });

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (bounds) => gradient.createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      child: Text(
        text,
        style: (style ?? Theme.of(context).textTheme.titleLarge)?.copyWith(
          color: Colors.white,
        ),
      ),
    );
  }
}


