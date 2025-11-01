"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const express_session_1 = __importDefault(require("express-session"));
const promise_1 = __importDefault(require("mysql2/promise"));
const mysql2_session_store_1 = __importDefault(require("./utils/mysql2-session-store"));
const model_loader_1 = require("./utils/model-loader");
const adminRouter_1 = __importDefault(require("./controllers/adminRouter"));
const sessionRecover_1 = require("./middleware/sessionRecover");
dotenv_1.default.config();
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: 'http://localhost:5173', credentials: true }));
app.use(body_parser_1.default.json());
// If the incoming cookie is signed (starts with `s:`), unsign it and replace
// the header so express-session reads the raw session id. This helps when
// other libraries write signed cookies but the session store expects raw ids.
app.use((req, _res, next) => {
    try {
        const raw = req.headers.cookie;
        if (!raw)
            return next();
        const parsed = {};
        raw.split(';').forEach((c) => {
            const [k, ...v] = c.split('=');
            if (!k)
                return;
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
            }
            catch (e) {
                // ignore
            }
        }
    }
    catch (e) {
        // ignore
    }
    return next();
});
// session store (MySQL) — optional. fallback to in-memory store in dev if DB not available
let sessionOptions = {
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
                };
            }
            catch (e) {
                return {
                    host: process.env.DB_HOST || 'localhost',
                    port: Number(process.env.DB_PORT || 3306),
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASS || '',
                    database: process.env.DB_NAME || 'lowcode_dev',
                    waitForConnections: true,
                    connectionLimit: 10
                };
            }
        })();
        const pool = promise_1.default.createPool(poolConfig);
        const store = new mysql2_session_store_1.default(pool, process.env.SESSION_TABLE || 'sessions');
        sessionOptions.store = store;
        console.log('Using mysql2-backed session store');
    }
    else {
        console.log('Using in-memory session store (dev) — set ENABLE_MYSQL_SESSION_STORE=true to enable DB-backed sessions');
    }
}
catch (e) {
    console.warn('Failed to create MySQL session store, falling back to MemoryStore', e);
}
app.use((0, express_session_1.default)(sessionOptions));
// Admin routes (publish models)
// attempt to recover sessions from DB if express-session did not populate req.session
app.use(sessionRecover_1.recoverSessionFromDb);
app.use('/admin', adminRouter_1.default);
// Load dynamic models and register CRUD routes
const MODELS_DIR = path_1.default.join(__dirname, 'models-definitions');
async function start() {
    await (0, model_loader_1.loadModelsAndRegisterRoutes)(app, MODELS_DIR);
    (0, model_loader_1.watchModelsDir)(app, MODELS_DIR);
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
        console.log(`Backend listening on http://localhost:${port}`);
    });
}
start().catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
});
