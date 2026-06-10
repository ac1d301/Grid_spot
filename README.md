# Formula 1 GridSpot🏁

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Click%20Here-red?style=for-the-badge&logo=vercel)](https://grid-spot-web.vercel.app)
[![GitHub Stars](https://img.shields.io/github/stars/ac1d301/Grid-spot-web?style=for-the-badge)](https://github.com/ac1d301/Grid-spot-web)

A modern web application for Formula 1 enthusiasts featuring live driver statistics, race information, and community discussions.  
Live Demo: [https://grid-spot-web.vercel.app](https://grid-spot-web.vercel.app)


## Features

- **Race Center** - Per-session results, lap times, tyre & pit strategy, sector speeds, weather, race control and live timing
- **Telemetry** - Multi-driver speed comparison around the lap (plus throttle/brake for a single driver)
- **Race Results** - Real-time F1 race results calculated from the OpenF1 API
- **Race Information** - Live race schedules and weekend countdowns
- **Driver Statistics** - Current season driver stats plus career records, with driver profiles
- **Discussion Forum** - Real-time community discussions with WebSocket
- **2026 Season Calendar View** - View the calendar (in IST) to know race dates and session times

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/formula1-hub.git
cd formula1-hub
```

2. **Backend setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

3. **Frontend setup**
```bash
cd frontend
npm install
npm run dev
```

4. **Open your browser**
```
http://localhost:3000
```

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- React Router

**Backend**
- Node.js + Express
- MongoDB + Mongoose  
- JWT Authentication
- WebSocket Server

**External APIs**
- OpenF1 API for live timing, telemetry and session data
- Jolpica (Ergast successor) for official championship standings and career records

## Environment Variables

Create a `.env` file in the backend directory:

```bash
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
PORT=5001
```

## Usage

1. **Register/Login** to access all features
2. **View Driver Stats** - Toggle between season and career statistics  
3. **Join Discussions** - Participate in community forums
4. **Track Races** - Get live updates on race weekends

## Changelog

### v1.1.0 — Patch update (2026-06-10)

A large reliability, performance and UX pass across the whole app.

**New**
- **Home page** rebuilt as a fan hub: themed hero with a live next-race countdown, a single race spotlight (live or next), a championship snapshot (top drivers + constructors), latest news, and a quick-links grid.
- **Driver Stats** redesigned: headshot-forward driver cards, a top-3 championship podium, and search / team-filter / sort controls.
- **Driver profiles** with career records and season-by-season results.
- Navbar **GRID SPOT** is now a styled (non-clickable) logo.

**Race Center**
- Comparison & telemetry charts now default to the **top 3 drivers of that session** (practice / qualifying / race).
- Tyre strategy + pit stops merged into one tabbed **Race Strategy** widget (Timeline ⇄ Pit stops).
- **Pit stops grouped by driver** — number of stops, and the lap + tyre fitted for each stop.
- Lap-time charts get a cleaner, round-tick Y-axis (with outlier laps clipped); telemetry speed axis is floored to fill the racing band.
- **Telemetry X-axis** now plots **position around the lap (0–100% distance)** so drivers line up corner-for-corner instead of drifting apart on elapsed time.
- Sprint weekends are now detected and flagged correctly.

**Forum**
- Live updates over WebSocket (new comments & votes appear in real time), search + category filter, optimistic posting, and a theme matching the rest of the site.
- Backend: DB indexes, a real (fixed) comment counter, and input validation.

**Fixed**
- **Missing Race Center data** for some races — the OpenF1 client now throttles + retries requests, so a session's widgets no longer fail when the upstream rate-limits a burst of calls.
- **Driver profile infinite loading** — on-demand requests now jump ahead of the background cache-warmer and Jolpica request spacing was widened, so profiles load in seconds (and instantly once cached) instead of timing out.
- Cancelled / data-less sessions degrade gracefully instead of erroring.

**Performance**
- Vendor bundle split (recharts / react / query / date-fns) — smaller initial download; charts load only on the Race Center.
- Persistent client cache for instant warm reloads, trimmed background polling (no refetching on hidden tabs), memoised cards and lazy-loaded images.

**Production & scaling**
- Backend hardened: gzip compression, security headers (helmet), rate limiting, MongoDB pool tuning, startup env validation, graceful shutdown, a DB-aware health check, and status-aware HTTP `Cache-Control` headers on the public read endpoints (live data stays uncached).
- Redis-ready cache seam plus a `SCALING.md` roadmap for scaling toward ~100k users.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request


## Acknowledgments

- [OpenF1 API](https://openf1.org/) for providing F1 data
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- Formula 1 community for inspiration

 Support

Having issues? [Open an issue](https://github.com/ac1d301/Grid-spot-web/issues) or reach out to [diffv27l@gmail.com](mailto:diffv27@gmail.com.com)

<div align="center">
Made with passion for F1 fans INDIA
</div>
