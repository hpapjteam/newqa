const isPrivateOrInternalUrl = (urlStr: string): boolean => {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }
    const hostname = parsed.hostname.toLowerCase();
    
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) {
      return true;
    }

    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, p1, p2] = match.map(Number);
      if (
        p1 === 10 ||
        (p1 === 172 && p2 >= 16 && p2 <= 31) ||
        (p1 === 192 && p2 === 168) ||
        (p1 === 169 && p2 === 254) ||
        p1 === 127 ||
        p1 === 0
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
};

export default async function handler(req: any, res: any) {
  // Always allow CORS for iframe preview
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let rawUrl = req.query?.url;
  if (Array.isArray(rawUrl)) rawUrl = rawUrl[0];

  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <! baseline html >
      <html>
        <head><title>No URL Provided</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #64748b;">
          <div style="text-align: center; padding: 20px;">
            <p style="font-weight: 600;">No View Online URL specified</p>
            <p style="font-size: 12px; color: #94a3b8;">Enter a valid URL above to preview online campaign content.</p>
          </div>
        </body>
      </html>
    `);
  }

  let targetUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  if (isPrivateOrInternalUrl(targetUrl)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Forbidden URL</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #fef2f2; color: #991b1b;">
          <div style="text-align: center; padding: 20px;">
            <p style="font-weight: 700; font-size: 16px;">Access Restricted</p>
            <p style="font-size: 13px;">Cannot proxy internal, private, or non-HTTP addresses.</p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      redirect: "follow"
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Fetch Status ${response.status}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
              .card { background: #1e293b; border: 1px solid #334155; padding: 32px; rounded: 16px; border-radius: 16px; max-width: 480px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
              .badge { background: #f59e0b; color: #78350f; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px; }
              h2 { font-size: 18px; margin: 0 0 8px 0; color: #ffffff; }
              p { font-size: 13px; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.5; word-break: break-all; }
              .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: #ffffff; font-weight: 600; font-size: 13px; text-decoration: none; padding: 10px 20px; border-radius: 8px; transition: background 0.2s; }
              .btn:hover { background: #1d4ed8; }
            </style>
          </head>
          <body>
            <div class="card">
              <span class="badge">HTTP ${response.status}</span>
              <h2>Upstream Server Error</h2>
              <p>The target server returned HTTP status <strong>${response.status}</strong> for URL:<br><span style="color:#60a5fa; font-family: monospace;">${targetUrl}</span></p>
              <a href="${targetUrl}" target="_blank" class="btn">Open Link Directly ↗</a>
            </div>
          </body>
        </html>
      `);
    }

    const html = await response.text();
    const baseTag = `<base href="${targetUrl}">`;
    const darkModeScript = `
      <style>
        html.dark-mode-preview {
          filter: invert(1) hue-rotate(180deg) !important;
          background-color: #0d1117 !important;
        }
        html.dark-mode-preview img, 
        html.dark-mode-preview picture, 
        html.dark-mode-preview video, 
        html.dark-mode-preview canvas, 
        html.dark-mode-preview svg, 
        html.dark-mode-preview [style*="background-image"],
        html.dark-mode-preview [style*="background:url"],
        html.dark-mode-preview [style*="background: url"],
        html.dark-mode-preview .dark-mode-preserve,
        html.dark-mode-preview [data-dark-mode-preserve] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
        html.dark-mode-preview .light-img { display: none !important; }
        html.dark-mode-preview .dark-img { display: block !important; }
      </style>
      <script>
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'QA_THEME_UPDATE') {
            if (e.data.theme === 'dark') {
              document.documentElement.classList.add('dark-mode-preview');
            } else {
              document.documentElement.classList.remove('dark-mode-preview');
            }
          }
        });
      </script>
    `;

    let modifiedHtml = html;
    if (html.includes("<head>")) {
      modifiedHtml = html.replace("<head>", `<head>${baseTag}${darkModeScript}`);
    } else {
      modifiedHtml = baseTag + darkModeScript + html;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(modifiedHtml);
  } catch (error: any) {
    console.error("[Vercel Proxy Error]:", error?.message || error);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>View Online Preview Error</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 32px; border-radius: 16px; max-width: 480px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
            .badge { background: #ef4444; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px; }
            h2 { font-size: 18px; margin: 0 0 8px 0; color: #ffffff; }
            p { font-size: 13px; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.5; word-break: break-all; }
            .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: #ffffff; font-weight: 600; font-size: 13px; text-decoration: none; padding: 10px 20px; border-radius: 8px; transition: background 0.2s; }
            .btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Connection Fallback</span>
            <h2>Unable to Proxy Content</h2>
            <p>Could not load live preview directly through serverless proxy (<span style="font-family:monospace; color:#cbd5e1;">${error?.message || "Timeout or Network error"}</span>).</p>
            <a href="${targetUrl}" target="_blank" class="btn">Open View Online Link Directly ↗</a>
          </div>
        </body>
      </html>
    `);
  }
}
