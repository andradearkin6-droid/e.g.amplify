const { layout } = require('./layout');

function loginPage({ error } = {}) {
  return layout({
    title: 'Log in',
    body: `
      <div class="login-wrap">
        <div class="card">
          <h1>Sign in</h1>
          <p class="subtitle">Amplifi — Automating Employee Incentives in ABM</p>
          ${error ? `<div class="flash error">${error}</div>` : ''}
          <form method="POST" action="/login">
            <input name="username" placeholder="Username" autofocus required>
            <input name="password" type="password" placeholder="Password" required>
            <button type="submit">Log in</button>
          </form>
          <p class="muted" style="margin-top:14px;">
            Demo accounts:<br>
            admin / admin123 (admin)<br>
            jamie / employee123 (employee)
          </p>
        </div>
      </div>
    `
  });
}

module.exports = { loginPage };
