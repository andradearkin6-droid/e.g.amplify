// db.js
// A tiny file-backed "database" so the whole project runs with plain Node.js
// and zero npm installs. Swap this out for real SQLite (e.g. better-sqlite3)
// later without touching route logic — every function here maps 1:1 to a
// table operation you'd write in SQL.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function load() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(rows) {
  return rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
}

// ---------- Users ----------
function getUserByUsername(username) {
  return load().users.find(u => u.username === username);
}

function getUserById(id) {
  return load().users.find(u => u.id === id);
}

function updateUserPoints(id, delta) {
  const data = load();
  const user = data.users.find(u => u.id === id);
  if (!user) return null;
  user.points += delta;
  save(data);
  return user;
}

function getLeaderboard() {
  const data = load();
  return data.users
    .filter(u => u.role === 'employee')
    .sort((a, b) => b.points - a.points);
}

// ---------- Campaigns ----------
function getCampaigns() {
  return load().campaigns;
}

function createCampaign({ title, points }) {
  const data = load();
  const campaign = {
    id: nextId(data.campaigns),
    title,
    points: Number(points),
    createdAt: new Date().toISOString()
  };
  data.campaigns.push(campaign);
  save(data);
  return campaign;
}

// ---------- Links ----------
function getLinkByShortcode(shortcode) {
  return load().links.find(l => l.shortcode === shortcode);
}

function getLinkForUserAndCampaign(userId, campaignId) {
  return load().links.find(l => l.userId === userId && l.campaignId === campaignId);
}

function createLink({ shortcode, campaignId, userId }) {
  const data = load();
  const link = {
    id: nextId(data.links),
    shortcode,
    campaignId,
    userId,
    createdAt: new Date().toISOString()
  };
  data.links.push(link);
  save(data);
  return link;
}

function getLinksWithStats() {
  const data = load();
  return data.links.map(link => {
    const campaign = data.campaigns.find(c => c.id === link.campaignId);
    const owner = data.users.find(u => u.id === link.userId);
    const clicks = data.clicks.filter(c => c.linkId === link.id);
    return {
      ...link,
      campaignTitle: campaign ? campaign.title : '(deleted campaign)',
      ownerName: owner ? owner.username : '(deleted user)',
      totalClicks: clicks.length,
      uniqueIps: new Set(clicks.map(c => c.ip)).size,
      pointsAwarded: clicks.reduce((sum, c) => sum + c.pointsAwarded + c.bonusAwarded, 0)
    };
  });
}

// ---------- Clicks (the anti-fraud fingerprint log) ----------
function hasIpAlreadyClicked(linkId, ip) {
  return load().clicks.some(c => c.linkId === linkId && c.ip === ip);
}

function recordClick({ linkId, ip, pointsAwarded, bonusAwarded, matchedDomain }) {
  const data = load();
  const click = {
    id: nextId(data.clicks),
    linkId,
    ip,
    matchedDomain: matchedDomain || null,
    pointsAwarded,
    bonusAwarded,
    timestamp: new Date().toISOString()
  };
  data.clicks.push(click);
  save(data);
  return click;
}

// ---------- Ledger (automated incentive payouts) ----------
function getLedger() {
  return load().ledger.slice().reverse();
}

function getPaidThresholdsForUser(userId) {
  return load().ledger.filter(l => l.userId === userId).map(l => l.threshold);
}

function addLedgerEntry({ userId, threshold, amount, dispatched }) {
  const data = load();
  const user = data.users.find(u => u.id === userId);
  const entry = {
    id: nextId(data.ledger),
    userId,
    username: user ? user.username : 'unknown',
    threshold,
    amount,
    dispatched,
    timestamp: new Date().toISOString()
  };
  data.ledger.push(entry);
  save(data);
  return entry;
}

module.exports = {
  getUserByUsername,
  getUserById,
  updateUserPoints,
  getLeaderboard,
  getCampaigns,
  createCampaign,
  getLinkByShortcode,
  getLinkForUserAndCampaign,
  createLink,
  getLinksWithStats,
  hasIpAlreadyClicked,
  recordClick,
  getLedger,
  getPaidThresholdsForUser,
  addLedgerEntry
};
