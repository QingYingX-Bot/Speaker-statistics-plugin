function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function sendAccessDeniedPage(res, message = '当前入口仅限授权访问') {
  const safeMessage = escapeHtml(message)

  res.statusCode = 403
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>访问受限</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #0d0d0d;
      color: #f5f5f5;
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 28px;
      background: #0d0d0d;
    }

    main {
      width: min(420px, 100%);
      padding: 34px 30px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      background: #111;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
    }

    .code {
      margin: 0 0 18px;
      color: #a3a3a3;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.2;
      font-weight: 650;
      letter-spacing: 0;
    }

    p {
      margin: 14px 0 0;
      color: #d4d4d4;
      font-size: 15px;
      line-height: 1.7;
    }

    .hint {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #a3a3a3;
      font-size: 13px;
    }

    @media (prefers-color-scheme: light) {
      :root {
        background: #f6f6f6;
        color: #111;
      }

      body {
        background: #f6f6f6;
      }

      main {
        border-color: rgba(0, 0, 0, 0.12);
        background: #fff;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.08);
      }

      .code,
      .hint {
        color: #737373;
      }

      p {
        color: #404040;
      }

      .hint {
        border-top-color: rgba(0, 0, 0, 0.1);
      }
    }
  </style>
</head>
<body>
  <main>
    <p class="code">403 Access Denied</p>
    <h1>访问受限</h1>
    <p>${safeMessage}</p>
    <p class="hint">背景设置请使用私聊机器人生成的专属链接进入。</p>
  </main>
</body>
</html>`)
}
