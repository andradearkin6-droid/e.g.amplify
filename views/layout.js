function layout({ title, navRight, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} · Amplifi</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <nav>
    <div class="brand">⚡ Amplifi</div>
    <div>${navRight || ''}</div>
  </nav>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

module.exports = { layout };
