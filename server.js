import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || '';

const ROOT = path.resolve();
const PUBLIC_DIR = path.join(ROOT, 'public');
const GIFT_DIR = path.join(PUBLIC_DIR, 'gift');

fs.mkdirSync(GIFT_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

function esc(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function validSlug(slug) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); }
function normalizeSlug(input) {
  return String(input || '').trim().toLowerCase()
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
function resolveUniqueSlug(base) {
  let candidate = base, i = 2;
  while (fs.existsSync(path.join(GIFT_DIR, candidate))) { candidate = `${base}-${i}`; i++; }
  return candidate;
}
function asBool(v) {
  if (typeof v === 'boolean') return v;
  const s = String(v || '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}
function toArray(v) { if (!v) return []; return Array.isArray(v) ? v : [v]; }
function onlyHttpLinks(items) {
  return toArray(items).map((x) => String(x || '').trim()).filter((x) => /^https?:\/\//i.test(x));
}
function ytEmbed(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/) ||
            url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  return m?.[1] ? `https://www.youtube.com/embed/${m[1]}` : '';
}
function spotifyEmbed(url) {
  const m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : '';
}

// ── GIRLFRIEND ──────────────────────────────────────────────────────────────
function renderGirlfriend(data) {
  const reasons = data.reasons.map((r) => `
    <div style="background:rgba(255,255,255,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.3);border-radius:1rem;padding:1.5rem 2rem;box-shadow:0 4px 20px rgba(0,0,0,0.06);display:flex;gap:1rem;align-items:flex-start;transition:transform 0.3s">
      <span style="font-size:1.8rem;color:#ec4899;flex-shrink:0">♥</span>
      <p style="font-size:1.1rem;color:#374151;margin:0;line-height:1.7">${esc(r)}</p>
    </div>`).join('');

  const galleryImgs = data.photos.map((p, i) => {
    const tall = (i === 1 || i === 4) ? 'grid-row:span 2' : '';
    const ratio = (i === 1 || i === 4) ? 'aspect-ratio:4/5' : 'aspect-ratio:1';
    return `<a href="${esc(p)}" target="_blank" rel="noopener" style="display:block;${ratio};${tall};border-radius:1rem;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);transition:transform 0.3s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
      <img src="${esc(p)}" alt="photo ${i+1}" style="width:100%;height:100%;object-fit:cover">
    </a>`;
  }).join('');

  let videoSection = '', musicSection = '';
  if (data.video) {
    const yt = ytEmbed(data.video);
    const content = yt
      ? `<div style="aspect-ratio:16/9;border-radius:1rem;overflow:hidden"><iframe width="100%" height="100%" src="${yt}" frameborder="0" allowfullscreen></iframe></div>`
      : `<video controls style="width:100%;border-radius:1rem" src="${esc(data.video)}"></video>`;
    videoSection = `<section style="padding:4rem 1.5rem;max-width:800px;margin:0 auto">
      <div style="text-align:center;margin-bottom:2rem"><span style="font-size:3rem">🎬</span>
        <h3 style="font-family:'Playfair Display',serif;font-size:2.5rem;background:linear-gradient(135deg,#ec407a,#f48fb1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:.5rem 0">ჩვენი ვიდეო</h3>
      </div>
      <div style="background:rgba(255,255,255,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.3);border-radius:1.5rem;padding:1.5rem;box-shadow:0 8px 32px rgba(0,0,0,0.08)">${content}</div>
    </section>`;
  }
  if (data.music_link) {
    const yt = ytEmbed(data.music_link), sp = spotifyEmbed(data.music_link);
    let player = yt
      ? `<div style="aspect-ratio:16/9;max-width:480px;margin:0 auto;border-radius:1rem;overflow:hidden"><iframe width="100%" height="100%" src="${yt}" frameborder="0" allowfullscreen></iframe></div>`
      : sp ? `<iframe style="border-radius:12px" src="${sp}" width="100%" height="152" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe>`
      : `<a href="${esc(data.music_link)}" target="_blank" style="display:inline-block;padding:.8rem 2rem;border-radius:50px;background:#ec4899;color:white;text-decoration:none;font-weight:600">🎵 სიმღერის მოსმენა</a>`;
    musicSection = `<section style="padding:4rem 1.5rem;background:#fdf2f8;text-align:center">
      <div style="margin-bottom:2rem"><span style="font-size:3rem">🎵</span>
        <h3 style="font-family:'Playfair Display',serif;font-size:2.5rem;background:linear-gradient(135deg,#ec407a,#f48fb1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:.5rem 0">ჩვენი სიმღერა</h3>
      </div>
      <div style="max-width:600px;margin:0 auto">${player}</div>
    </section>`;
  }

  return `<!doctype html><html lang="ka"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.hero_title || '8 მარტს გილოცავ')}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%A9%3C/text%3E%3C/svg%3E">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans Georgian',sans-serif;background:#fdf2f8;color:#1f2937;overflow-x:hidden}
@keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-20px) rotate(5deg)}}
@keyframes pulse-soft{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
@keyframes fade-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes hb{0%,100%{transform:scale(1)}25%,75%{transform:scale(1.12)}}
.float{animation:float 6s ease-in-out infinite}
.float2{animation:float 6s ease-in-out 2s infinite}
.ps{animation:pulse-soft 3s ease-in-out infinite}
.fu{animation:fade-up 1s ease-out forwards}
.hb{animation:hb 1.5s ease-in-out infinite}
.grad{background:linear-gradient(135deg,#ec407a,#f06292,#f48fb1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.glass{background:rgba(255,255,255,0.25);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.3)}
</style></head><body>

<div style="position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0">
  <div class="float" style="position:absolute;top:5%;left:5%;font-size:2.5rem;color:#f9a8d4;opacity:.3">♥</div>
  <div class="float2" style="position:absolute;top:15%;right:8%;font-size:2rem;color:#f9a8d4;opacity:.25">♥</div>
  <div class="float" style="position:absolute;top:40%;left:3%;font-size:1.5rem;color:#fce7f3;opacity:.2;animation-delay:1s">♥</div>
  <div class="float2" style="position:absolute;bottom:20%;right:5%;font-size:3rem;color:#fce7f3;opacity:.2">♥</div>
  <div class="float" style="position:absolute;bottom:8%;left:8%;font-size:2rem;color:#f9a8d4;opacity:.25;animation-delay:3s">♥</div>
</div>

<!-- Hero -->
<section style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:4rem 1.5rem;overflow:hidden;text-align:center">
  <div style="position:absolute;inset:0;background:linear-gradient(135deg,#fce7f3,#fdf2f8,#fbcfe8)"></div>
  <div style="position:relative;z-index:1;max-width:900px">
    <div class="fu hb" style="font-size:4rem;margin-bottom:1.5rem;animation-delay:.2s;opacity:0">💕</div>
    <p class="fu" style="color:#f472b6;font-size:1rem;letter-spacing:.4em;text-transform:uppercase;margin-bottom:1rem;animation-delay:.4s;opacity:0">8 მარტი</p>
    <h1 class="grad fu" style="font-family:'Playfair Display',serif;font-size:clamp(3rem,8vw,6rem);font-weight:700;line-height:1.15;margin-bottom:1rem;animation-delay:.6s;opacity:0">${esc(data.hero_title || 'ჩემო სიყვარულო')}</h1>
    <h2 class="fu" style="font-family:'Playfair Display',serif;font-size:clamp(2rem,5vw,3.5rem);font-style:italic;color:#be185d;margin-bottom:1.5rem;animation-delay:.8s;opacity:0">${esc(data.recipient_name)}</h2>
    <p class="fu" style="font-size:1.2rem;color:#db2777;opacity:0;animation-delay:1s">${esc(data.hero_subtitle)}</p>
    <div class="fu" style="margin-top:3rem;animation-delay:1.2s;opacity:0">
      <a href="#message" style="display:inline-flex;align-items:center;gap:.5rem;padding:1rem 2.5rem;border-radius:50px;background:#ec4899;color:white;text-decoration:none;font-size:1rem;font-weight:600;transition:transform .3s,box-shadow .3s" onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 20px 40px rgba(236,72,153,.4)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">გაგრძელება ↓</a>
    </div>
  </div>
</section>

<!-- Love Message -->
<section id="message" style="padding:5rem 1.5rem;background:linear-gradient(to bottom,rgba(252,231,243,.3),white)">
  <div style="max-width:800px;margin:0 auto;text-align:center">
    <span class="ps" style="font-size:3.5rem;display:block;margin-bottom:1.5rem">💌</span>
    <h3 class="grad" style="font-family:'Playfair Display',serif;font-size:2.5rem;margin-bottom:2rem">სიყვარულის წერილი</h3>
    <div class="glass" style="border-radius:1.5rem;padding:2.5rem 3rem;box-shadow:0 8px 32px rgba(0,0,0,.06)">
      <p style="font-size:1.15rem;line-height:1.9;color:#374151;font-style:italic">${esc(data.love_message)}</p>
      <div style="margin-top:1.5rem;color:#f472b6;font-size:1.2rem;letter-spacing:.5rem">♥ ♥ ♥</div>
    </div>
  </div>
</section>

${data.story_or_memory ? `
<!-- Story -->
<section style="padding:5rem 1.5rem;background:#fdf2f8">
  <div style="max-width:800px;margin:0 auto">
    <div style="text-align:center;margin-bottom:2rem"><span style="font-size:3rem">💑</span>
      <h3 class="grad" style="font-family:'Playfair Display',serif;font-size:2.5rem;margin-top:.5rem">ჩვენი ისტორია</h3>
    </div>
    <div class="glass" style="border-radius:1.5rem;padding:2.5rem;box-shadow:0 8px 32px rgba(0,0,0,.06)">
      <p style="font-size:1.1rem;line-height:1.9;color:#374151">${esc(data.story_or_memory)}</p>
    </div>
  </div>
</section>` : ''}

${data.photos.length ? `
<!-- Gallery -->
<section style="padding:5rem 1.5rem;background:linear-gradient(to bottom,rgba(251,207,232,.2),white)">
  <div style="max-width:1100px;margin:0 auto">
    <div style="text-align:center;margin-bottom:2.5rem"><span style="font-size:3rem">📸</span>
      <h3 class="grad" style="font-family:'Playfair Display',serif;font-size:2.5rem;margin-top:.5rem">ჩვენი მომენტები</h3>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem">${galleryImgs}</div>
  </div>
</section>` : ''}

${data.reasons.length ? `
<!-- Reasons -->
<section style="padding:5rem 1.5rem;background:#fdf2f8">
  <div style="max-width:800px;margin:0 auto">
    <div style="text-align:center;margin-bottom:2.5rem"><span class="hb" style="font-size:3rem;display:block">❤️</span>
      <h3 class="grad" style="font-family:'Playfair Display',serif;font-size:2.5rem;margin-top:.5rem">რატომ მიყვარხარ</h3>
    </div>
    <div style="display:grid;gap:1rem">${reasons}</div>
  </div>
</section>` : ''}

${videoSection}
${musicSection}

${data.date_invite_text ? `
<!-- Date -->
<section style="padding:5rem 1.5rem;background:linear-gradient(to bottom,white,rgba(252,231,243,.3))">
  <div style="max-width:700px;margin:0 auto;text-align:center">
    <span style="font-size:3rem;display:block;margin-bottom:1rem">✨</span>
    <h3 class="grad" style="font-family:'Playfair Display',serif;font-size:2.5rem;margin-bottom:2rem">პაემანზე მოწვევა</h3>
    <div class="glass" style="border-radius:1.5rem;padding:2.5rem;box-shadow:0 8px 32px rgba(0,0,0,.06)">
      <p style="font-size:1.1rem;line-height:1.9;color:#374151">${esc(data.date_invite_text)}</p>
    </div>
  </div>
</section>` : ''}

<!-- Final -->
<section style="position:relative;padding:5rem 1.5rem;overflow:hidden;background:linear-gradient(135deg,#f43f5e,#ec4899,#a855f7);text-align:center">
  <div class="float" style="position:absolute;top:8%;left:8%;font-size:4rem;opacity:.2">✨</div>
  <div class="float2" style="position:absolute;top:15%;right:10%;font-size:3rem;opacity:.2">💫</div>
  <div class="float" style="position:absolute;bottom:15%;left:10%;font-size:2.5rem;opacity:.2;animation-delay:1s">🌸</div>
  <div class="float2" style="position:absolute;bottom:8%;right:8%;font-size:4rem;opacity:.2;animation-delay:2s">💕</div>
  <div style="position:relative;z-index:1;max-width:700px;margin:0 auto">
    <div class="glass" style="border-radius:2rem;padding:3rem 2rem 4rem;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div class="hb" style="font-size:4.5rem;margin-bottom:1.5rem">💝</div>
      <h3 style="font-family:'Playfair Display',serif;font-size:clamp(2rem,5vw,3.5rem);color:white;margin-bottom:1.5rem;text-shadow:0 2px 4px rgba(0,0,0,.2)">გილოცავ 8 მარტს!</h3>
      <p style="font-size:1.15rem;color:rgba(255,255,255,.9);line-height:1.8;margin-bottom:2rem">${esc(data.final_message)}</p>
      <p style="color:rgba(255,255,255,.75);margin-bottom:.5rem">უსაზღვრო სიყვარულით,</p>
      <p style="font-family:'Playfair Display',serif;font-size:2rem;font-style:italic;color:white;font-weight:600">${esc(data.sender_name)}</p>
      <div class="ps" style="margin-top:2rem;font-size:2rem;letter-spacing:1rem">💕💕💕</div>
    </div>
  </div>
</section>

<footer style="background:#1f1f2e;color:#9ca3af;text-align:center;padding:1.5rem;font-size:.85rem">
  შექმნილია სიყვარულით 💕 8 მარტი
</footer>
</body></html>`;
}

// ── WIFE ───────────────────────────────────────────────────────────────────
function renderWife(data) {
  const reasons = data.reasons.map((r) => `
    <div style="border-radius:1rem;padding:1.5rem 2rem;box-shadow:0 4px 16px rgba(180,83,9,.1);border:1px solid rgba(180,83,9,.2);background:rgba(255,255,255,.92);display:flex;gap:1rem;align-items:flex-start">
      <span style="font-size:1.5rem;color:#b45309;flex-shrink:0">✦</span>
      <p style="font-size:1.1rem;color:#1c1917;margin:0;line-height:1.7">${esc(r)}</p>
    </div>`).join('');

  const galleryImgs = data.photos.map((p, i) => {
    const ratio = (i % 3 === 1) ? 'aspect-ratio:3/4' : 'aspect-ratio:1';
    return `<a href="${esc(p)}" target="_blank" rel="noopener" style="display:block;${ratio};border-radius:1rem;overflow:hidden;box-shadow:0 4px 16px rgba(180,83,9,.15);transition:transform .3s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
      <img src="${esc(p)}" alt="" style="width:100%;height:100%;object-fit:cover">
    </a>`;
  }).join('');

  let videoSection = '', musicSection = '';
  if (data.video) {
    const yt = ytEmbed(data.video);
    const content = yt
      ? `<div style="aspect-ratio:16/9;border-radius:1rem;overflow:hidden"><iframe width="100%" height="100%" src="${yt}" frameborder="0" allowfullscreen></iframe></div>`
      : `<video controls style="width:100%;border-radius:1rem" src="${esc(data.video)}"></video>`;
    videoSection = `<section style="padding:4rem 1.5rem;background:white">
      <div style="max-width:800px;margin:0 auto">
        <div style="text-align:center;margin-bottom:2rem"><span style="font-size:3rem">🎬</span>
          <h3 style="font-family:'Noto Serif Georgian',serif;font-size:2rem;color:#b45309;margin-top:.5rem">ჩვენი ვიდეო</h3>
          <div style="width:80px;height:2px;background:linear-gradient(90deg,transparent,#b45309,transparent);margin:.75rem auto"></div>
        </div>
        <div style="border-radius:1.5rem;padding:1.5rem;background:rgba(255,255,255,.92);box-shadow:0 8px 32px rgba(180,83,9,.1);border:1px solid rgba(180,83,9,.15)">${content}</div>
      </div>
    </section>`;
  }
  if (data.music_link) {
    const yt = ytEmbed(data.music_link), sp = spotifyEmbed(data.music_link);
    let player = yt
      ? `<div style="aspect-ratio:16/9;max-width:480px;margin:0 auto;border-radius:1rem;overflow:hidden"><iframe width="100%" height="100%" src="${yt}" frameborder="0" allowfullscreen></iframe></div>`
      : sp ? `<iframe style="border-radius:12px" src="${sp}" width="100%" height="152" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe>`
      : `<a href="${esc(data.music_link)}" target="_blank" style="display:inline-block;padding:.8rem 2rem;border-radius:50px;background:#b45309;color:white;text-decoration:none;font-weight:600">🎵 სიმღერის მოსმენა</a>`;
    musicSection = `<section style="padding:4rem 1.5rem;background:#fefce8;text-align:center">
      <div style="margin-bottom:2rem"><span style="font-size:3rem">🎵</span>
        <h3 style="font-family:'Noto Serif Georgian',serif;font-size:2rem;color:#b45309;margin-top:.5rem">ჩვენი სიმღერა</h3>
        <div style="width:80px;height:2px;background:linear-gradient(90deg,transparent,#b45309,transparent);margin:.75rem auto"></div>
      </div>
      <div style="max-width:600px;margin:0 auto">${player}</div>
    </section>`;
  }

  return `<!doctype html><html lang="ka"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.hero_title || 'გილოცავ 8 მარტს')}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%A9%3C/text%3E%3C/svg%3E">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Georgian:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Serif Georgian','Georgia',serif;background:#fefce8;color:#1c1917;overflow-x:hidden;line-height:1.7}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.float{animation:float 5s ease-in-out infinite}
.fu{animation:fade-up 1s ease-out forwards}
.gold-line{width:80px;height:2px;background:linear-gradient(90deg,transparent,#b45309,transparent);margin:.75rem auto}
</style></head><body>

<!-- Hero -->
<section style="background:linear-gradient(135deg,#fef3c7,white,#fde68a);min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:4rem 1.5rem">
  <div class="float">
    <span style="font-size:3.5rem;display:block;margin-bottom:1.5rem">👑</span>
    <p style="color:#b45309;font-size:.85rem;letter-spacing:.4em;text-transform:uppercase;margin-bottom:1rem">8 მარტი</p>
    <h1 style="font-size:clamp(2.5rem,7vw,5rem);font-weight:700;color:#1c1917;margin-bottom:.75rem;line-height:1.2">${esc(data.hero_title || 'გილოცავ 8 მარტს')}</h1>
    <div class="gold-line"></div>
    <h2 style="font-size:clamp(1.5rem,4vw,2.5rem);font-style:italic;font-weight:400;color:#b45309;margin-top:1rem">${esc(data.recipient_name)}</h2>
    <p style="font-size:1.1rem;color:#78716c;margin-top:.75rem;font-style:italic">${esc(data.hero_subtitle)}</p>
    <a href="#letter" style="display:inline-block;margin-top:2.5rem;padding:.9rem 2.5rem;border-radius:50px;background:#b45309;color:white;text-decoration:none;font-size:1rem;font-weight:500">გაგრძელება ↓</a>
  </div>
</section>

<!-- Letter -->
<section id="letter" style="padding:5rem 1.5rem;background:white">
  <div style="max-width:800px;margin:0 auto;text-align:center">
    <span style="font-size:3rem;display:block;margin-bottom:1rem">💌</span>
    <h2 style="font-size:2rem;color:#b45309;margin-bottom:.75rem">სიყვარულის წერილი</h2>
    <div class="gold-line"></div>
    <div style="background:rgba(255,255,255,.92);border-radius:1.5rem;padding:2.5rem 3rem;box-shadow:0 8px 32px rgba(180,83,9,.1);border:1px solid rgba(180,83,9,.15);margin-top:2rem;text-align:left">
      <p style="font-size:1.1rem;line-height:1.9;font-style:italic;color:#3d3427">${esc(data.love_message)}</p>
    </div>
  </div>
</section>

${data.story_or_memory ? `
<section style="padding:5rem 1.5rem;background:#fefce8">
  <div style="max-width:800px;margin:0 auto;text-align:center">
    <span style="font-size:3rem;display:block;margin-bottom:1rem">💛</span>
    <h2 style="font-size:2rem;color:#b45309;margin-bottom:.75rem">ჩვენი ისტორია</h2>
    <div class="gold-line"></div>
    <div style="background:rgba(255,255,255,.92);border-radius:1.5rem;padding:2.5rem;box-shadow:0 8px 32px rgba(180,83,9,.1);border:1px solid rgba(180,83,9,.15);margin-top:2rem;text-align:left">
      <p style="font-size:1.1rem;line-height:1.9;color:#3d3427">${esc(data.story_or_memory)}</p>
    </div>
  </div>
</section>` : ''}

${data.photos.length ? `
<section style="padding:5rem 1.5rem;background:white">
  <div style="max-width:1000px;margin:0 auto;text-align:center">
    <span style="font-size:3rem;display:block;margin-bottom:1rem">📸</span>
    <h2 style="font-size:2rem;color:#b45309;margin-bottom:.75rem">ჩვენი მომენტები</h2>
    <div class="gold-line"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-top:2rem">${galleryImgs}</div>
  </div>
</section>` : ''}

${data.reasons.length ? `
<section style="padding:5rem 1.5rem;background:#fefce8">
  <div style="max-width:750px;margin:0 auto;text-align:center">
    <span style="font-size:3rem;display:block;margin-bottom:1rem">✨</span>
    <h2 style="font-size:2rem;color:#b45309;margin-bottom:.75rem">რატომ ხარ ჩემი ყველაფერი</h2>
    <div class="gold-line"></div>
    <div style="display:grid;gap:1rem;margin-top:2rem;text-align:left">${reasons}</div>
  </div>
</section>` : ''}

${videoSection}
${musicSection}

${data.date_invite_text ? `
<section style="padding:5rem 1.5rem;background:white;text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <span style="font-size:3rem;display:block;margin-bottom:1rem">🌹</span>
    <h2 style="font-size:2rem;color:#b45309;margin-bottom:.75rem">პაემანი</h2>
    <div class="gold-line"></div>
    <div style="background:rgba(255,255,255,.92);border-radius:1.5rem;padding:2.5rem;box-shadow:0 8px 32px rgba(180,83,9,.1);border:1px solid rgba(180,83,9,.15);margin-top:2rem;font-style:italic;font-size:1.1rem;color:#3d3427">${esc(data.date_invite_text)}</div>
  </div>
</section>` : ''}

<!-- Final -->
<section style="background:linear-gradient(135deg,#92400e,#b45309,#d97706);min-height:50vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:5rem 1.5rem">
  <div style="max-width:650px">
    <span style="font-size:4rem;display:block;margin-bottom:1.5rem">👑</span>
    <h3 style="font-size:clamp(1.8rem,5vw,3.5rem);color:white;font-weight:700;margin-bottom:1.5rem">გილოცავ 8 მარტს!</h3>
    <p style="font-size:1.1rem;color:rgba(255,255,255,.9);line-height:1.8;margin-bottom:2rem;font-style:italic">${esc(data.final_message)}</p>
    <p style="color:rgba(255,255,255,.75);font-size:.95rem;margin-bottom:.5rem">სამუდამოდ შენი,</p>
    <p style="font-size:2rem;font-style:italic;color:white;font-weight:600">${esc(data.sender_name)}</p>
    <div style="margin-top:2rem;font-size:2rem;letter-spacing:1rem">💛💛💛</div>
  </div>
</section>

<footer style="background:#1c1917;color:#a8a29e;text-align:center;padding:1.5rem;font-size:.85rem">
  შექმნილია სიყვარულით 💛 8 მარტი
</footer>
</body></html>`;
}

// ── MAP OF STARS ─────────────────────────────────────────────────────────────
function renderStars(data) {
  const positions = ['pos-left', 'pos-right', 'pos-left', 'pos-right'];
  const memoryBlocks = data.memories.map((m, i) => `
    <div class="memory-section">
      <div class="star-trigger ${positions[i % 4]}" onclick="toggleBox(this)"></div>
      <div class="memory-box">
        <span class="cinzel" style="font-size:10px;color:#f3cc4d;display:block;margin-bottom:6px">${esc(m.location || `ვარსკვლავი ${i + 1}`)}</span>
        <h3 class="serif-italic" style="font-size:1.2rem;margin:.5rem 0;color:white">${esc(m.title || '')}</h3>
        <p style="font-size:.9rem;color:#cbd5e1;font-style:italic;line-height:1.6">${esc(m.content || '')}</p>
      </div>
    </div>`).join('');

  const gallerySection = data.photos.length ? `
  <section style="padding:4rem 1.5rem;max-width:900px;margin:0 auto">
    <div style="text-align:center;margin-bottom:2rem">
      <span class="cinzel" style="font-size:1.2rem;letter-spacing:.3em;color:#f3cc4d">ჩვენი მომენტები 📸</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem">
      ${data.photos.map((p, i) => `<a href="${esc(p)}" target="_blank" rel="noopener" style="display:block;aspect-ratio:1;border-radius:10px;overflow:hidden;border:1px solid rgba(243,204,77,.3);transition:transform .3s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"><img src="${esc(p)}" alt="" style="width:100%;height:100%;object-fit:cover"></a>`).join('')}
    </div>
  </section>` : '';

  let musicSection = '';
  if (data.music_link) {
    const yt = ytEmbed(data.music_link), sp = spotifyEmbed(data.music_link);
    let player = yt
      ? `<div style="aspect-ratio:16/9;max-width:500px;margin:0 auto;border-radius:12px;overflow:hidden"><iframe width="100%" height="100%" src="${yt}" frameborder="0" allowfullscreen></iframe></div>`
      : sp ? `<iframe style="border-radius:12px" src="${sp}" width="100%" height="152" frameborder="0" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture"></iframe>`
      : `<a href="${esc(data.music_link)}" target="_blank" style="display:inline-block;padding:.8rem 2rem;border-radius:50px;background:#f3cc4d;color:#05070a;font-weight:600;text-decoration:none">🎵 სიმღერის მოსმენა</a>`;
    musicSection = `<section style="padding:3rem 1.5rem;text-align:center;max-width:700px;margin:0 auto">
      <span class="cinzel" style="font-size:1rem;letter-spacing:.3em;color:#f3cc4d;display:block;margin-bottom:2rem">ჩვენი სიმღერა 🎵</span>
      ${player}
    </section>`;
  }

  return `<!doctype html><html lang="ka"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.hero_title || 'The Map of Stars')}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%A9%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:ital,wght@1,400;1,600&family=Fira+Go:wght@300;400;700&display=swap');
:root{--gold:#f3cc4d;--bg:#05070a}
*{box-sizing:border-box;margin:0;padding:0}
body{background-color:var(--bg);color:white;font-family:'Fira Go',sans-serif;overflow-x:hidden}
.cinzel{font-family:'Cinzel',serif;letter-spacing:.3em;color:var(--gold)}
.serif-italic{font-family:'Playfair Display',serif;font-style:italic}
.stars-overlay{position:fixed;inset:0;background-image:url('https://www.transparenttextures.com/patterns/stardust.png');opacity:.4;z-index:-1}
.path-line{position:absolute;left:50%;top:0;bottom:0;width:1px;background:linear-gradient(to bottom,transparent,var(--gold) 15%,var(--gold) 85%,transparent);transform:translateX(-50%);z-index:1}
.memory-section{position:relative;height:60vh;display:flex;align-items:center;justify-content:center}
.star-trigger{width:20px;height:20px;background:var(--gold);border-radius:50%;box-shadow:0 0 20px var(--gold),0 0 40px var(--gold);cursor:pointer;z-index:10;animation:pulse 2s infinite;transition:transform .3s;position:relative}
.star-trigger:hover{transform:scale(1.5)}
.memory-box{position:absolute;width:85%;max-width:320px;background:rgba(10,14,26,.95);border:1px solid var(--gold);padding:25px;backdrop-filter:blur(15px);text-align:center;display:none;z-index:20;box-shadow:0 10px 40px rgba(0,0,0,.8)}
@keyframes pulse{0%{box-shadow:0 0 10px var(--gold)}50%{box-shadow:0 0 30px var(--gold),0 0 50px var(--gold)}100%{box-shadow:0 0 10px var(--gold)}}
@media(min-width:768px){.pos-left{left:15%}.pos-right{left:65%}}
</style></head><body>

<div class="stars-overlay"></div>

<header style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 1.5rem">
  <h1 class="cinzel animate__animated animate__fadeIn" style="font-size:clamp(1.6rem,5vw,4rem)">${esc(data.hero_title || 'The Map of Stars')}</h1>
  <div style="width:6rem;height:1px;background:rgba(243,204,77,.3);margin:1.5rem auto"></div>
  <p class="serif-italic animate__animated animate__fadeIn animate__delay-1s" style="font-size:1.1rem;color:#94a3b8;max-width:400px">${esc(data.hero_subtitle || '"City of stars, are you shining just for me?"')}</p>
  <p style="margin-top:1rem;font-size:.9rem;color:rgba(243,204,77,.7)">${esc(data.sender_name)} → ${esc(data.recipient_name)}</p>
  <div class="animate__animated animate__fadeIn animate__infinite animate__slower" style="margin-top:4rem">
    <span style="font-size:.75rem;text-transform:uppercase;letter-spacing:.32em;color:rgba(243,204,77,.6)">ჩამოსქროლე და აანთე მოგონებები</span>
  </div>
</header>

<section style="position:relative">${memoryBlocks ? `<div class="path-line"></div>${memoryBlocks}` : ''}</section>

${gallerySection}
${musicSection}

<footer style="min-height:40vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 1.5rem">
  <div class="animate__animated animate__pulse animate__infinite" style="font-size:3rem;margin-bottom:2rem">🎹</div>
  <p class="serif-italic animate__animated animate__fadeInUp" style="font-size:1.8rem;color:#f3cc4d;margin-bottom:1rem">"Here's to the fools who dream."</p>
  <p style="font-size:.85rem;text-transform:uppercase;letter-spacing:.3em;color:#94a3b8">გილოცავ 8 მარტს, ჩემო ვარსკვლავო!</p>
  <div style="width:1px;height:5rem;background:linear-gradient(to bottom,#f3cc4d,transparent);margin-top:2rem"></div>
</footer>

<script>
function toggleBox(star) {
  const allBoxes = document.querySelectorAll('.memory-box');
  allBoxes.forEach((b) => {
    if (b !== star.nextElementSibling && b.style.display === 'block') {
      b.classList.remove('animate__fadeInUp');
      b.classList.add('animate__animated', 'animate__fadeOutDown');
      setTimeout(() => { b.style.display = 'none'; b.classList.remove('animate__fadeOutDown'); }, 400);
    }
  });
  const box = star.nextElementSibling;
  if (box.style.display === 'block') {
    box.classList.remove('animate__fadeInUp');
    box.classList.add('animate__animated', 'animate__fadeOutDown');
    setTimeout(() => { box.style.display = 'none'; box.classList.remove('animate__fadeOutDown'); }, 400);
  } else {
    box.style.display = 'block';
    box.classList.remove('animate__fadeOutDown');
    box.classList.add('animate__animated', 'animate__fadeInUp');
  }
}
</script>
</body></html>`;
}

// ── API ───────────────────────────────────────────────────────────────────────
app.post('/api/generate', (req, res) => {
  try {
    const b = req.body || {};
    const rawSlug = normalizeSlug(b.site_slug);
    if (!validSlug(rawSlug)) return res.status(400).json({ error: 'საიტის სახელი არასწორია. გამოიყენე მხოლოდ a-z, 0-9 და დეფისი (-).' });

    const template = String(b.template_choice || 'girlfriend');
    const overwriteExisting = asBool(b.overwrite_existing);
    const photoLinks = onlyHttpLinks(b.photo_links).slice(0, 15);
    const videoLink = onlyHttpLinks(b.video_link)[0] || '';

    if (!photoLinks.length) return res.status(400).json({ error: 'აუცილებელია მინიმუმ 1 ფოტო.' });

    let slug = rawSlug, overwritten = false;
    let siteDir = path.join(GIFT_DIR, slug);
    if (fs.existsSync(siteDir)) {
      if (overwriteExisting) { fs.rmSync(siteDir, { recursive: true, force: true }); overwritten = true; }
      else { slug = resolveUniqueSlug(rawSlug); siteDir = path.join(GIFT_DIR, slug); }
    }
    fs.mkdirSync(siteDir, { recursive: true });

    const reasons = toArray(b.reasons).map((x) => String(x).trim()).filter(Boolean);
    const memories = [1, 2, 3, 4].map((i) => ({
      location: String(b[`memory_location_${i}`] || '').trim(),
      title: String(b[`memory_title_${i}`] || '').trim(),
      content: String(b[`memory_content_${i}`] || '').trim()
    })).filter((m) => m.location || m.title || m.content);

    const data = {
      sender_name: String(b.sender_name || '').trim(),
      recipient_name: String(b.recipient_name || '').trim(),
      hero_title: String(b.hero_title || '').trim(),
      hero_subtitle: String(b.hero_subtitle || '').trim(),
      love_message: String(b.love_message || '').trim(),
      story_or_memory: String(b.story_or_memory || '').trim(),
      reasons, final_message: String(b.final_message || '').trim(),
      date_invite_text: String(b.date_invite_text || '').trim(),
      music_link: String(b.music_link || '').trim(),
      photos: photoLinks, video: videoLink, memories,
      created_at: new Date().toISOString(), template, slug
    };

    let html = template === 'wife' ? renderWife(data) : template === 'map-of-stars' ? renderStars(data) : renderGirlfriend(data);

    fs.writeFileSync(path.join(siteDir, 'index.html'), html, 'utf-8');
    fs.writeFileSync(path.join(siteDir, 'data.json'), JSON.stringify(data, null, 2), 'utf-8');

    const proto = req.headers['x-forwarded-proto']?.toString().split(',')[0] || req.protocol;
    const base = BASE_URL || `${proto}://${req.get('host')}`;
    return res.json({ ok: true, slug, requested_slug: rawSlug, overwritten, url: `${base}/gift/${slug}/` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'გენერაციისას დაფიქსირდა შეცდომა.' });
  }
});

app.listen(PORT, () => console.log(`8march generator running on http://localhost:${PORT}`));
