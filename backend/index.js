require('dotenv').config();

// Fail fast on missing critical config instead of crashing deep inside a request later.
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`FATAL: missing required env var(s): ${missingEnv.join(', ')}`);
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const dns = require('dns');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cacheControl = require('./middlewares/cacheControl');

const isProd = process.env.NODE_ENV === 'production';

// Windows-only DNS workaround: some local Windows setups advertise an empty IPv6 entry (::),
// which Node's bundled resolver (c-ares) tries first and fails with `querySrv ECONNREFUSED`,
// breaking mongodb+srv:// SRV lookups. On Linux hosts (Render, etc.) the platform resolver
// works fine and forcing public resolvers can hurt, so scope this to Windows.
if (process.platform === 'win32') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

// IMPORTANT: Declare app before using it
const app = express();

// Now you can safely use app.use()
const server = http.createServer(app);

// Rest of your imports
const WebSocketServer = require('./websocket');
const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forum');
const auth = require('./middlewares/auth');
const openf1Routes = require('./routes/openf1');

const wss = new WebSocketServer(server);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn('CORS blocked:', origin, '— allowed:', allowedOrigins.join(', '));
    callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Behind Render/any proxy: trust the first hop so req.ip / rate-limit see the real client IP.
app.set('trust proxy', 1);

// Security headers + gzip. API serves JSON (not HTML), so CSP is irrelevant and CORP is set
// to cross-origin so the separate frontend origin can read responses.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

// Now you can use app.use() safely
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging — skip in production to keep the event loop free at scale (set
// LOG_REQUESTS=1 to force it on).
if (!isProd || process.env.LOG_REQUESTS === '1') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Rate limiting (in-memory store now; point `store` at Redis when running multiple instances).
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 40, standardHeaders: true, legacyHeaders: false });
// Keyed by client IP (trust proxy is on). Generous so users behind one NAT/CGNAT egress IP
// don't trip it during a live race (live + weather + trackmap polling per open tab).
const apiLimiter = rateLimit({ windowMs: 60_000, max: 600, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);

// Public, cacheable F1 read endpoints → set Cache-Control (browsers/CDN absorb repeat reads).
app.use('/api', cacheControl);

// Database connection — bounded pool, and KEEP RETRYING on failure so the server recovers on
// its own once MongoDB becomes reachable (e.g. after fixing the Atlas IP allow-list) without a
// manual redeploy. A generous server-selection timeout tolerates cold/remote network latency.
async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
    });
    console.log(' Connected to MongoDB');
  } catch (err) {
    console.error(' MongoDB connection error:', err.message, '— retrying in 5s');
    setTimeout(connectMongo, 5000);
  }
}
connectMongo();
mongoose.connection.on('error', (e) => console.error(' MongoDB error:', e.message));
mongoose.connection.on('disconnected', () => console.warn(' MongoDB disconnected'));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/forum', auth, forumRoutes);
app.use('/api/openf1', openf1Routes);
app.use('/api', require('./routes/f1')); // /api/calendar, /api/standings/*, /api/drivers/:n/career
app.use('/api', require('./routes/session')); // /api/session/:sessionKey/*
app.use('/api', require('./routes/profile')); // /api/profile/*
app.use('/api', require('./routes/news')); // /api/news

// Health check — reports DB connectivity so the platform can restart on a dead dependency.
app.get('/api/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1; // 1 = connected
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'OK' : 'DEGRADED',
    db: dbUp ? 'up' : 'down',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.status(200).send("Server is alive");
});

// Global error handling
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    // Don't echo the server's allow-list back to a rejected caller (info disclosure).
    return res.status(403).json({ message: 'CORS policy violation' });
  }

  res.status(500).json({
    message: 'Something went wrong!',
    error: isProd ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 5001;
let warmTimer;
server.listen(PORT, '0.0.0.0', () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Allowed origins: ${allowedOrigins.join(', ')}`);
  warmF1Cache();                                          // fill the caches in the background now…
  warmTimer = setInterval(warmF1Cache, 6 * 60 * 60 * 1000); // …and keep them warm every 6h
  warmTimer.unref();                                      // don't let it block shutdown
});

// Graceful shutdown: on a platform redeploy (SIGTERM) drain connections and finish in-flight
// requests instead of dropping them, with a hard 15s backstop. Idempotent.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down gracefully…`);
  if (warmTimer) clearInterval(warmTimer);
  try { wss.wss?.clients?.forEach((c) => c.close(1001, 'Server shutting down')); } catch { /* noop */ }
  server.close(() => {
    mongoose.connection.close(false).finally(() => process.exit(0));
  });
  // Close idle keep-alive sockets so server.close() can resolve promptly (Node 18.2+).
  if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
  setTimeout(() => { console.error('Forced shutdown after 15s'); process.exit(1); }, 15000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Pre-populate the F1 caches (calendar + career standings) off the request path. The
// career sweep makes ~88 throttled Jolpica calls (~25s) on a cold cache; doing it here
// means real users always hit warm caches instead of waiting. Fire-and-forget.
async function warmF1Cache() {
  try {
    const { getCurrentSeason } = require('./services/season');
    const { buildCalendar } = require('./services/calendar');
    const standings = require('./services/standings');
    const year = await getCurrentSeason();
    await buildCalendar(year).catch(() => {});
    // LOW priority: the career sweep must yield to on-demand profile/standings requests.
    await standings.driverStandingsWithCareer(year, { priority: 'low' }).catch(() => {});
    await standings.constructorStandings(year).catch(() => {});
    console.log(` F1 cache warmed for season ${year}`);
  } catch (err) {
    console.warn(' F1 cache warm skipped:', err.message);
  }
}

module.exports = app;
