import 'package:google_sign_in/google_sign_in.dart';
import 'auth_backend.dart';

class PlatformAuthBackend implements AuthBackend {
  GoogleSignIn? _gs;
  GoogleSignInAccount? _acct;
  String? _token;

  GoogleSignIn _client() => _gs ??= GoogleSignIn(scopes: const [
    'email', 'profile', 'https://www.googleapis.com/auth/drive.appdata',
  ]);

  @override
  Future<AuthResult?> signIn() async {
    final acct = await _client().signIn();
    if (acct == null) return null;
    _acct = acct;
    final auth = await acct.authentication;
    _token = auth.accessToken;
    return AuthResult(
      email: acct.email,
      displayName: acct.displayName,
      photoUrl: acct.photoUrl,
      accessToken: _token,
    );
  }

  @override
  Future<void> signOut() async {
    try { await _client().signOut(); } catch (_) {}
    _acct = null; _token = null;
  }

  @override
  Future<String?> getAccessToken() async {
    if (_token != null) return _token;
    final acct = await _client().signInSilently();
    if (acct != null) {
      final auth = await acct.authentication;
      _token = auth.accessToken;
    }
    return _token;
  }
}


