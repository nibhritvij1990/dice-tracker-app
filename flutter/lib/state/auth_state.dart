import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'auth_backend.dart';
import 'auth_backend_platform.dart';

class AuthState extends ChangeNotifier {
  bool isAuthenticated = false;
  String? email;
  String? displayName;
  String? photoUrl;
  String? _accessToken;
  late final AuthBackend _backend;

  ImageProvider? get imageProvider =>
      (photoUrl != null) ? NetworkImage(photoUrl!) : null;

  AuthState() {
    _backend = PlatformAuthBackend();
  }

  Future<void> signIn() async {
    final res = await _backend.signIn();
    if (res != null) {
      isAuthenticated = true;
      email = res.email; displayName = res.displayName; photoUrl = res.photoUrl;
      _accessToken = res.accessToken;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    try { await _backend.signOut(); } catch (_) {}
    isAuthenticated = false;
    email = null;
    displayName = null;
    photoUrl = null;
    _accessToken = null;
    notifyListeners();
  }

  Future<String?> getAccessToken() async {
    if (_accessToken != null) return _accessToken;
    _accessToken = await _backend.getAccessToken();
    return _accessToken;
  }
}
