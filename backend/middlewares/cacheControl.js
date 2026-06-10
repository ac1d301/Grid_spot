// Adds Cache-Control to the public, status-INDEPENDENT F1 read endpoints so browsers and any
// CDN in front of the API absorb the bulk of repeat reads — the single biggest lever for read
// scale. Mounted once at /api (so req.path here is already mount-relative, e.g. "/calendar").
// Forum/auth/health match nothing here and stay uncached.
//
// NOTE: /session/* is deliberately NOT handled here — those endpoints serve live-updating data
// while a session is in progress and immutable history once it's done, so their Cache-Control
// is set per-request in routes/session.js based on the resolved session status.
const set = (res, maxAge) =>
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 4}`);

module.exports = function cacheControl(req, res, next) {
  if (req.method !== 'GET') return next();
  const p = req.path;

  if (p.startsWith('/calendar')) set(res, 600);        // schedule: near-static
  else if (p.startsWith('/standings')) set(res, 120);  // settle after a race
  else if (p.startsWith('/drivers/')) set(res, 600);   // career stats
  else if (p.startsWith('/profile')) set(res, 600);
  else if (p.startsWith('/news')) set(res, 120);

  next();
};
