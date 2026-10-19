import fs from 'fs';

const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VaultSpring Wallet — Административная панель</title>
    <meta name="description" content="Административная панель VaultSpring Wallet: пользователи, пополнения, выводы, стейкинг, токены, ограничения, поддержка и аудит." />
    <meta name="theme-color" content="#7C3AED" />
    <link rel="icon" type="image/png" href="/assets/vaultspring-logo.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased">
    <div id="admin-root"></div>
    <script type="module" src="/src/admin/main.tsx"><\/script>
  </body>
</html>
`;

fs.writeFileSync(new URL('../admin.html', import.meta.url), html, 'utf8');
console.log('admin.html written:', html.length, 'bytes');
