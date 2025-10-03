class AuthResult {
  final String? email;
  final String? displayName;
  final String? photoUrl;
  final String? accessToken;
  AuthResult({this.email, this.displayName, this.photoUrl, this.accessToken});
}

abstract class AuthBackend {
  Future<AuthResult?> signIn();
  Future<void> signOut();
  Future<String?> getAccessToken();
}


