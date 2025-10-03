import 'auth_backend.dart';

class PlatformAuthBackend implements AuthBackend {
  @override
  Future<AuthResult?> signIn() async { return null; }

  @override
  Future<void> signOut() async {}

  @override
  Future<String?> getAccessToken() async { return null; }
}


