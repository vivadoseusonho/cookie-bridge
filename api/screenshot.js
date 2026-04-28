const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url, affLink } = req.body;
  if (!url || !affLink) return res.status(400).json({ error: "url e affLink são obrigatórios" });

  let browser;
  try {
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: "new",
    });

    const page = await browser.newPage();

    // ── DESKTOP screenshot ──
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const desktopShot = await page.screenshot({ type: "jpeg", quality: 82, fullPage: false });
    const desktopB64 = desktopShot.toString("base64");

    // ── MOBILE screenshot ──
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const mobileShot = await page.screenshot({ type: "jpeg", quality: 82, fullPage: false });
    const mobileB64 = mobileShot.toString("base64");

    await browser.close();

    const html = buildHTML(desktopB64, mobileB64, affLink, url);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({ html });

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

function buildHTML(desktopB64, mobileB64, affLink, originalUrl) {
  const safeLink = affLink.replace(/"/g, "&quot;");
  const domain = (() => { try { return new URL(originalUrl).hostname; } catch { return originalUrl; } })();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${domain}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Merriweather:wght@700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100vw; height: 100vh; overflow: hidden; font-family: 'Inter', sans-serif; background: #000; }
  .page-bg {
    position: fixed; inset: 0;
    background-size: cover; background-position: top center; background-repeat: no-repeat;
    filter: blur(2.5px) brightness(0.78);
    pointer-events: none; user-select: none;
    background-image: url('data:image/jpeg;base64,${desktopB64}');
  }
  @media (max-width: 768px) {
    .page-bg { background-image: url('data:image/jpeg;base64,${mobileB64}'); }
  }
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.52);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999; padding: 16px; animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .cookie-popup {
    background: #fff; border-radius: 16px; width: min(460px, 100%);
    padding: clamp(28px, 7vw, 44px) clamp(24px, 6vw, 44px) clamp(20px, 5vw, 32px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.12);
    text-align: center; animation: popIn 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both;
    position: relative; overflow: hidden;
  }
  .cookie-popup::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px;
    background: linear-gradient(90deg, #6c3fc5, #a855f7, #ec4899, #f97316, #eab308);
  }
  @keyframes popIn { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .cookie-popup h2 {
    font-family: 'Merriweather', serif; font-size: clamp(20px, 5vw, 26px);
    color: #1a1a1a; font-weight: 700; margin-bottom: 14px; margin-top: 10px;
  }
  .cookie-popup p {
    font-size: clamp(13px, 3vw, 14.5px); color: #555; line-height: 1.65;
    margin-bottom: 26px; max-width: 360px; margin-left: auto; margin-right: auto;
  }
  .btn-group { display: flex; gap: 12px; justify-content: center; margin-bottom: 22px; flex-wrap: wrap; }
  .btn {
    padding: 13px 0; width: 150px; border-radius: 10px;
    font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600;
    cursor: pointer; text-decoration: none; display: inline-flex;
    align-items: center; justify-content: center;
    transition: transform 0.15s, background 0.15s; border: none;
  }
  .btn:hover { transform: translateY(-2px); }
  .btn-allow { background: #2e7d62; color: #fff; box-shadow: 0 4px 16px rgba(46,125,98,0.3); }
  .btn-allow:hover { background: #245f4a; }
  .btn-close { background: #fff; color: #333; border: 1.5px solid #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .btn-close:hover { background: #f0f0f0; }
  .divider { border: none; border-top: 1px solid #ebebeb; margin: 0 -44px 16px; }
  .cookie-popup footer { font-size: 12px; color: #aaa; }
  @media (max-width: 400px) { .btn { width: 130px; font-size: 14px; } .divider { margin: 0 -24px 16px; } }
</style>
</head>
<body>
<div class="page-bg" aria-hidden="true"></div>
<div class="overlay">
  <div class="cookie-popup" role="dialog" aria-modal="true">
    <h2>Cookie Policy</h2>
    <p>This site uses cookies to customize content and ads, provide social media resources and analyze our traffic. By clicking &ldquo;Allow&rdquo;, you agree to the use of cookies. For more information, visit our Cookie Policy.</p>
    <div class="btn-group">
      <a href="${safeLink}" class="btn btn-allow">Allow</a>
      <a href="${safeLink}" class="btn btn-close">Close</a>
    </div>
    <hr class="divider">
    <footer>Your privacy is important to us</footer>
  </div>
</div>
</body>
</html>`;
}
