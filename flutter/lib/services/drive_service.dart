import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;

class DriveService {
  final Map<String, String> authHeaders;
  DriveService(this.authHeaders);

  Future<String?> _findFileIdByName(String name) async {
    final uri = Uri.https('www.googleapis.com', '/drive/v3/files', {
      'spaces': 'appDataFolder',
      'q': "name='" + name + "'",
      'fields': 'files(id,name)',
      'pageSize': '1',
    });
    final res = await http.get(uri, headers: authHeaders);
    if (res.statusCode != 200) return null;
    final js = jsonDecode(res.body) as Map<String, dynamic>;
    final files = (js['files'] as List?) ?? [];
    if (files.isEmpty) return null;
    return (files.first as Map)['id'] as String?;
  }

  Future<void> createOrUpdateJson(String name, Map<String, dynamic> data) async {
    final fileId = await _findFileIdByName(name);
    final meta = {'name': name, 'parents': ['appDataFolder']};
    final jsonPayload = utf8.encode(jsonEncode(data));
    final boundary = '-------flutter_form_${DateTime.now().millisecondsSinceEpoch}_${Random().nextInt(1<<32)}';
    final body = <int>[];
    void add(String s) => body.addAll(utf8.encode(s));
    add('--$boundary\r\n');
    add('Content-Type: application/json; charset=UTF-8\r\n\r\n');
    add(jsonEncode(meta));
    add('\r\n');
    add('--$boundary\r\n');
    add('Content-Type: application/json; charset=UTF-8\r\n\r\n');
    body.addAll(jsonPayload);
    add('\r\n');
    add('--$boundary--\r\n');

    final headers = {
      ...authHeaders,
      'Content-Type': 'multipart/related; boundary=$boundary',
    };

    http.Response res;
    if (fileId == null) {
      final uri = Uri.https('www.googleapis.com', '/upload/drive/v3/files', {'uploadType': 'multipart'});
      res = await http.post(uri, headers: headers, body: body);
    } else {
      final uri = Uri.https('www.googleapis.com', '/upload/drive/v3/files/$fileId', {'uploadType': 'multipart'});
      res = await http.patch(uri, headers: headers, body: body);
    }
    if (res.statusCode >= 300) {
      throw Exception('Drive upload failed: ${res.statusCode} ${res.body}');
    }
  }

  Future<Map<String, dynamic>?> readJson(String name) async {
    final fileId = await _findFileIdByName(name);
    if (fileId == null) return null;
    final uri = Uri.https('www.googleapis.com', '/drive/v3/files/$fileId', {'alt': 'media'});
    final res = await http.get(uri, headers: authHeaders);
    if (res.statusCode != 200) return null;
    try {
      return (jsonDecode(res.body) as Map).cast<String, dynamic>();
    } catch (_) {
      return null;
    }
  }
}


