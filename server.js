const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');

const db = require('./db');
const abm = require('./abm');
const webhook = require('./webhook');
const { loginPage } = require('./views/login');
const { dashboardPage } = require('./views/dashboard');
const { adminPage } = require('./views/admin');

const PORT = process.env.PORT || 3000;
const PAYOUT_THRESHOLD = 100; // every N points triggers an automated payout event

// ---------- Sessions (in-memory token -> userId) ----------
const sessions = new Map();

function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, userId);
  return token;
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.amplifi_session;
  if (!token || !sessions.has(token)) return null;
  return db.getUserById(sessions.get(token));
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}

// ---------- Helpers ----------
function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function redirect(res, location, cookie) {
  const headers = { Location: location };
  if (cookie) headers['Set-Cookie'] = cookie;
  res.writeHead(302, headers);
  res.end();
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress.replace('::ffff:', '');
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => resolve(querystring.parse(body)));
  });
}

function generateShortcode() {
  // 6-character randomized shortcode, matches the demo script's spec
  return crypto.randomBytes(4).toString('base64url').slice(0, 6);
}

// ---------- Incentive automation engine ----------
// Checks whether the employee just crossed a new $100-point-style threshold.
// If so, logs the payout to the ledger and dispatches a webhook.
async function checkAndDispatchPayout(userId) {
  const user = db.getUserById(userId);
  const crossedThresholds = Math.floor(user.points / PAYOUT_THRESHOLD);
  const alreadyPaid = db.getPaidThresholdsForUser(userId);

  for (let t = 1; t <= crossedThresholds; t++) {
    const thresholdPoints = t * PAYOUT_THRESHOLD;
    if (!alreadyPaid.includes(thresholdPoints)) {
      const dispatched = await webhook.send(
        `🎉 *${user.username}* just crossed *${thresholdPoints} points* on Amplifi and earned an incentive payout!`
      );
      db.addLedgerEntry({
        userId,
        threshold: thresholdPoints,
        amount: thresholdPoints,
        dispatched
      });
    }
  }
}

// ---------- Route-based middleware ----------
function requireAuth(req, res) {
  const user = getSessionUser(req);
  if (!user) {
    redirect(res, '/login');
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    // Role-based gatekeeper: unauthorized attempts to force /admin are blocked
    redirect(res, '/dashboard');
    return null;
  }
  return user;
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  const [pathname, queryStr] = req.url.split('?');
  const query = querystring.parse(queryStr || '');

  try {
    // --- Static files ---
    if (pathname === '/style.css') {
      const css = fs.readFileSync(path.join(__dirname, 'public/style.css'));
      res.writeHead(200, { 'Content-Type': 'text/css' });
      return res.end(css);
    }

    // --- Login ---
    if (pathname === '/login' && req.method === 'GET') {
      return sendHtml(res, 200, loginPage({ error: query.error }));
    }

    if (pathname === '/login' && req.method === 'POST') {
      const { username, password } = await readBody(req);
      const user = db.getUserByUsername(username);
      if (!user || user.password !== password) {
        return sendHtml(res, 200, loginPage({ error: 'Invalid username or password.' }));
      }
      const token = createSession(user.id);
      return redirect(
        res,
        user.role === 'admin' ? '/admin' : '/dashboard',
        `amplifi_session=${token}; HttpOnly; Path=/`
      );
    }

    if (pathname === '/logout') {
      const cookies = parseCookies(req);
      sessions.delete(cookies.amplifi_session);
      return redirect(res, '/login', 'amplifi_session=; Path=/; Max-Age=0');
    }

    // --- Employee dashboard ---
    if (pathname === '/dashboard' && req.method === 'GET') {
      const user = requireAuth(req, res);
      if (!user) return;
      const campaigns = db.getCampaigns();
      const myLinks = db.getLinksWithStats().filter(l => l.userId === user.id);
      const leaderboard = db.getLeaderboard();
      return sendHtml(res, 200, dashboardPage({
        user,
        campaigns,
        myLinks,
        leaderboard,
        host: req.headers.host,
        flash: query.msg
      }));
    }

    // Generate a personal tracking link for a campaign
    if (pathname === '/generate-link' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;
      const { campaignId } = await readBody(req);
      const cId = Number(campaignId);

      let link = db.getLinkForUserAndCampaign(user.id, cId);
      if (!link) {
        link = db.createLink({
          shortcode: generateShortcode(),
          campaignId: cId,
          userId: user.id
        });
      }
      return redirect(res, '/dashboard');
    }

    // --- Admin panel ---
    if (pathname === '/admin' && req.method === 'GET') {
      const user = requireAdmin(req, res);
      if (!user) return;
      return sendHtml(res, 200, adminPage({
        user,
        campaigns: db.getCampaigns(),
        links: db.getLinksWithStats(),
        ledger: db.getLedger(),
        flash: query.msg
      }));
    }

    if (pathname === '/admin/campaigns' && req.method === 'POST') {
      const user = requireAdmin(req, res);
      if (!user) return;
      const { title, points } = await readBody(req);
      db.createCampaign({ title, points });
      return redirect(res, '/admin?msg=' + encodeURIComponent('Campaign deployed.'));
    }

    // --- Tracker engine: /r/:shortcode ---
    if (pathname.startsWith('/r/')) {
      const shortcode = pathname.slice(3);
      const link = db.getLinkByShortcode(shortcode);
      if (!link) {
        return sendHtml(res, 404, '<h1>Link not found</h1>');
      }

      const campaign = db.getCampaigns().find(c => c.id === link.campaignId);
      const ip = getClientIp(req);
      const alreadyClicked = db.hasIpAlreadyClicked(link.id, ip);

      let pointsAwarded = 0;
      let bonusAwarded = 0;
      let matchedDomain = null;

      if (!alreadyClicked && campaign) {
        // Simulated ABM reverse-IP lookup for high-value target detection
        const lookup = abm.runLookup(ip);
        pointsAwarded = campaign.points;
        if (lookup.matched) {
          bonusAwarded = abm.BONUS_POINTS;
          matchedDomain = lookup.domain;
        }
        db.updateUserPoints(link.userId, pointsAwarded + bonusAwarded);
        await checkAndDispatchPayout(link.userId);
      }
      // Duplicate IPs still forward cleanly to the destination — fraud
      // prevention just blocks the point generation, not the user experience.
      db.recordClick({ linkId: link.id, ip, pointsAwarded, bonusAwarded, matchedDomain });

      const destination = 'https://example.com/landing-page';
      return redirect(res, destination);
    }

    // --- Root ---
    if (pathname === '/') {
      return redirect(res, '/dashboard');
    }

    sendHtml(res, 404, '<h1>404 — Not found</h1><a href="/dashboard">Go home</a>');
  } catch (err) {
    console.error(err);
    sendHtml(res, 500, '<h1>500 — Something broke</h1>');
  }
});

server.listen(PORT, () => {
  console.log(`Amplifi running at http://localhost:${PORT}`);
  console.log(`Login as admin/admin123 or jamie/employee123`);
});
