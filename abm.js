// abm.js
// Simulated "reverse-IP lookup" for Account-Based Marketing target detection.
//
// In production you'd call a real service (Clearbit Reveal, IPinfo company
// data, Leadfeeder, etc.) which takes an IP and returns the owning company's
// domain. Those all require paid API keys, so for demo/dev purposes this
// matches against a small local table plus a couple of "always match" test
// values you can trigger yourself.
//
// Swap runLookup() for a real HTTP call to your provider of choice — the
// rest of the app only depends on the { matched, domain } shape below.

const HIGH_VALUE_DOMAINS = {
  // Fake demo ranges — replace with real CIDR ranges or an API call.
  '203.0.113.': 'google.com',
  '198.51.100.': 'microsoft.com'
};

const BONUS_POINTS = 100;

function runLookup(ip) {
  // Special test hooks so you can trigger a bonus during a live demo
  // without needing a real matching IP:
  if (ip === '10.10.10.10') return { matched: true, domain: 'google.com' };
  if (ip === '10.10.10.20') return { matched: true, domain: 'microsoft.com' };

  for (const prefix of Object.keys(HIGH_VALUE_DOMAINS)) {
    if (ip.startsWith(prefix)) {
      return { matched: true, domain: HIGH_VALUE_DOMAINS[prefix] };
    }
  }
  return { matched: false, domain: null };
}

module.exports = { runLookup, BONUS_POINTS };
