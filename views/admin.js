const { layout } = require('./layout');

function adminPage({ user, campaigns, links, ledger, flash }) {
  const navRight = `
    <a href="/dashboard">⬅ Back to Employee Portal</a>
    <a href="/logout">Log out (${user.username})</a>
  `;

  const campaignRows = campaigns.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.title}</td>
      <td>${c.points}</td>
      <td>${new Date(c.createdAt).toLocaleString()}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="muted">No campaigns yet.</td></tr>`;

  const linkRows = links.map(l => `
    <tr>
      <td>${l.shortcode}</td>
      <td>${l.campaignTitle}</td>
      <td>${l.ownerName}</td>
      <td>${l.totalClicks}</td>
      <td>${l.uniqueIps}</td>
      <td>${l.pointsAwarded}</td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="muted">No tracking links generated yet.</td></tr>`;

  const ledgerRows = ledger.map(l => `
    <tr>
      <td>${new Date(l.timestamp).toLocaleString()}</td>
      <td>${l.username}</td>
      <td>${l.threshold} pts threshold</td>
      <td>${l.amount}</td>
      <td><span class="badge ${l.dispatched ? 'good' : 'warn'}">${l.dispatched ? 'Webhook sent' : 'Logged only'}</span></td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="muted">No payouts triggered yet.</td></tr>`;

  return layout({
    title: 'Admin Panel',
    navRight,
    body: `
      <h1>Admin Panel</h1>
      <p class="subtitle">Restricted to administrator accounts only.</p>
      ${flash ? `<div class="flash success">${flash}</div>` : ''}

      <div class="card">
        <h2>Deploy a Campaign</h2>
        <form method="POST" action="/admin/campaigns">
          <input name="title" placeholder="Campaign title" required>
          <input name="points" type="number" placeholder="Points per unique share" required>
          <button type="submit">Deploy Campaign Card</button>
        </form>
      </div>

      <div class="card">
        <h2>Campaigns</h2>
        <table>
          <tr><th>ID</th><th>Title</th><th>Points</th><th>Created</th></tr>
          ${campaignRows}
        </table>
      </div>

      <div class="card">
        <h2>Live Inventory Dashboard — Tracking Links</h2>
        <table>
          <tr><th>Code</th><th>Campaign</th><th>Owner</th><th>Clicks</th><th>Unique IPs</th><th>Points Awarded</th></tr>
          ${linkRows}
        </table>
      </div>

      <div class="card">
        <h2>Automated Incentive Ledger</h2>
        <table>
          <tr><th>When</th><th>Employee</th><th>Trigger</th><th>Amount</th><th>Status</th></tr>
          ${ledgerRows}
        </table>
      </div>
    `
  });
}

module.exports = { adminPage };
