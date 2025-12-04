import os
import json
import hashlib
import base64
import hmac
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import socket
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'json', 'db.json')
CFG_PATH = os.path.join(BASE_DIR, 'json', 'config.json')
LOG_PATH = os.path.join(BASE_DIR, 'logs', 'activity.jsonl')

def get_etag(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

def read_db() -> bytes:
    if not os.path.exists(DB_PATH):
        return b'[]'
    with open(DB_PATH, 'rb') as f:
        return f.read()

def write_db(data: bytes):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    tmp_path = DB_PATH + '.tmp'
    with open(tmp_path, 'wb') as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp_path, DB_PATH)

def read_cfg_bytes() -> bytes:
    if not os.path.exists(CFG_PATH):
        return b'{}'
    with open(CFG_PATH, 'rb') as f:
        return f.read()

def write_cfg_bytes(data: bytes):
    os.makedirs(os.path.dirname(CFG_PATH), exist_ok=True)
    tmp_path = CFG_PATH + '.tmp'
    with open(tmp_path, 'wb') as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp_path, CFG_PATH)

def read_cfg():
    try:
        with open(CFG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def ensure_log_dir():
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

def append_log(entry):
    ensure_log_dir()
    with open(LOG_PATH, 'a', encoding='utf-8') as f:
        f.write(json.dumps(entry) + '\n')

def pbkdf2_hex(password: str, salt: str, iterations: int, length: int = 32) -> str:
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), int(iterations), dklen=length)
    return dk.hex()

