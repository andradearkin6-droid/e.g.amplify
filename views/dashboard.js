const { layout } = require('./layout');

function dashboardPage({ user, campaigns, myLinks, leaderboard, host, flash }) {
  const navRight = `
    ${user.role === 'admin' ? '<a href="/admin">⚙ Admin Panel</a>' : ''}
    <a href="/logout">Log out (${user.username})</a>
  `;

  const campaignCards = campaigns.map(c => {
    const existingLink = myLinks.find(l => l.campaignId === c.id);
    const shareUrl = existingLink ? `http://${host}/r/${existingLink.shortcode}` : null;
    return `
      <div class="campaign-card">
        <h3>${c.title} <span class="points-pill">+${c.points} pts</span></h3>
        ${shareUrl
          ? `<div class="link-box">
               <input readonly value="${shareUrl}" onclick="this.select()">
             </div>
             <p class="muted" style="margin-top:6px;">Your unique tracking link — share it. Each unique visitor earns you points once.</p>`
          : `<form method="POST" action="/generate-link">
               <input type="hidden" name="campaignId" value="${c.id}">
               <button type="submit">Generate My Tracking Link</button>
             </form>`
        }
      </div>
    `;
  }).join('') || '<p class="muted">No campaigns live yet — check back soon.</p>';

  const leaderboardRows = leaderboard.map((u, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${u.username}${u.id === user.id ? ' (you)' : ''}</td>
      <td>${u.points} pts</td>
    </tr>
  `).join('');

  return layout({
    title: 'Dashboard',
    navRight,
    body: `
      <h1>Employee Portal</h1>
      <p class="subtitle">Share active marketing plays and earn incentive points.</p>
      ${flash ? `<div class="flash success">${flash}</div>` : ''}

      <div class="grid">
        <div class="card">
          <h2>Active Campaigns</h2>
          ${campaignCards}
        </div>
        <div class="card">
          <h2>Standings Leaderboard</h2>
          <table>
            <tr><th>Rank</th><th>Employee</th><th>Points</th></tr>
            ${leaderboardRows}
          </table>
        </div>
      </div>
    `
  });
}

module.exports = { dashboardPage };
