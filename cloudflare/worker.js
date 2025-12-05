export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    const h = new Headers()
    const origin = req.headers.get('Origin') || ''
    if (origin) {
      h.set('Access-Control-Allow-Origin', origin)
      h.set('Access-Control-Allow-Credentials', 'true')
      h.set('Vary', 'Origin')
    } else {
      h.set('Access-Control-Allow-Origin', '*')
    }
    h.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,OPTIONS')
    h.set('Access-Control-Allow-Headers', 'Content-Type, content-type, Authorization, authorization, If-Match, if-match, X-Allow-Empty-Write, x-allow-empty-write, X-API-Key, x-api-key, X-CSRF-Token, x-csrf-token')
    h.set('Access-Control-Expose-Headers', 'ETag')
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })

    const isCfg = url.pathname === '/json/config.json'
    const isDb = url.pathname === '/json/db.json'
    if (!isCfg && !isDb) return new Response('', { status: 404, headers: h })
    const key = isCfg ? 'config.json' : 'db.json'

    async function getText(k) {
      const obj = await env.COREENGINEDB.get(k)
      if (!obj) return isCfg ? '{}' : '[]'
      const t = await obj.text()
      return t || (isCfg ? '{}' : '[]')
    }
    async function sha256Hex(s) {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
      return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    async function putText(k, t) {
      await env.COREENGINEDB.put(k, t, { httpMetadata: { contentType: 'application/json' } })
    }

    async function checkAuth() {
      const cfgText = await getText('config.json')
      let cfg = {}
      try { cfg = JSON.parse(cfgText || '{}') } catch (_e) { cfg = {} }
      const apiKeys = Array.isArray(cfg.apiKeys) ? cfg.apiKeys : []
      const auth = cfg.auth || {}
      if (auth.enabled === false) return { ok: true, user: 'disabled' }
      const token = req.headers.get('Authorization') || ''
      const apiKeyHeader = req.headers.get('X-API-Key') || ''
      if (apiKeyHeader && apiKeys.includes(apiKeyHeader)) return { ok: true, user: 'apikey' }
      if (token.startsWith('Bearer ')) { const t = token.split(' ', 2)[1]; if (apiKeys.includes(t)) return { ok: true, user: 'bearer' } }
      let username = null, password = ''
      if (token.startsWith('Basic ')) {
        try {
          const raw = atob(token.split(' ', 2)[1])
          const parts = raw.split(':')
          username = parts[0]
          password = parts.slice(1).join(':')
        } catch (_e) {}
      }
      if (!username) return { ok: false, reason: 'unauthorized' }
      const users = Array.isArray(auth.users) ? auth.users : []
      const saltDefault = auth.salt || 'coreenginedb'
      const user = users.find(u => String(u.username) === String(username)) || null
      if (user) {
        const salt = user.salt || saltDefault
        const iterations = Number(user.iterations || 100000)
        const stored = user.hash || ''
        if (stored) {
          const calc = await pbkdf2Hex(password, salt, iterations, 32)
          if (timingSafeEqual(calc, stored)) return { ok: true, user: username }
          return { ok: false, reason: 'bad_credentials' }
        }
      }
      // No fallback credentials; must match configured users
      return { ok: false, reason: 'bad_credentials' }
    }
    function getCookie(name){
      const raw = req.headers.get('Cookie') || ''
      const parts = raw.split(';').map(s=>s.trim())
      const m = parts.find(s=>s.startsWith(name+'=')) || ''
      return m ? decodeURIComponent(m.split('=')[1]||'') : ''
    }
    function checkCsrf(){
      const header = req.headers.get('X-CSRF-Token') || req.headers.get('x-csrf-token') || ''
      const hasAuth = !!(req.headers.get('Authorization') || '')
      // If authenticated via Authorization, skip CSRF requirement (cross-origin scenario)
      if(hasAuth) return { ok:true }
      if(!header) return { ok:false, reason:'missing_csrf' }
      return { ok:true }
    }
    function timingSafeEqual(a, b) {
      if (!a || !b || a.length !== b.length) return false
      let r = 0
      for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
      return r === 0
    }
    async function pbkdf2Hex(password, salt, iterations, length) {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations }, key, (length || 32) * 8)
      return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    if (req.method === 'GET') {
      let t = await getText(key)
      try { JSON.parse(t || (isCfg ? '{}' : '[]')) } catch (_e) { t = isCfg ? '{}' : '[]' }
      const et = await sha256Hex(t)
      h.set('Content-Type', 'application/json')
      h.set('ETag', et)
      return new Response(t, { status: 200, headers: h })
    }
    if (req.method === 'HEAD') {
      const t = await getText(key)
      const et = await sha256Hex(t)
      h.set('ETag', et)
      return new Response(null, { status: 200, headers: h })
    }
    if (req.method !== 'PUT' && req.method !== 'POST') return new Response('', { status: 405, headers: h })

    const auth = await checkAuth()
    if (!auth.ok) {
      h.set('Content-Type', 'application/json')
      return new Response(JSON.stringify({ error: auth.reason || 'unauthorized' }), { status: 401, headers: h })
    }
    const csrf = checkCsrf()
    if(!csrf.ok){
      h.set('Content-Type', 'application/json')
      return new Response(JSON.stringify({ error: csrf.reason || 'forbidden' }), { status: 403, headers: h })
    }
    const current = await getText(key)
    const currentEtag = await sha256Hex(current)
    const ifMatch = req.headers.get('If-Match') || ''
    if (ifMatch && ifMatch !== currentEtag) {
      h.set('Content-Type', 'application/json')
      return new Response('{"error":"precondition_failed"}', { status: 412, headers: h })
    }
    const body = await req.text()
    let parsed
    try { parsed = JSON.parse(body || (isCfg ? '{}' : '[]')) } catch (_e) {
      h.set('Content-Type', 'application/json')
      return new Response('{"error":"invalid_json"}', { status: 400, headers: h })
    }
    if (isDb && !Array.isArray(parsed)) {
      h.set('Content-Type', 'application/json')
      return new Response('{"error":"expected_array"}', { status: 400, headers: h })
    }
    if (isCfg && typeof parsed !== 'object') {
      h.set('Content-Type', 'application/json')
      return new Response('{"error":"expected_object"}', { status: 400, headers: h })
    }
    let allowEmpty = (req.headers.get('X-Allow-Empty-Write') || '').toLowerCase() === 'true'
    try {
      if (isDb) {
        const before = Array.isArray(JSON.parse(current || '[]')) ? JSON.parse(current || '[]').length : 0
        const after = Array.isArray(parsed) ? parsed.length : 0
        if (before > 0 && after === 0 && !allowEmpty) {
          h.set('Content-Type', 'application/json')
          return new Response('{"error":"empty_write_denied"}', { status: 400, headers: h })
        }
      }
    } catch (_e) {}
    const pretty = JSON.stringify(parsed, null, 2)
    await putText(key, pretty)
    const newEtag = await sha256Hex(pretty)
    h.set('Content-Type', 'application/json')
    h.set('ETag', newEtag)
    return new Response('{"ok":true}', { status: 200, headers: h })
  }
}
