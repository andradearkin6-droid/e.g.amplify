// webhook.js
// Dispatches a real HTTP POST to a Slack or Microsoft Teams incoming
// webhook URL when an employee crosses a points threshold. If no URL is
// configured, it just logs to the console so the app still runs out of
// the box during a demo.

const https = require('https');

const WEBHOOK_URL = process.env.AMPLIFI_WEBHOOK_URL || '';

function send(message) {
  if (!WEBHOOK_URL) {
    console.log(`[webhook:not-configured] Would have sent: "${message}"`);
    return Promise.resolve(false);
  }

  const payload = JSON.stringify({ text: message });
  const url = new URL(WEBHOOK_URL);

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 300));
    });
    req.on('error', (err) => {
      console.error('[webhook:error]', err.message);
      resolve(false);
    });
    req.write(payload);
    req.end();
  });
}

module.exports = { send };
