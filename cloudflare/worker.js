export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    const h = new Headers()
    const origin = req.headers.get('Origin') || ''
    const allowedOrigins = [
      'https://kwentonglasing.servebeer.com',
      'https://coreenginedb.meoasis2014.workers.dev',
      'https://assets.antserver1.eu.org'
    ]
    const isAllowed = origin && allowedOrigins.includes(origin)
    if (origin && isAllowed) {
      h.set('Access-Control-Allow-Origin', origin)
      h.set('Access-Control-Allow-Credentials', 'true')
      h.set('Vary', 'Origin')
    } else {
      h.set('Access-Control-Allow-Origin', '*')
    }
    h.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,PATCH,OPTIONS,DELETE')
    h.set('Access-Control-Allow-Headers', 'Content-Type, content-type, Authorization, authorization, If-Match, if-match, X-Allow-Empty-Write, x-allow-empty-write, X-API-Key, x-api-key, X-CSRF-Token, x-csrf-token')
    h.set('Referrer-Policy', 'no-referrer')
    h.set('X-Content-Type-Options', 'nosniff')
    h.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    h.set('Content-Security-Policy', "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'self'; connect-src *")
    h.set('Access-Control-Expose-Headers', 'ETag')
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })

    const isCfg = url.pathname === '/json/config.json'
    const isDb = url.pathname === '/json/db.json'
    const isPublicDb = url.pathname === '/json/public.db.json'
    const isTopup = url.pathname === '/wallet/topup'
    const isDonate = url.pathname === '/donate'
    const isForgot = url.pathname === '/auth/forgot'
    const isWebhook = url.pathname === '/stripe/webhook'
    const isAdminSuper = url.pathname === '/admin/superadmin'
    const isAuthLogin = url.pathname === '/auth/login'
    const isAuthSession = url.pathname === '/auth/session'
    const isAuthLogout = url.pathname === '/auth/logout'
    const isActivity = url.pathname === '/activity'
    const key = isCfg ? 'config.json' : ((isDb || isPublicDb) ? 'db.json' : '')

    async function logEvent(method, path, status, size, user, reason) {
      try {
        const ts = new Date().toISOString()
        const day = ts.slice(0, 10)
        const id = crypto.randomUUID()
        const payload = {
          ts, method, path, status, size: typeof size === 'number' ? size : 0,
          user: user || '', ip: req.headers.get('cf-connecting-ip') || '', reason: reason || ''
        }
        const actKey = `activity/${day}/${id}.json`
        await env.COREENGINEDB.put(actKey, JSON.stringify(payload), { httpMetadata: { contentType: 'application/json' } })
      } catch (_e) { /* ignore logging errors */ }
    }

    // Activity listing endpoint
    if (isActivity) {
      try {
        const day = (url.searchParams.get('day') || new Date().toISOString().slice(0, 10))
        const limit = Math.max(1, Math.min(1000, parseInt(url.searchParams.get('limit') || '500')))
        const prefix = `activity/${day}/`
        const listed = await env.COREENGINEDB.list({ prefix, limit })
        const out = []
        for (const obj of (listed && listed.objects) || []) {
          try {
            const r = await env.COREENGINEDB.get(obj.key)
            const t = r ? await r.text() : ''
            const j = t ? JSON.parse(t) : null
            if (j) { if ('user' in j) j.user = ''; out.push(j) }
          } catch (_e) { /* skip */ }
        }
        out.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')))
        h.set('Content-Type', 'application/json')
        await logEvent('GET', '/activity', 200, out.length, '', '')
        return new Response(JSON.stringify(out), { status: 200, headers: h })
      } catch (err) {
        h.set('Content-Type', 'application/json')
        await logEvent('GET', '/activity', 500, 0, '', 'activity_error')
        return new Response(JSON.stringify({ error: 'activity_error' }), { status: 500, headers: h })
      }
    }

    if (!isCfg && !isDb && !isPublicDb && !isTopup && !isDonate && !isForgot && !isWebhook && !isAdminSuper && !isAuthLogin && !isAuthSession && !isAuthLogout && url.pathname !== '/journal' && url.pathname !== '/compact' && url.pathname !== '/activity') { await logEvent(req.method, url.pathname, 404, 0, '', 'not_found'); return new Response('', { status: 404, headers: h }) }

    if (isWebhook && req.method === 'POST') {
      const body = await req.text()
      const ok = await verifyStripeWebhook(body)
      if(!ok){ h.set('Content-Type','application/json'); await logEvent('POST','/stripe/webhook',400,(body&&body.length)||0,'','invalid_signature'); return new Response('{"error":"invalid_signature"}',{ status:400, headers:h }) }
      let evt
      try{ evt = JSON.parse(body||'{}') }catch(_){ evt=null }
      const obj = evt && evt.data && evt.data.object || {}
      const username = (obj && obj.metadata && obj.metadata.username) || ''
      let amount = 0
      if(obj && typeof obj.amount_total === 'number') amount = Number(obj.amount_total||0)/100
      else if(obj && typeof obj.amount === 'number') amount = Number(obj.amount||0)/100
      if(!username || !(amount>0)){ h.set('Content-Type','application/json'); await logEvent('POST','/stripe/webhook',422,(body&&body.length)||0,'','missing_fields'); return new Response('{"error":"missing_fields"}',{ status:422, headers:h }) }
      let rows
      try{ rows = JSON.parse(await getText('db.json')||'[]') }catch(_){ rows=[] }
      const urec = rows.find(r=>String(r.prefix||'')==='app_'&&String(r.collection||'')==='users'&&String(r.metakey||'')==='username'&&String(r.metavalue||'')===String(username))
      if(!urec){ h.set('Content-Type','application/json'); await logEvent('POST','/stripe/webhook',404,0,'','user_not_found'); return new Response('{"error":"user_not_found"}',{ status:404, headers:h }) }
      const rel = Number(urec.relid||0)
      const now = new Date().toISOString()
      const balRec = rows.find(r=>String(r.prefix||'')==='wallet_'&&String(r.collection||'')==='balance'&&Number(r.relid||0)===rel&&String(r.metakey||'')==='amount')
      if(balRec){ balRec.metavalue = Number(balRec.metavalue||0) + amount; balRec.updateddate = now }
      else { rows.push({ id: crypto.randomUUID(), relid: rel, prefix:'wallet_', collection:'balance', metakey:'amount', metavalue: amount, createddate: now, updateddate: now }) }
      rows.push({ id: crypto.randomUUID(), relid: rel, prefix:'wallet_', collection:'ledger', metakey:'topup', metavalue: amount, createddate: now, updateddate: now })
      const pretty = JSON.stringify(rows,null,2)
      await putText('db.json', pretty)
      const newEt = await sha256Hex(pretty)
      h.set('ETag', newEt)
      h.set('Content-Type','application/json')
      await logEvent('POST','/stripe/webhook',200,(body&&body.length)||0,String(username),'webhook_ok')
      return new Response('{"ok":true}',{ status:200, headers:h })
    }

    async function getText(k) {
      const obj = await env.COREENGINEDB.get(k)
      if (!obj) return isCfg ? '{}' : '[]'
      const t = await obj.text()
      return t || (isCfg ? '{}' : '[]')
    }
    async function getJson(k){ try{ const obj = await env.COREENGINEDB.get(k); const t = obj? await obj.text() : ''; return t? JSON.parse(t) : null }catch(_e){ return null } }
    async function putJson(k, v){ try{ await env.COREENGINEDB.put(k, JSON.stringify(v), { httpMetadata: { contentType: 'application/json' } }) }catch(_e){} }
    async function sha256Hex(s) {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
      return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    async function hmacHex(key, data){ const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name:'HMAC', hash:'SHA-256' }, false, ['sign']); const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)); return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('') }
    function parseStripeSig(){ const raw=req.headers.get('Stripe-Signature')||''; const parts=raw.split(',').map(s=>s.trim()); let t=''; let v1=''; for(const p of parts){ const kv=p.split('='); if(kv[0]==='t') t=kv[1]||''; if(kv[0]==='v1') v1=kv[1]||'' } return { t, v1 } }
    async function verifyStripeWebhook(body){ const s=parseStripeSig(); if(!s.t||!s.v1) return false; const secret=env.STRIPE_WEBHOOK_SECRET||''; if(!secret) return false; const calc=await hmacHex(secret, s.t + '.' + (body||'')); return timingSafeEqual(calc, s.v1) }
    async function putText(k, t) {
      await env.COREENGINEDB.put(k, t, { httpMetadata: { contentType: 'application/json' } })
    }
    function tooLarge(req){ const len = parseInt(req.headers.get('Content-Length')||'0'); return isFinite(len) && len > 1024*1024 }
    function validateRecord(r){
      if(typeof r !== 'object' || r===null) return false
      const idOk = ('id' in r) && String(r.id).length>0
      const relOk = ('relid' in r) && Number.isFinite(Number(r.relid)) && Number(r.relid)>=0
      const prefixOk = ('prefix' in r) && /^[a-z_]{1,32}$/.test(String(r.prefix||''))
      const collOk = ('collection' in r) && String(r.collection||'').length<=64
      const keyOk = ('metakey' in r) && String(r.metakey||'').length<=64
      const mv = r.metavalue
      const mvStr = typeof mv==='string'? mv : JSON.stringify(mv||'')
      const mvOk = mvStr.length <= 16*1024
      return idOk && relOk && prefixOk && collOk && keyOk && mvOk
    }

    async function checkAuth() {
      // Cookie-based session
      const sess = await verifySession(getCookie('cedb_session'))
      if(sess && sess.u){ return { ok:true, user: String(sess.u), role: String(sess.role||'user') } }
      const cfgText = await getText('config.json')
      let cfg = {}
      try { cfg = JSON.parse(cfgText || '{}') } catch (_e) { cfg = {} }
      const apiKeys = Array.isArray(cfg.apiKeys) ? cfg.apiKeys : []
      const auth = cfg.auth || {}
      if (auth.enabled === false) return { ok: true, user: 'disabled' }
      const token = req.headers.get('Authorization') || ''
      const apiKeyHeader = req.headers.get('X-API-Key') || ''
      if (apiKeyHeader && apiKeys.includes(apiKeyHeader)) return { ok: true, user: 'apikey', role:'user' }
      if (token.startsWith('Bearer ')) { const t = token.split(' ', 2)[1]; if (apiKeys.includes(t)) return { ok: true, user: 'bearer', role:'user' } }
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
      let role = 'user'
      const saltDefault = auth.salt || 'coreenginedb'
      const user = users.find(u => String(u.username) === String(username)) || null
      if (user) {
        const salt = user.salt || saltDefault
        const iterations = Number(user.iterations || 100000)
        const stored = user.hash || ''
        if (stored) {
          const calc = await pbkdf2Hex(password, salt, iterations, 32)
          if (timingSafeEqual(calc, stored)) return { ok: true, user: username, role }
          return { ok: false, reason: 'bad_credentials' }
        }
      }
      // Fallback: authorize against db.json superadmin based on record id=1
      try {
        let rows = []
        try { rows = JSON.parse(await getText('db.json') || '[]') } catch (_e) { rows = [] }
        const firstUser = rows.find(r => Number(r.id||0) === 1 && String(r.prefix||'') === 'app_' && String(r.collection||'') === 'users' && String(r.metakey||'') === 'username')
        if (firstUser) {
          const rel = Number(firstUser.relid || 0)
          const passRec = rows.find(r => String(r.prefix||'') === 'app_' && String(r.collection||'') === 'users' && Number(r.relid||0) === rel && String(r.metakey||'') === 'password_hash')
          if (passRec) {
            let salt = 'coreenginedb'
            let iterations = 100000
            let stored = ''
            try {
              const obj = JSON.parse(String(passRec.metavalue||'{}'))
              salt = String(obj.salt||salt)
              iterations = Number(obj.iterations||iterations)
              stored = String(obj.hash||'')
            } catch (_e) {
              stored = String(passRec.metavalue||'')
            }
            if (stored) {
              const calc = await pbkdf2Hex(password, salt, iterations, 32)
              if (timingSafeEqual(calc, stored) && String(firstUser.metavalue||'') === String(username)) {
                return { ok: true, user: username, role }
              }
            }
          }
        }
        const superRec = rows.find(r => Number(r.id||0) === 1 && String(r.prefix||'') === 'coreenginedb_' && String(r.collection||'') === 'superuser')
        if (superRec) {
          const rel = Number(superRec.relid || 0)
          const passRec = rows.find(r => String(r.prefix||'') === 'coreenginedb_' && String(r.collection||'') === 'superuser' && Number(r.relid||0) === rel && String(r.metakey||'') === 'password_hash')
          if (passRec) {
            let salt = 'coreenginedb'
            let iterations = 100000
            let stored = ''
            try {
              const obj = JSON.parse(String(passRec.metavalue||'{}'))
              salt = String(obj.salt||salt)
              iterations = Number(obj.iterations||iterations)
              stored = String(obj.hash||'')
            } catch (_e) {
              stored = String(passRec.metavalue||'')
            }
            if (stored) {
              const calc = await pbkdf2Hex(password, salt, iterations, 32)
              const expectedUser = String(superRec.metakey||'')
              if (timingSafeEqual(calc, stored) && timingSafeEqual(String(username||''), expectedUser)) {
                role = 'superadmin'
                return { ok: true, user: username, role }
              }
            }
          }
        }
      } catch (_e) {}
      try { const candidate = parseBasic().user || ''; const blocked = await rateLimitShouldBlock('login/'+(candidate||'anon')); if (blocked) return { ok:false, reason:'rate_limited' } } catch (_e) {}
      // No fallback credentials; must match configured users
      return { ok: false, reason: 'bad_credentials' }
    }
    function parseBasic(){ const token = req.headers.get('Authorization') || ''; if(token.startsWith('Basic ')){ try{ const raw=atob(token.split(' ',2)[1]); const parts=raw.split(':'); return { user: parts[0]||'', pass: parts.slice(1).join(':') } }catch(_e){} } return { user:'', pass:'' } }
    async function rateLimitShouldBlock(tag){ try{ const ip = req.headers.get('cf-connecting-ip') || 'ip'; const key = `ratelimit/${ip}/${tag||'anon'}.json`; let state = await getJson(key) || { count:0, ts: Date.now() }; const now = Date.now(); const windowMs = 60*1000; const limit = 15; if(now - (state.ts||0) > windowMs) state = { count:0, ts: now }; if((state.count||0) >= limit) return true; state.count = (state.count||0) + 1; state.ts = now; await putJson(key, state); return false }catch(_e){ return false } }
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
      let bodyText = await getText(key)
      try { JSON.parse(bodyText || (isCfg ? '{}' : '[]')) } catch (_e) { bodyText = isCfg ? '{}' : '[]' }
      // For config.json, return a sanitized public view unless authorized
      if (isCfg) {
        const fullCfgText = bodyText
        let cfg = {}
        try { cfg = JSON.parse(fullCfgText || '{}') } catch (_e) { cfg = {} }
        const auth = await checkAuth()
        let outText
        if (auth && auth.ok) {
          outText = JSON.stringify(cfg)
        } else {
          const publicCfg = {}
          try {
            const flags = (cfg && typeof cfg.flags === 'object') ? cfg.flags : {}
            const enabled = !!(cfg && cfg.auth && cfg.auth.enabled !== false)
            publicCfg.flags = flags
            publicCfg.auth = { enabled }
            if (cfg && typeof cfg.version !== 'undefined') publicCfg.version = cfg.version
          } catch (_e) {}
          outText = JSON.stringify(publicCfg)
        }
        const et = await sha256Hex(outText)
        h.set('Content-Type', 'application/json')
        h.set('ETag', et)
        await logEvent('GET', url.pathname, 200, (outText && outText.length) || 0, String((auth && auth.ok && auth.user) || ''), '')
        return new Response(outText, { status: 200, headers: h })
      }
      // Public db snapshot
      if (isPublicDb) {
        let rows = []
        try { rows = JSON.parse(bodyText || '[]') } catch (_e) { rows = [] }
        const safe = Array.isArray(rows) ? rows.filter(r => {
          const p = String(r.prefix||'')
          const c = String(r.collection||'')
          const k = String(r.metakey||'')
          if (p === 'app_' && (c === 'posts' || (c === 'users' && (k === 'username' || k === 'avatar')))) return true
          if (p === 'donate_' && c === 'post') return true
          return false
        }) : []
        const outText = JSON.stringify(safe)
        const et = await sha256Hex(outText)
        h.set('Content-Type', 'application/json')
        h.set('ETag', et)
        await logEvent('GET', url.pathname, 200, (outText && outText.length) || 0, '', 'public_snapshot')
        return new Response(outText, { status: 200, headers: h })
      }
      // Default GET for db.json (private)
      const authDb = await checkAuth()
      if (!authDb.ok) {
        h.set('Content-Type', 'application/json')
        await logEvent('GET', url.pathname, 401, 0, '', 'unauthorized_read')
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: h })
      }
      const et = await sha256Hex(bodyText)
      h.set('Content-Type', 'application/json')
      h.set('ETag', et)
      await logEvent('GET', url.pathname, 200, (bodyText && bodyText.length) || 0, String(authDb.user||''), '')
      return new Response(bodyText, { status: 200, headers: h })
    }
    if (req.method === 'HEAD') {
      const t = await getText(key)
      if (isCfg) {
        let cfg = {}
        try { cfg = JSON.parse(t || '{}') } catch (_e) { cfg = {} }
        const auth = await checkAuth()
        let outText
        if (auth && auth.ok && String(auth.role||'')==='superadmin') {
          outText = JSON.stringify(cfg)
        } else {
          const publicCfg = {}
          try {
            const flags = (cfg && typeof cfg.flags === 'object') ? cfg.flags : {}
            const enabled = !!(cfg && cfg.auth && cfg.auth.enabled !== false)
            publicCfg.flags = flags
            publicCfg.auth = { enabled }
            if (cfg && typeof cfg.version !== 'undefined') publicCfg.version = cfg.version
          } catch (_e) {}
          outText = JSON.stringify(publicCfg)
        }
        const et = await sha256Hex(outText)
        h.set('ETag', et)
        await logEvent('HEAD', url.pathname, 200, 0, String((auth && auth.ok && auth.user) || ''), '')
        return new Response(null, { status: 200, headers: h })
      }
      if (isPublicDb) {
        let rows = []
        try { rows = JSON.parse(t || '[]') } catch (_e) { rows = [] }
        const safe = Array.isArray(rows) ? rows.filter(r => {
          const p = String(r.prefix||'')
          const c = String(r.collection||'')
          const k = String(r.metakey||'')
          if (p === 'app_' && (c === 'posts' || (c === 'users' && (k === 'username' || k === 'avatar')))) return true
          if (p === 'donate_' && c === 'post') return true
          return false
        }) : []
        const outText = JSON.stringify(safe)
        const et = await sha256Hex(outText)
        h.set('ETag', et)
        await logEvent('HEAD', url.pathname, 200, 0, '', 'public_snapshot')
        return new Response(null, { status: 200, headers: h })
      }
      const authDbHead = await checkAuth()
      if (!authDbHead.ok) {
        await logEvent('HEAD', url.pathname, 401, 0, '', 'unauthorized_read')
        return new Response(null, { status: 401, headers: h })
      }
      const et = await sha256Hex(t)
      h.set('ETag', et)
      await logEvent('HEAD', url.pathname, 200, 0, String(authDbHead.user||''), '')
      return new Response(null, { status: 200, headers: h })
    }
    if (req.method !== 'PUT' && req.method !== 'POST' && req.method !== 'PATCH') return new Response('', { status: 405, headers: h })

    // Admin-only endpoint to set/rotate superadmin password hash in db.json
    if (isAdminSuper && req.method === 'POST') {
      const adminToken = req.headers.get('X-Admin-Token') || ''
      if (!adminToken || adminToken !== (env.ADMIN_TOKEN || '')) {
        h.set('Content-Type','application/json')
        await logEvent('POST', url.pathname, 403, 0, '', 'forbidden')
        return new Response('{"error":"forbidden"}', { status: 403, headers: h })
      }
      const body = await req.text()
      let payload = {}
      try { payload = JSON.parse(body || '{}') } catch (_e) { payload = {} }
      const password = String(payload.password || '')
      if (!password) { h.set('Content-Type','application/json'); await logEvent('POST', url.pathname, 400, 0, '', 'bad_request'); return new Response('{"error":"bad_request"}', { status: 400, headers: h }) }
      let rows
      try { rows = JSON.parse(await getText('db.json') || '[]') } catch (_e) { rows = [] }
      const salt = 'coreenginedb'
      const iterations = 100000
      const hash = await pbkdf2Hex(password, salt, iterations, 32)
      const now = new Date().toISOString()
      const superRec = rows.find(r => Number(r.id||0) === 1 && String(r.prefix||'') === 'coreenginedb_' && String(r.collection||'') === 'superuser')
      if (superRec) {
        const rel = Number(superRec.relid || 0)
        let passCore = rows.find(r => String(r.prefix||'') === 'coreenginedb_' && String(r.collection||'') === 'superuser' && Number(r.relid||0) === rel && String(r.metakey||'') === 'password_hash')
        const value = JSON.stringify({ salt, iterations, hash })
        if (passCore) { passCore.metavalue = value; passCore.updateddate = now }
        else { rows.push({ id: crypto.randomUUID(), relid: rel, prefix:'coreenginedb_', collection:'superuser', metakey:'password_hash', metavalue: value, createddate: now, updateddate: now }) }
        try { superRec.metavalue = ''; superRec.updateddate = now } catch (_e) {}
      } else {
        const firstUser = rows.find(r => Number(r.id||0) === 1 && String(r.prefix||'') === 'app_' && String(r.collection||'') === 'users' && String(r.metakey||'') === 'username')
        if (!firstUser) { h.set('Content-Type','application/json'); await logEvent('POST', url.pathname, 404, 0, '', 'user_not_found'); return new Response('{"error":"user_not_found"}', { status: 404, headers: h }) }
        const rel = Number(firstUser.relid || 0)
        let passRec = rows.find(r => String(r.prefix||'') === 'app_' && String(r.collection||'') === 'users' && Number(r.relid||0) === rel && String(r.metakey||'') === 'password_hash')
        const value = JSON.stringify({ salt, iterations, hash })
        if (passRec) { passRec.metavalue = value; passRec.updateddate = now }
        else { rows.push({ id: crypto.randomUUID(), relid: rel, prefix:'app_', collection:'users', metakey:'password_hash', metavalue: value, createddate: now, updateddate: now }) }
      }
      const pretty = JSON.stringify(rows, null, 2)
      await putText('db.json', pretty)
      const newEt = await sha256Hex(pretty)
      h.set('ETag', newEt)
      h.set('Content-Type','application/json')
      await logEvent('POST', url.pathname, 200, (pretty && pretty.length)||0, '', 'superadmin_set')
      return new Response('{"ok":true}', { status: 200, headers: h })
    }
    // Login verification endpoint (no secrets returned)
    if (isAuthLogin && req.method === 'POST') {
      try {
        const body = await req.text()
        let payload = {}
        try { payload = JSON.parse(body || '{}') } catch (_e) { payload = {} }
        const username = String(payload.username || '')
        const password = String(payload.password || '')
        if (!username || !password) { h.set('Content-Type','application/json'); await logEvent('POST','/auth/login',400,0,'','bad_request'); return new Response('{"error":"bad_request"}', { status: 400, headers: h }) }
        const blocked = await rateLimitShouldBlock('login/'+username)
        if (blocked) { h.set('Content-Type','application/json'); await logEvent('POST','/auth/login',429,0,username,'rate_limited'); return new Response('{"error":"rate_limited"}', { status: 429, headers: h }) }
        let rows = []
        try { rows = JSON.parse(await getText('db.json') || '[]') } catch (_e) { rows = [] }
        let ok = false
        let role = 'user'
        // superadmin hashed
        const superRec = rows.find(r => String(r.prefix||'')==='coreenginedb_' && String(r.collection||'')==='superuser' && Number(r.id||0)===1)
        if (superRec) {
          const rel = Number(superRec.relid||0)
          const passRec = rows.find(r => String(r.prefix||'')==='coreenginedb_' && String(r.collection||'')==='superuser' && Number(r.relid||0)===rel && String(r.metakey||'')==='password_hash')
          if (passRec) {
            let salt='coreenginedb', iterations=100000, stored=''
            try { const obj = JSON.parse(String(passRec.metavalue||'{}')); salt=String(obj.salt||salt); iterations=Number(obj.iterations||iterations); stored=String(obj.hash||'') } catch(_e){ stored=String(passRec.metavalue||'') }
            if (stored) { const calc = await pbkdf2Hex(password, salt, iterations, 32); if (timingSafeEqual(calc, stored) && timingSafeEqual(String(superRec.metakey||''), username)) { ok = true; role = 'superadmin' } }
          }
        }
        // general user hashed/plain
        if (!ok) {
          const urec = rows.find(r => String(r.prefix||'')==='app_' && String(r.collection||'')==='users' && String(r.metakey||'')==='username' && String(r.metavalue||'')===username)
          if (urec) {
            const rel = Number(urec.relid||0)
            const passHash = rows.find(r => String(r.prefix||'')==='app_' && String(r.collection||'')==='users' && Number(r.relid||0)===rel && (String(r.metakey||'')==='password_hash'))
            const passPlain = rows.find(r => String(r.prefix||'')==='app_' && String(r.collection||'')==='users' && Number(r.relid||0)===rel && (String(r.metakey||'')==='password'))
            if (passHash) {
              let salt='coreenginedb', iterations=100000, stored=''
              try { const obj = JSON.parse(String(passHash.metavalue||'{}')); salt=String(obj.salt||salt); iterations=Number(obj.iterations||iterations); stored=String(obj.hash||'') } catch(_e){ stored=String(passHash.metavalue||'') }
              if (stored) { const calc = await pbkdf2Hex(password, salt, iterations, 32); if (timingSafeEqual(calc, stored)) ok = true }
            } else if (passPlain) {
              if (timingSafeEqual(String(passPlain.metavalue||''), password)) ok = true
            }
          }
        }
        h.set('Content-Type','application/json')
        if (ok) { const tok = await makeSession(username, role, (env.SESSION_TTL ? Number(env.SESSION_TTL) : 3600)); h.append('Set-Cookie', `cedb_session=${tok}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${env.SESSION_TTL? Number(env.SESSION_TTL): 3600}`); await logEvent('POST','/auth/login',200,0,username,'login_ok'); return new Response(JSON.stringify({ ok:true }), { status: 200, headers: h }) }
        await logEvent('POST','/auth/login',401,0,username,'bad_credentials')
        return new Response('{"error":"bad_credentials"}', { status: 401, headers: h })
      } catch (_e) {
        h.set('Content-Type','application/json')
        await logEvent('POST','/auth/login',500,0,'','login_error')
        return new Response('{"error":"login_error"}', { status: 500, headers: h })
      }
    }
    if (isAuthSession && req.method === 'GET') {
      const sess = await verifySession(getCookie('cedb_session'))
      h.set('Content-Type','application/json')
      if (sess && sess.u) { await logEvent('GET','/auth/session',200,0,String(sess.u||''),''); return new Response(JSON.stringify({ ok:true, role: String(sess.role||'user') }), { status: 200, headers: h }) }
      await logEvent('GET','/auth/session',401,0,'','unauthorized')
      return new Response('{"error":"unauthorized"}', { status: 401, headers: h })
    }
    if (isAuthLogout && (req.method === 'POST' || req.method === 'GET')) {
      h.append('Set-Cookie','cedb_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0')
      await logEvent(req.method,'/auth/logout',200,0,'','logout')
      return new Response('', { status: 200, headers: h })
    }
    if (tooLarge(req)) { h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 413, 0, '', 'payload_too_large'); return new Response('{"error":"payload_too_large"}', { status: 413, headers: h }) }

    const auth = await checkAuth()
    if (!auth.ok) {
      const candidate = parseBasic().user || ''
      const blocked = await rateLimitShouldBlock(candidate)
      if(blocked){ h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 429, 0, candidate, 'rate_limited'); return new Response('{"error":"rate_limited"}', { status: 429, headers: h }) }
      h.set('Content-Type', 'application/json')
      await logEvent(req.method, url.pathname, 401, 0, '', String(auth.reason || 'unauthorized'))
      return new Response(JSON.stringify({ error: auth.reason || 'unauthorized' }), { status: 401, headers: h })
    }
    const csrf = checkCsrf()
    if(!csrf.ok){
      h.set('Content-Type', 'application/json')
      await logEvent(req.method, url.pathname, 403, 0, String(auth.user||''), String(csrf.reason || 'forbidden'))
      return new Response(JSON.stringify({ error: csrf.reason || 'forbidden' }), { status: 403, headers: h })
    }
    const current = await getText(key)
    const currentEtag = await sha256Hex(current)
    const ifMatch = req.headers.get('If-Match') || ''
    if (!ifMatch) {
      h.set('Content-Type', 'application/json')
      await logEvent(req.method, url.pathname, 400, 0, String(auth.user||''), 'missing_if_match')
      return new Response('{"error":"missing_if_match"}', { status: 400, headers: h })
    }
    if (ifMatch !== currentEtag) {
      h.set('Content-Type', 'application/json')
      await logEvent(req.method, url.pathname, 412, 0, String(auth.user||''), 'precondition_failed')
      return new Response('{"error":"precondition_failed"}', { status: 412, headers: h })
    }
    const body = await req.text()
    if(isTopup){ try{ const payload = JSON.parse(body||'{}'); const amt = Number(payload.amount||0); const username = String(payload.username||''); const kind = String(payload.kind||''); if(!env.STRIPE_SECRET){ h.set('Content-Type','application/json'); await logEvent('POST','/wallet/topup',501,0,String(auth.user||''),'stripe_not_configured'); return new Response('{"error":"stripe_not_configured"}',{ status:501, headers:h }) } if(!amt || !username){ h.set('Content-Type','application/json'); await logEvent('POST','/wallet/topup',400,0,String(auth.user||''),'bad_request'); return new Response('{"error":"bad_request"}',{ status:400, headers:h }) } const origin = req.headers.get('Origin') || 'https://kwentonglasing.servebeer.com'; const success = origin + '/dashboard.html?payment=success'; const cancel = origin + '/dashboard.html?payment=cancel'; const cfgText = await getText('config.json'); let cfg={}; try{ cfg=JSON.parse(cfgText||'{}') }catch(_){ cfg={} } const stripeCfg = cfg && cfg.stripe || {}; const prices = stripeCfg.prices || {}; const priceId = kind==='bottle'? (prices.bottle||'') : (kind==='bucket'? (prices.bucket||'') : (kind==='case'? (prices.case||'') : '')); const form = new URLSearchParams(); form.set('mode','payment'); form.append('payment_method_types[]','card'); form.set('success_url', success); form.set('cancel_url', cancel); if(priceId){ form.append('line_items[0][price]', priceId); form.append('line_items[0][quantity]','1'); } else { const cents = Math.round(amt*100); form.append('line_items[0][price_data][currency]','usd'); form.append('line_items[0][price_data][product_data][name]', kind? ('Top-up '+kind) : 'Wallet Top-up'); form.append('line_items[0][price_data][unit_amount]', String(cents)); form.append('line_items[0][quantity]','1'); }
      form.append('metadata[username]', username); form.append('metadata[amount]', String(amt)); if(kind) form.append('metadata[kind]', kind);
      const sr = await fetch('https://api.stripe.com/v1/checkout/sessions',{ method:'POST', headers:{ 'Authorization':'Bearer '+env.STRIPE_SECRET, 'Content-Type':'application/x-www-form-urlencoded' }, body: form.toString() }); if(!sr.ok){ const t = await sr.text(); h.set('Content-Type','application/json'); await logEvent('POST','/wallet/topup',502, (t&&t.length)||0, String(auth.user||''),'stripe_error'); return new Response('{"error":"stripe_error"}',{ status:502, headers:h }) } const js = await sr.json(); const urlOut = js && js.url ? js.url : ''; h.set('Content-Type','application/json'); await logEvent('POST','/wallet/topup',200,0,String(auth.user||''),'topup_init'); return new Response(JSON.stringify({ ok:true, url: urlOut }),{ status:200, headers:h }) }catch(_e){ h.set('Content-Type','application/json'); await logEvent('POST','/wallet/topup',500,0,String(auth.user||''),'topup_error'); return new Response('{"error":"topup_error"}',{ status:500, headers:h }) } }
    if(isDonate){ try{ const payload = JSON.parse(body||'{}'); const postId = Number(payload.postId||0); const amt = Number(payload.amount||0); const kind = String(payload.kind||''); if(!postId || !amt){ h.set('Content-Type','application/json'); await logEvent('POST','/donate',400,0,String(auth.user||''),'bad_request'); return new Response('{"error":"bad_request"}',{ status:400, headers:h }) } let rows; try{ rows = JSON.parse(current||'[]') }catch(_){ rows=[] } const userRel = 0; // donation debit path would check wallet balance (omitted in stub)
      const now = new Date().toISOString(); rows.push({ id: crypto.randomUUID(), relid: postId, prefix:'donate_', collection:'post', metakey: (kind==='bottle'?'bottles': (kind==='bucket'?'buckets':'cases')), metavalue: 1, createddate: now, updateddate: now }); const pretty = JSON.stringify(rows,null,2); await putText('db.json', pretty); const newEt = await sha256Hex(pretty); h.set('ETag', newEt); h.set('Content-Type','application/json'); await logEvent('POST','/donate',200,amt,String(auth.user||''),'donate'); return new Response('{"ok":true}',{ status:200, headers:h }) }catch(_e){ h.set('Content-Type','application/json'); await logEvent('POST','/donate',500,0,String(auth.user||''),'donate_error'); return new Response('{"error":"donate_error"}',{ status:500, headers:h }) } }
    if(isForgot){ try{ const payload = JSON.parse(body||'{}'); const username = String(payload.username||''); const code = String(payload.code||''); const newPassword = String(payload.newPassword||''); if(!username||!code||!newPassword){ h.set('Content-Type','application/json'); await logEvent('POST','/auth/forgot',400,0,'','bad_request'); return new Response('{"error":"bad_request"}',{ status:400, headers:h }) } let rows; try{ rows=JSON.parse(current||'[]') }catch(_){ rows=[] } const urec = rows.find(r=>String(r.prefix||'')==='app_'&&String(r.collection||'')==='users'&&String(r.metakey||'')==='username'&&String(r.metavalue||'')===username); if(!urec){ h.set('Content-Type','application/json'); return new Response('{"error":"not_found"}',{ status:404, headers:h }) } const rel=Number(urec.relid||0); const recRec = rows.find(r=>String(r.prefix||'')==='app_'&&String(r.collection||'')==='users'&&Number(r.relid||0)===rel&&String(r.metakey||'')==='recovery'); let ok=false; try{ const cfgText = await getText('config.json'); let cfg={}; try{ cfg=JSON.parse(cfgText||'{}') }catch(_){ cfg={} } const salt = (function(){ try{ const r=JSON.parse(recRec.metavalue||'{}'); return String(r.salt||'coreenginedb') }catch(_){ return 'coreenginedb' } })(); const iterations = (function(){ try{ const r=JSON.parse(recRec.metavalue||'{}'); return Number(r.iterations||100000) }catch(_){ return 100000 } })(); const recHashStored = (function(){ try{ const r=JSON.parse(recRec.metavalue||'{}'); return String(r.hash||'') }catch(_){ return '' } })(); const calc = await pbkdf2Hex(code, salt, iterations, 32); ok = timingSafeEqual(calc, recHashStored) }catch(_){ ok=false } if(!ok){ h.set('Content-Type','application/json'); return new Response('{"error":"invalid_code"}',{ status:403, headers:h }) } const salt='coreenginedb'; const iterations=100000; const newHash = await pbkdf2Hex(newPassword, salt, iterations, 32); const now=new Date().toISOString(); const passRec = rows.find(r=>String(r.prefix||'')==='app_'&&String(r.collection||'')==='users'&&Number(r.relid||0)===rel&&String(r.metakey||'')==='password'); if(passRec){ passRec.metavalue = JSON.stringify({ hash: newHash, salt, iterations }); passRec.updateddate=now } const pretty = JSON.stringify(rows,null,2); await putText('db.json', pretty); const newEt = await sha256Hex(pretty); h.set('ETag', newEt); h.set('Content-Type','application/json'); await logEvent('POST','/auth/forgot',200,0,username,'reset'); return new Response('{"ok":true}',{ status:200, headers:h }) }catch(_e){ h.set('Content-Type','application/json'); await logEvent('POST','/auth/forgot',500,0,'','reset_error'); return new Response('{"error":"reset_error"}',{ status:500, headers:h }) } }
    if(isWebhook){ h.set('Content-Type','application/json'); await logEvent('POST','/stripe/webhook',200,0,'','webhook_stub'); return new Response('{"ok":true}',{ status:200, headers:h }) }
    let parsed
    try { parsed = JSON.parse(body || (isCfg ? '{}' : '[]')) } catch (_e) {
      h.set('Content-Type', 'application/json')
      await logEvent(req.method, url.pathname, 400, (body && body.length) || 0, String(auth.user||''), 'invalid_json')
      return new Response('{"error":"invalid_json"}', { status: 400, headers: h })
    }
    if (isDb && !Array.isArray(parsed)) {
      h.set('Content-Type', 'application/json')
      await logEvent(req.method, url.pathname, 400, (body && body.length) || 0, String(auth.user||''), 'expected_array')
      return new Response('{"error":"expected_array"}', { status: 400, headers: h })
    }
    if (isDb && Array.isArray(parsed)) {
      const ok = parsed.every(validateRecord)
      if(!ok){ h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 400, (body && body.length) || 0, String(auth.user||''), 'schema_invalid'); return new Response('{"error":"schema_invalid"}', { status: 400, headers: h }) }
    }
    if (url.pathname === '/journal') {
      try{ const id = crypto.randomUUID(); const day = new Date().toISOString().slice(0,10); const k = `journal/${day}/${id}.json`; await putJson(k, parsed); h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 200, (body && body.length)||0, String(auth.user||''), 'journal_append'); return new Response('{"ok":true}', { status: 200, headers: h }) }catch(_e){ h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 500, 0, String(auth.user||''), 'journal_error'); return new Response('{"error":"journal_error"}', { status: 500, headers: h }) }
    }
    if (url.pathname === '/compact') {
      try{
        const day = url.searchParams.get('day') || new Date().toISOString().slice(0,10)
        const listed = await env.COREENGINEDB.list({ prefix: `journal/${day}/`, limit: 10000 })
        let latestText = ''
        for (const obj of (listed && listed.objects) || []) {
          try{ const r = await env.COREENGINEDB.get(obj.key); const t = r? await r.text() : ''; if(t) latestText = t }catch(_e){}
        }
        let target = []
        try{ const j = latestText? JSON.parse(latestText) : null; if(Array.isArray(j)) target = j }catch(_e){}
        if(!Array.isArray(target) || target.length===0){ h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 400, 0, String(auth.user||''), 'no_journal'); return new Response('{"error":"no_journal"}', { status: 400, headers: h }) }
        const et = await sha256Hex(current)
        const ifm = req.headers.get('If-Match') || ''
        if(!ifm || ifm !== et){ h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 412, 0, String(auth.user||''), 'precondition_failed'); return new Response('{"error":"precondition_failed"}', { status: 412, headers: h }) }
        const pretty = JSON.stringify(target, null, 2)
        await putText('db.json', pretty)
        const newEtag = await sha256Hex(pretty)
        h.set('Content-Type','application/json')
        h.set('ETag', newEtag)
        await logEvent(req.method, url.pathname, 200, (pretty && pretty.length)||0, String(auth.user||''), 'compact_applied')
        return new Response('{"ok":true}', { status: 200, headers: h })
      }catch(_e){ h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 500, 0, String(auth.user||''), 'compact_error'); return new Response('{"error":"compact_error"}', { status: 500, headers: h }) }
    }
    if (isCfg && typeof parsed !== 'object') {
      h.set('Content-Type', 'application/json')
      await logEvent(req.method, url.pathname, 400, (body && body.length) || 0, String(auth.user||''), 'expected_object')
      return new Response('{"error":"expected_object"}', { status: 400, headers: h })
    }
    let allowEmpty = (req.headers.get('X-Allow-Empty-Write') || '').toLowerCase() === 'true'
    try {
      if (isDb) {
        const before = Array.isArray(JSON.parse(current || '[]')) ? JSON.parse(current || '[]').length : 0
        const after = Array.isArray(parsed) ? parsed.length : 0
        if (before > 0 && after === 0 && !allowEmpty) {
          h.set('Content-Type', 'application/json')
          await logEvent(req.method, url.pathname, 400, (body && body.length) || 0, String(auth.user||''), 'empty_write_denied')
          return new Response('{"error":"empty_write_denied"}', { status: 400, headers: h })
        }
      }
    } catch (_e) {}
    const pretty = JSON.stringify(parsed, null, 2)
    await putText(key, pretty)
    const newEtag = await sha256Hex(pretty)
    h.set('Content-Type', 'application/json')
    h.set('ETag', newEtag)
    await logEvent(req.method, url.pathname, 200, (pretty && pretty.length) || 0, String(auth.user||''), '')
    return new Response('{"ok":true}', { status: 200, headers: h })
  }
}
    async function makeSession(u, role, ttlSec){ const now = Math.floor(Date.now()/1000); const exp = now + (Number(ttlSec||3600)); const payload = JSON.stringify({ u:String(u||''), role:String(role||'user'), exp }); const secret = env.ADMIN_TOKEN || ''; const sig = await hmacHex(secret, payload); const b64 = btoa(payload); return `${b64}.${sig}` }
    async function verifySession(tok){ try{ if(!tok) return null; const parts = String(tok).split('.'); if(parts.length!==2) return null; const payload = atob(parts[0]); const sig = parts[1]; const secret = env.ADMIN_TOKEN || ''; const calc = await hmacHex(secret, payload); if(!timingSafeEqual(calc, sig)) return null; const j = JSON.parse(payload||'{}'); if(!j || !j.exp || (Math.floor(Date.now()/1000) > Number(j.exp))) return null; return j }catch(_e){ return null } }
      if (isDb && String(authDb.role||'')!=='superadmin') {
        h.set('Content-Type','application/json')
        await logEvent('GET', url.pathname, 403, 0, String(authDb.user||''), 'forbidden')
        return new Response('{"error":"forbidden"}', { status: 403, headers: h })
      }
      if (isDb && String(authDbHead.role||'')!=='superadmin') { await logEvent('HEAD', url.pathname, 403, 0, String(authDbHead.user||''), 'forbidden'); return new Response(null,{ status:403, headers:h }) }
    if (isDb && String(auth.role||'')!=='superadmin') { h.set('Content-Type','application/json'); await logEvent(req.method, url.pathname, 403, 0, String(auth.user||''), 'forbidden'); return new Response('{"error":"forbidden"}', { status:403, headers:h }) }
