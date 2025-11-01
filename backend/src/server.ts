import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';
import mysql from 'mysql2/promise';
import MySQL2SessionStore from './utils/mysql2-session-store';
import { loadModelsAndRegisterRoutes, watchModelsDir } from './utils/model-loader';
import adminRouter from './controllers/adminRouter';
import { authMiddleware } from './middleware/auth';
import { recoverSessionFromDb } from './middleware/sessionRecover';

dotenv.config();

dotenv.config();

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(bodyParser.json());

// If the incoming cookie is signed (starts with `s:`), unsign it and replace
// the header so express-session reads the raw session id. This helps when
// other libraries write signed cookies but the session store expects raw ids.
app.use((req, _res, next) => {
  try {
    const raw = req.headers.cookie;
    if (!raw) return next();
    const parsed: any = {};
    raw.split(';').forEach((c) => {
      const [k, ...v] = c.split('=');
      if (!k) return;
      parsed[k.trim()] = decodeURIComponent((v || []).join('=').trim());
    });
    const sid = parsed['sid'] || parsed['connect.sid'];
    if (sid && sid.startsWith('s:') && process.env.SESSION_SECRET) {
      try {
        // lazy require to avoid top-level dependency issues
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const signature = require('cookie-signature');
        const unsigned = signature.unsign(sid.slice(2), process.env.SESSION_SECRET || 'dev_session_secret');
        if (unsigned) {
          // rebuild cookie header with unsigned sid
          const newCookie = raw.replace(sid, unsigned);
          req.headers.cookie = newCookie;
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }
  return next();
});

// session store (MySQL) — optional. fallback to in-memory store in dev if DB not available
let sessionOptions: any = {
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
};
// Only enable MySQL-backed session store if explicitly requested. This
// avoids authentication/plugin errors when MySQL server uses a different
// auth plugin (e.g., caching_sha2_password) and the Node mysql library
// can't authenticate. To enable, set ENABLE_MYSQL_SESSION_STORE=true and
// ensure the DB credentials in env are compatible.
try {
  if (process.env.ENABLE_MYSQL_SESSION_STORE === 'true') {
    // Build a mysql2 pool from DATABASE_URL or env vars
    const poolConfig = (() => {
      const url = process.env.DATABASE_URL || '';
      try {
        const u = new URL(url);
        return {
          host: u.hostname,
          port: Number(u.port || 3306),
          user: u.username,
          password: u.password,
          database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
          waitForConnections: true,
          connectionLimit: 10
        } as any;
      } catch (e) {
        return {
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASS || '',
          database: process.env.DB_NAME || 'lowcode_dev',
          waitForConnections: true,
          connectionLimit: 10
        } as any;
      }
    })();

    const pool = mysql.createPool(poolConfig as any);
    const store = new MySQL2SessionStore(pool, process.env.SESSION_TABLE || 'sessions');
    sessionOptions.store = store as any;
    console.log('Using mysql2-backed session store');
  } else {
    console.log('Using in-memory session store (dev) — set ENABLE_MYSQL_SESSION_STORE=true to enable DB-backed sessions');
  }
} catch (e) {
  console.warn('Failed to create MySQL session store, falling back to MemoryStore', e);
}

app.use(session(sessionOptions));

// Admin routes (publish models)
// attempt to recover sessions from DB if express-session did not populate req.session
app.use(recoverSessionFromDb);
app.use('/admin', adminRouter);

// Load dynamic models and register CRUD routes
const MODELS_DIR = path.join(__dirname, 'models-definitions');
async function start() {
  await loadModelsAndRegisterRoutes(app, MODELS_DIR);
  watchModelsDir(app, MODELS_DIR);

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
