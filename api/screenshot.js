module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url, affLink, apiKey, lang, model, desconto, desktopB64, mobileB64 } = req.body;
  if (!url || !affLink) return res.status(400).json({ error: "url e affLink são obrigatórios" });

  try {
    let desktop = desktopB64;
    let mobile  = mobileB64;

    if (!desktop || !mobile) {
      if (!apiKey) return res.status(400).json({ error: "apiKey é obrigatória" });
      const desktopUrl = `https://api.screenshotone.com/take?access_key=${apiKey}&url=${encodeURIComponent(url)}&viewport_width=1440&viewport_height=900&format=jpg&image_quality=90&block_ads=true&block_cookie_banners=true&delay=2&device_scale_factor=1`;
      const mobileUrl  = `https://api.screenshotone.com/take?access_key=${apiKey}&url=${encodeURIComponent(url)}&viewport_width=390&viewport_height=844&format=jpg&image_quality=90&block_ads=true&block_cookie_banners=true&delay=2&device_scale_factor=2`;
      const [dR, mR] = await Promise.all([fetch(desktopUrl), fetch(mobileUrl)]);
      if (!dR.ok) throw new Error("Erro desktop: " + await dR.text());
      if (!mR.ok) throw new Error("Erro mobile: "  + await mR.text());
      const [dBuf, mBuf] = await Promise.all([dR.arrayBuffer(), mR.arrayBuffer()]);
      desktop = Buffer.from(dBuf).toString("base64");
      mobile  = Buffer.from(mBuf).toString("base64");
    }

    const html = buildHTML(desktop, mobile, affLink, url, lang || "en", model || "cookie", desconto || "50");
    return res.status(200).json({ html, desktopB64: desktop, mobileB64: mobile });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// ── TRANSLATIONS ──
const LANGS = {
  en: {
    cookie:    { title: "Cookie Policy", body: 'This site uses cookies to customize content and ads, provide social media resources and analyze our traffic. By clicking \u201cAllow\u201d, you agree to the use of cookies. For more information, visit our Cookie Policy.', allow: "Allow", close: "Close", privacy: "Your privacy is important to us" },
    recaptcha: { title: "Security Check", body: "Please confirm you are not a robot to continue to the page.", verify: "I'm not a robot", privacy: "Privacy", terms: "Terms" },
    desconto:  {  hoje: "Today Only", badge: "Up to", off: "OFF", social: "8 out of 10 people prefer our product", cta: "Buy on the Official Website" },
   
  },
  pt: {
    cookie:    { title: "Política de Cookies", body: 'Este site utiliza cookies para personalizar conteúdo e anúncios, fornecer recursos de mídia social e analisar nosso tráfego. Ao clicar em \u201cPermitir\u201d, você concorda com o uso de cookies. Para mais informações, acesse nossa Política de Cookies.', allow: "Permitir", close: "Fechar", privacy: "Sua privacidade é importante para nós" },
    recaptcha: { title: "Verificação de Segurança", body: "Por favor, confirme que você não é um robô para continuar.", verify: "Não sou um robô", privacy: "Privacidade", terms: "Termos" },
    desconto:  { hoje: "Somente Hoje", badge: "Até", off: "OFF", social: "8 em cada 10 pessoas preferem nosso produto", cta: "Comprar no Site Oficial" },
  },
  es: {
    cookie:    { title: "Política de Cookies", body: 'Este sitio utiliza cookies para personalizar el contenido y los anuncios, proporcionar funciones de redes sociales y analizar nuestro tráfico. Al hacer clic en \u201cAceptar\u201d, acepta el uso de cookies.', allow: "Aceptar", close: "Cerrar", privacy: "Tu privacidad es importante para nosotros" },
    recaptcha: { title: "Verificación de Seguridad", body: "Por favor, confirma que no eres un robot para continuar.", verify: "No soy un robot", privacy: "Privacidad", terms: "Términos" },
    desconto:  {  hoje: "Solo Hoy", badge: "Hasta", off: "OFF", social: "8 de cada 10 personas prefieren nuestro producto", cta: "Comprar en el Sitio Oficial" },
  },
  fr: {
    cookie:    { title: "Politique de Cookies", body: "Ce site utilise des cookies pour personnaliser le contenu et les publicités, fournir des fonctionnalités de réseaux sociaux et analyser notre trafic. En cliquant sur \u201cAutoriser\u201d, vous acceptez l\u2019utilisation des cookies.", allow: "Autoriser", close: "Fermer", privacy: "Votre vie privée est importante pour nous" },
    recaptcha: { title: "Vérification de Sécurité", body: "Veuillez confirmer que vous n'êtes pas un robot pour continuer.", verify: "Je ne suis pas un robot", privacy: "Confidentialité", terms: "Conditions" },
    desconto:  { hoje: "Aujourd'hui Seulement", badge: "Jusqu'à", off: "OFF", social: "8 personnes sur 10 préfèrent notre produit", cta: "Acheter sur le Site Officiel" },
  },
  it: {
    cookie:    { title: "Politica sui Cookie", body: "Questo sito utilizza cookie per personalizzare contenuti e annunci, fornire funzionalità di social media e analizzare il nostro traffico. Cliccando su \u201cConsenti\u201d, accetti l\u2019uso dei cookie.", allow: "Consenti", close: "Chiudi", privacy: "La tua privacy è importante per noi" },
    recaptcha: { title: "Verifica di Sicurezza", body: "Per favore, conferma di non essere un robot per continuare.", verify: "Non sono un robot", privacy: "Privacy", terms: "Termini" },
    desconto:  { hoje: "Solo Oggi", badge: "Fino al", off: "OFF", social: "8 persone su 10 preferiscono il nostro prodotto", cta: "Acquista sul Sito Ufficiale" },
  },
  de: {
    cookie:    { title: "Cookie-Richtlinie", body: "Diese Website verwendet Cookies, um Inhalte und Anzeigen zu personalisieren, Social-Media-Funktionen bereitzustellen und unseren Datenverkehr zu analysieren. Indem Sie auf \u201eZulassen\u201c klicken, stimmen Sie der Verwendung von Cookies zu.", allow: "Zulassen", close: "Schließen", privacy: "Ihre Privatsphäre ist uns wichtig" },
    recaptcha: { title: "Sicherheitsüberprüfung", body: "Bitte bestätigen Sie, dass Sie kein Roboter sind, um fortzufahren.", verify: "Ich bin kein Roboter", privacy: "Datenschutz", terms: "Nutzungsbedingungen" },
    desconto:  { hoje: "Nur Heute", badge: "Bis zu", off: "RABATT", social: "8 von 10 Personen bevorzugen unser Produkt", cta: "Auf der offiziellen Website kaufen" },
  },
  pl: {
    cookie:    { title: "Polityka Cookies", body: "Ta strona używa plików cookie do personalizacji treści i reklam, udostępniania funkcji mediów społecznościowych i analizowania ruchu. Klikając \u201eZezwól\u201c, zgadzasz się na używanie plików cookie.", allow: "Zezwól", close: "Zamknij", privacy: "Twoja prywatność jest dla nas ważna" },
    recaptcha: { title: "Weryfikacja Bezpieczeństwa", body: "Proszę potwierdzić, że nie jesteś robotem, aby kontynuować.", verify: "Nie jestem robotem", privacy: "Prywatność", terms: "Warunki" },
    desconto:  { hoje: "Tylko Dziś", badge: "Do", off: "ZNIŻKI", social: "8 na 10 osób preferuje nasz produkt", cta: "Kup na Oficjalnej Stronie" },
  },
  ro: {
    cookie:    { title: "Politica de Cookies", body: "Acest site folosește cookie-uri pentru a personaliza conținutul și anunțurile, pentru a oferi funcții de rețele sociale și pentru a analiza traficul nostru. Făcând clic pe \u201ePermite\u201c, ești de acord cu utilizarea cookie-urilor.", allow: "Permite", close: "Închide", privacy: "Confidențialitatea dvs. este importantă pentru noi" },
    recaptcha: { title: "Verificare de Securitate", body: "Vă rugăm să confirmați că nu sunteți un robot pentru a continua.", verify: "Nu sunt un robot", privacy: "Confidențialitate", terms: "Termeni" },
    desconto:  { hoje: "Doar Azi", badge: "Până la", off: "REDUCERE", social: "8 din 10 persoane preferă produsul nostru", cta: "Cumpără pe Site-ul Oficial" },
  },
  hu: {
    cookie:    { title: "Cookie-szabályzat", body: "Ez a webhely cookie-kat használ a tartalom és a hirdetések személyre szabásához, közösségi média funkciók biztosításához és forgalmunk elemzéséhez. Az \u201eEngedélyezés\u201c gombra kattintva hozzájárul a cookie-k használatához.", allow: "Engedélyezés", close: "Bezárás", privacy: "Az Ön adatvédelme fontos számunkra" },
    recaptcha: { title: "Biztonsági Ellenőrzés", body: "Kérjük, erősítse meg, hogy nem robot, hogy folytathasson.", verify: "Nem vagyok robot", privacy: "Adatvédelem", terms: "Feltételek" },
    desconto:  { hoje: "Csak Ma", badge: "Akár", off: "KEDVEZMÉNY", social: "10-ből 8 ember preferálja termékünket", cta: "Vásárolj a Hivatalos Weboldalon" },
  },
};

function sharedCSS(desktopB64, mobileB64) {
  return `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100vw; height: 100vh; overflow: hidden; font-family: sans-serif; background: #000; }
  .page-bg {
    position: fixed; inset: 0;
    background-size: 100% auto; background-position: top center; background-repeat: no-repeat;
    filter: brightness(0.72); pointer-events: none; user-select: none;
    background-image: url('data:image/jpeg;base64,${desktopB64}');
  }
  @media (max-width: 768px) { .page-bg { background-image: url('data:image/jpeg;base64,${mobileB64}'); } }
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.38); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes popIn  { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }`;
}

// ── COOKIE popup ──
function popupCookie(t, safeLink) {
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Merriweather:wght@700&display=swap');
    .popup { background:#fff; border-radius:16px; width:min(480px,100%); padding:clamp(28px,7vw,44px) clamp(24px,6vw,44px) clamp(20px,5vw,32px); box-shadow:0 20px 60px rgba(0,0,0,0.35),0 4px 16px rgba(0,0,0,0.15); text-align:center; animation:popIn 0.4s cubic-bezier(0.34,1.4,0.64,1) both; position:relative; overflow:hidden; font-family:'Inter',sans-serif; }
    .popup::before { content:''; position:absolute; top:0; left:0; right:0; height:5px; background:linear-gradient(90deg,#6c3fc5,#a855f7,#ec4899,#f97316,#eab308); }
    .popup h2 { font-family:'Merriweather',serif; font-size:clamp(20px,5vw,26px); color:#1a1a1a; font-weight:700; margin-bottom:14px; margin-top:10px; }
    .popup p { font-size:clamp(13px,3vw,14.5px); color:#555; line-height:1.65; margin-bottom:26px; max-width:380px; margin-left:auto; margin-right:auto; }
    .btn-group { display:flex; gap:12px; justify-content:center; margin-bottom:22px; flex-wrap:wrap; }
    .btn { padding:13px 0; width:150px; border-radius:10px; font-family:'Inter',sans-serif; font-size:15px; font-weight:600; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; transition:transform 0.15s; border:none; }
    .btn:hover { transform:translateY(-2px); }
    .btn-allow { background:#2e7d62; color:#fff; box-shadow:0 4px 16px rgba(46,125,98,0.3); }
    .btn-allow:hover { background:#245f4a; }
    .btn-close { background:#fff; color:#333; border:1.5px solid #ccc; }
    .btn-close:hover { background:#f0f0f0; }
    .divider { border:none; border-top:1px solid #ebebeb; margin:0 -44px 16px; }
    footer { font-size:12px; color:#aaa; }
    @media(max-width:400px){ .btn{width:130px;font-size:14px;} .divider{margin:0 -24px 16px;} }
  </style>
  <div class="popup" role="dialog">
    <h2>${t.title}</h2><p>${t.body}</p>
    <div class="btn-group">
      <a href="${safeLink}" class="btn btn-allow">${t.allow}</a>
      <a href="${safeLink}" class="btn btn-close">${t.close}</a>
    </div>
    <hr class="divider"><footer>${t.privacy}</footer>
  </div>`;
}

// ── RECAPTCHA popup ──
function popupRecaptcha(t, safeLink) {
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap');
    .popup { background:#fff; border-radius:4px; width:min(310px,96vw); box-shadow:0 2px 8px rgba(0,0,0,0.25),0 8px 32px rgba(0,0,0,0.15); animation:popIn 0.35s cubic-bezier(0.34,1.4,0.64,1) both; overflow:hidden; font-family:'Roboto',sans-serif; }
    .rc-header { background:#4a90d9; padding:14px 16px; display:flex; align-items:center; gap:10px; }
    .rc-header h2 { font-size:14px; font-weight:500; color:#fff; }
    .rc-body { padding:20px 16px 16px; }
    .rc-body p { font-size:13px; color:#444; line-height:1.55; margin-bottom:18px; text-align:center; }
    .rc-row { display:flex; align-items:center; gap:14px; background:#f9f9f9; border:1px solid #d3d3d3; border-radius:4px; padding:14px 16px; margin-bottom:16px; cursor:pointer; text-decoration:none; transition:background 0.15s; }
    .rc-row:hover { background:#f0f4ff; border-color:#4a90d9; }
    .rc-box { width:26px; height:26px; border:2px solid #c1c1c1; border-radius:3px; background:#fff; flex-shrink:0; }
    .rc-label { font-size:14px; color:#222; }
    .rc-foot { display:flex; align-items:center; justify-content:space-between; padding:0 4px; }
    .rc-brand { display:flex; flex-direction:column; align-items:center; gap:2px; }
    .rc-brand-icon { font-size:22px; line-height:1; }
    .rc-brand-text { font-size:9px; color:#9aa0a6; font-weight:500; letter-spacing:0.3px; }
    .rc-links { display:flex; gap:10px; }
    .rc-links a { font-size:10px; color:#9aa0a6; text-decoration:none; }
    .rc-links a:hover { text-decoration:underline; }
  </style>
  <div class="popup" role="dialog">
    <div class="rc-header"><div style="font-size:20px">🔒</div><h2>${t.title}</h2></div>
    <div class="rc-body">
      <p>${t.body}</p>
      <a href="${safeLink}" class="rc-row"><div class="rc-box"></div><span class="rc-label">${t.verify}</span></a>
      <div class="rc-foot">
        <div class="rc-brand"><div class="rc-brand-icon">🛡️</div><div class="rc-brand-text">reCAPTCHA</div></div>
        <div class="rc-links"><a href="${safeLink}">${t.privacy}</a><a href="${safeLink}">${t.terms}</a></div>
      </div>
    </div>
  </div>`;
}

// ── DESCONTO popup (estilo Revitag) ──
function popupDesconto(t, safeLink, pct) {
  const starFull = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"/></svg>`;
  const starHalf = `<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hg"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#e5e7eb"/></linearGradient></defs><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" fill="url(#hg)"/></svg>`;
  const starsHTML = starFull.repeat(4) + starHalf;
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    .popup { background:#fff; border-radius:20px; width:min(340px,96vw); box-shadow:0 24px 64px rgba(0,0,0,0.18),0 4px 16px rgba(0,0,0,0.08); text-align:center; animation:popIn 0.4s cubic-bezier(0.34,1.4,0.64,1) both; font-family:Inter,sans-serif; padding:36px 32px 32px; }
    .disc-pill { display:inline-block; background:#f0fdf4; border:1.5px solid #bbf7d0; color:#16a34a; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; padding:5px 16px; border-radius:40px; margin-bottom:16px; }
    .disc-title { font-size:clamp(26px,9vw,40px); font-weight:800; color:#111; line-height:1.1; margin-bottom:6px; letter-spacing:-0.5px; }
    .disc-title em { color:#16a34a; font-style:normal; }
    .disc-social { font-size:12.5px; color:#9ca3af; margin-bottom:20px; line-height:1.4; }
    .disc-rating { font-size:clamp(36px,11vw,52px); font-weight:800; color:#111; line-height:1; margin-bottom:6px; letter-spacing:-1px; }
    .disc-stars { display:flex; align-items:center; justify-content:center; gap:3px; margin-bottom:24px; }
    .disc-divider { border:none; border-top:1px solid #f3f4f6; margin:0 -32px 24px; }
    .disc-cta { display:block; background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; font-size:15px; font-weight:700; padding:16px 24px; border-radius:50px; text-decoration:none; box-shadow:0 6px 24px rgba(34,197,94,0.35); transition:transform 0.15s,box-shadow 0.15s; }
    .disc-cta:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(34,197,94,0.45); }
  </style>
  <div class="popup" role="dialog">
    <div class="disc-pill">${t.hoje}</div>
    <div class="disc-title">${t.badge} <em>${pct}%</em> ${t.off}</div>
    <div class="disc-social">${t.social}</div>
    <div class="disc-rating">9.3</div>
    <div class="disc-stars">${starsHTML}</div>
    <hr class="disc-divider">
    <a href="${safeLink}" class="disc-cta">${t.cta}</a>
  </div>`;
}

function buildHTML(desktopB64, mobileB64, affLink, originalUrl, lang, model, desconto) {
  const safeLink = affLink.replace(/"/g, "&quot;");
  const domain = (() => { try { return new URL(originalUrl).hostname; } catch { return originalUrl; } })();
  const t = (LANGS[lang] || LANGS.en)[model] || (LANGS[lang] || LANGS.en).cookie;
  const popup =
    model === 'recaptcha' ? popupRecaptcha(t, safeLink) :
    model === 'desconto'  ? popupDesconto(t, safeLink, desconto) :
    popupCookie(t, safeLink);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${domain}</title><style>${sharedCSS(desktopB64, mobileB64)}</style></head><body><div class="page-bg" aria-hidden="true"></div><div class="overlay">${popup}</div></body></html>`;
}
