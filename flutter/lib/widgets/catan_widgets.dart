import 'package:flutter/material.dart';
import '../models/catan.dart';

class NumberToken extends StatelessWidget {
  final int value;
  const NumberToken({super.key, required this.value});

  @override
  Widget build(BuildContext context) {
    final isHot = value == 6 || value == 8;
    final pipCount = {2:1,3:2,4:3,5:4,6:5,8:5,9:4,10:3,11:2,12:1}[value] ?? 0;
    return SizedBox(
      width: 30,
      height: 30,
      child: Stack(children: [
        // Outer ring
        Container(
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: SweepGradient(colors: [Color(0xFFD6B253), Color(0xFFF5E3A1), Color(0xFFA77A2F), Color(0xFFF0D98C), Color(0xFFD6B253)]),
            boxShadow: [BoxShadow(blurRadius: 3, color: Colors.black38)],
          ),
        ),
        // Inner disc + content
        Positioned(
          left: 2.5, top: 2.5, right: 2.5, bottom: 2.5,
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                center: const Alignment(-0.4, -0.4),
                colors: isHot
                    ? const [Color(0xFFFF7373), Color(0xFFB71C1C), Color(0xFF7A0E0E)]
                    : const [Color(0xFFFFF6D9), Color(0xFFF2E2B6), Color(0xFFD9C397)],
              ),
              boxShadow: const [BoxShadow(blurRadius: 2, color: Colors.black54)],
              border: Border.all(color: Colors.white24, width: 0.75),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('$value', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: isHot ? Colors.white : const Color(0xFF1A1A1A), shadows: const [Shadow(blurRadius: 0.75, color: Colors.black26)])),
                const SizedBox(height: 1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(pipCount, (i) => Container(width: 2.2, height: 2.2, margin: const EdgeInsets.symmetric(horizontal: 0.6), decoration: BoxDecoration(color: isHot ? Colors.white : const Color(0xFF1A1A1A), shape: BoxShape.circle))),
                ),
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

class HexTile extends StatelessWidget {
  final Terrain terrain;
  final int? number;
  const HexTile({super.key, required this.terrain, required this.number});

  @override
  Widget build(BuildContext context) {
    final imageName = {
      Terrain.forest: 'lumber',
      Terrain.pasture: 'sheep',
      Terrain.fields: 'grain',
      Terrain.hills: 'brick',
      Terrain.mountains: 'ore',
      Terrain.desert: 'desert',
    }[terrain]!;
    return SizedBox(
      width: 84,
      height: 74,
      child: Stack(children: [
        ClipPath(
          clipper: _HexClipper(),
          child: Image.asset(
            'assets/images/'+imageName+'.webp',
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Image.asset('assets/images/'+imageName+'.png', fit: BoxFit.cover),
          ),
        ),
        if (terrain != Terrain.desert && number != null)
          Positioned.fill(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(top: 2.0),
                child: NumberToken(value: number!),
              ),
            ),
          ),
      ]),
    );
  }
}

class _HexClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final w = size.width;
    final h = size.height;
    return Path()
      ..moveTo(0, h / 2)
      ..lineTo(w * 0.25, 0)
      ..lineTo(w * 0.75, 0)
      ..lineTo(w, h / 2)
      ..lineTo(w * 0.75, h)
      ..lineTo(w * 0.25, h)
      ..close();
  }
  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}