class Handler(BaseHTTPRequestHandler):
    def _set_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, PUT, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, If-Match, Authorization, X-API-Key, X-Username, X-Password')
        self.send_header('Access-Control-Expose-Headers', 'ETag')

    def _path_only(self):
        p = urlparse(self.path).path
        if p != '/' and p.endswith('/'):
            p = p.rstrip('/')
        return p

    def _log(self, method, path, status, ok, user=None, reason=None, size=None):
        entry = {
            'ts': datetime.utcnow().isoformat() + 'Z',
            'ip': self.client_address[0],
            'method': method,
            'path': path,
            'status': status,
            'success': bool(ok),
            'user': user or '',
            'reason': reason or '',
            'size': size if isinstance(size, int) else 0,
            'ua': self.headers.get('User-Agent') or '',
            'origin': self.headers.get('Origin') or ''
        }
        append_log(entry)

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors()
        self.end_headers()
        self._log('OPTIONS', self.path, 204, True, size=0)

    def do_GET(self):
        p = self._path_only()
        if p == '/json/config.json':
            content = read_cfg_bytes()
            etag = get_etag(content)
            try:
                json.loads(content.decode('utf-8') or '{}')
            except Exception:
                content = b'{}'
                etag = get_etag(content)
            self.send_response(200)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.send_header('ETag', etag)
            self.end_headers()
            self.wfile.write(content)
            self._log('GET', self.path, 200, True, size=len(content))
            return
        if p == '/activity':
            ensure_log_dir()
            try:
                limit = 1000
                q = []
                if os.path.exists(LOG_PATH):
                    with open(LOG_PATH, 'r', encoding='utf-8') as f:
                        for line in f:
                            try:
                                q.append(json.loads(line))
                            except Exception:
                                pass
                if len(q) > limit:
                    q = q[-limit:]
                self.send_response(200)
                self._set_cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                payload = json.dumps(q).encode('utf-8')
                self.wfile.write(payload)
                self._log('GET', self.path, 200, True, size=len(payload))
                return
            except Exception:
                # Fall back to empty list if reading fails
                try:
                    self.send_response(200)
                    self._set_cors()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'[]')
                    self._log('GET', self.path, 200, True, reason='activity_empty', size=2)
                    return
                except Exception:
                    self.send_response(500)
                    self._set_cors()
                    self.end_headers()
                    self._log('GET', self.path, 500, False, reason='activity_error', size=0)
                    return
        if p != '/json/db.json':
            self.send_response(404)
            self._set_cors()
            self.end_headers()
            self._log('GET', self.path, 404, False, reason='not_found', size=0)
            return
        content = read_db()
        etag = get_etag(content)
        self.send_response(200)
        self._set_cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('ETag', etag)
        self.end_headers()
        self.wfile.write(content)
        self._log('GET', self.path, 200, True, size=len(content))

    def do_HEAD(self):
        p = self._path_only()
        if p == '/json/config.json':
            content = read_cfg_bytes()
            etag = get_etag(content)
            self.send_response(200)
            self._set_cors()
            self.send_header('ETag', etag)
            self.end_headers()
            self._log('HEAD', self.path, 200, True, size=0)
            return
        if p != '/json/db.json':
            self.send_response(404)
            self._set_cors()
            self.end_headers()
            self._log('HEAD', self.path, 404, False, reason='not_found', size=0)
            return
        content = read_db()
        etag = get_etag(content)
        self.send_response(200)
        self._set_cors()
        self.send_header('ETag', etag)
        self.end_headers()
        self._log('HEAD', self.path, 200, True, size=0)

    def _check_auth(self):
        cfg = read_cfg()
        api_keys = cfg.get('apiKeys') or []
        auth = cfg.get('auth') or {}
        if auth.get('enabled') is False:
            return True, 'disabled'
        users = auth.get('users') or []
        salt_default = auth.get('salt') or 'coreenginedb'
        token = self.headers.get('Authorization') or ''
        api_key = self.headers.get('X-API-Key') or ''
        if api_key and api_key in api_keys:
            return True, 'apikey'
        if token.startswith('Bearer '):
            t = token.split(' ',1)[1]
            if t in api_keys:
                return True, 'bearer'
        username = None
        password = None
        if token.startswith('Basic '):
            try:
                raw = base64.b64decode(token.split(' ',1)[1]).decode('utf-8')
                parts = raw.split(':',1)
                username = parts[0]
                password = parts[1] if len(parts)>1 else ''
            except Exception:
                pass
        if not username:
            username = self.headers.get('X-Username') or ''
            password = self.headers.get('X-Password') or ''
        if username:
            user = None
            for u in users:
                if u.get('username') == username:
                    user = u
                    break
            if user:
                salt = user.get('salt') or salt_default
                iters = int(user.get('iterations') or 100000)
                stored = user.get('hash') or ''
                if stored:
                    calc = pbkdf2_hex(password, salt, iters)
                    if hmac.compare_digest(calc, stored):
                        return True, username
                    return False, 'bad_credentials'
                if username == 'admin' and password == 'securepassword':
                    return True, username
                return False, 'bad_credentials'
        return False, 'unauthorized'

    def _handle_write(self):
        p = self._path_only()
        if p not in ('/json/db.json', '/json/config.json'):
            self.send_response(404)
            self._set_cors()
            self.end_headers()
            self._log(self.command, self.path, 404, False, reason='not_found', size=0)
            return
        ok, user_or_reason = self._check_auth()
        if not ok:
            self.send_response(401)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': user_or_reason}).encode('utf-8'))
            self._log(self.command, self.path, 401, False, reason=user_or_reason, size=len(json.dumps({'error': user_or_reason}).encode('utf-8')))
            return
        current = read_db() if p == '/json/db.json' else read_cfg_bytes()
        current_etag = get_etag(current)
        if_match = self.headers.get('If-Match')
        if if_match and if_match != current_etag:
            self.send_response(412)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"precondition_failed"}')
            self._log(self.command, self.path, 412, False, user=user_or_reason, reason='precondition_failed', size=len(b'{"error":"precondition_failed"}'))
            return
        length = int(self.headers.get('Content-Length') or '0')
        body = self.rfile.read(length) if length > 0 else b''
        try:
            parsed = json.loads(body.decode('utf-8') or ('{}' if p == '/json/config.json' else '[]'))
        except Exception:
            self.send_response(400)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"invalid_json"}')
            self._log(self.command, self.path, 400, False, user=user_or_reason, reason='invalid_json', size=len(b'{"error":"invalid_json"}'))
            return
        if p == '/json/db.json' and not isinstance(parsed, list):
            self.send_response(400)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"expected_array"}')
            self._log(self.command, self.path, 400, False, user=user_or_reason, reason='expected_array', size=len(b'{"error":"expected_array"}'))
            return
        if p == '/json/config.json' and not isinstance(parsed, dict):
            self.send_response(400)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"expected_object"}')
            self._log(self.command, self.path, 400, False, user=user_or_reason, reason='expected_object', size=len(b'{"error":"expected_object"}'))
            return
        try:
            current_json = json.loads(current.decode('utf-8') or ('{}' if p == '/json/config.json' else '[]'))
        except Exception:
            current_json = {} if p == '/json/config.json' else []
        allow_empty = (self.headers.get('X-Allow-Empty-Write') or '').lower() == 'true'
        if p == '/json/db.json' and isinstance(parsed, list) and len(parsed) == 0 and isinstance(current_json, list) and len(current_json) > 0 and not allow_empty:
            self.send_response(400)
            self._set_cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"empty_write_denied"}')
            self._log(self.command, self.path, 400, False, user=user_or_reason, reason='empty_write_denied', size=len(b'{"error":"empty_write_denied"}'))
            return
        # compute change reason for activity
        action_reason = ''
        try:
            if p == '/json/db.json' and isinstance(current_json, list) and isinstance(parsed, list):
                before = len(current_json)
                after = len(parsed)
                if before > 0 and after == 0:
                    action_reason = 'clear_snapshot'
                elif before > after:
                    action_reason = f'delete_count:{before-after}'
                elif after > before:
                    action_reason = f'create_count:{after-before}'
                else:
                    action_reason = 'update'
        except Exception:
            action_reason = ''
        pretty = json.dumps(parsed, indent=2).encode('utf-8')
        if p == '/json/db.json':
            write_db(pretty)
        else:
            write_cfg_bytes(pretty)
        new_etag = get_etag(pretty)
        self.send_response(200)
        self._set_cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('ETag', new_etag)
        self.end_headers()
        self.wfile.write(b'{"ok":true}')
        self._log(self.command, self.path, 200, True, user=user_or_reason, reason=action_reason, size=len(b'{"ok":true}'))

    def do_PUT(self):
        self._handle_write()

    def do_POST(self):
        self._handle_write()

class DualStackServer(HTTPServer):
    address_family = socket.AF_INET6
    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except Exception:
            pass
        HTTPServer.server_bind(self)

def run(port=8081):
    try:
        httpd = DualStackServer(('::', port), Handler)
        print(f'Serving write-capable CoreEngineDB on http://localhost:{port}/')
        httpd.serve_forever()
    except Exception:
        httpd = HTTPServer(('0.0.0.0', port), Handler)
        print(f'Serving write-capable CoreEngineDB on http://localhost:{port}/')
        httpd.serve_forever()

if __name__ == '__main__':
    run()

