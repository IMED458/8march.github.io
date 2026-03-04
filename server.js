import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || '';

const ROOT = path.resolve();
const PUBLIC_DIR = path.join(ROOT, 'public');
const GIFT_DIR = path.join(PUBLIC_DIR, 'gift');
const TMP_DIR = path.join(ROOT, '.uploads_tmp');

fs.mkdirSync(GIFT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

function esc(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function validSlug(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function safeName(name) {
  const ext = path.extname(name).toLowerCase().slice(0, 10);
  const base = path
    .basename(name, path.extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${base || 'file'}-${crypto.randomBytes(4).toString('hex')}${ext}`;
}

function toArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function ytEmbed(url) {
  const match =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/) ||
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : '';
}

function spotifyEmbed(url) {
  const m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : '';
}

function musicSection(link) {
  if (!link) return '';
  const clean = esc(link);
  const yt = ytEmbed(link);
  if (yt) {
    return `<section class="card"><h2>ჩვენი სიმღერა 🎵</h2><div class="video-wrap"><iframe src="${yt}" title="YouTube" allowfullscreen></iframe></div></section>`;
  }
  const sp = spotifyEmbed(link);
  if (sp) {
    return `<section class="card"><h2>ჩვენი სიმღერა 🎵</h2><iframe style="border-radius:12px" src="${sp}" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></section>`;
  }
  return `<section class="card"><h2>ჩვენი სიმღერა 🎵</h2><a href="${clean}" target="_blank" rel="noopener">${clean}</a></section>`;
}

function gallerySection(photos) {
  if (!photos.length) return '';
  return `
  <section class="card">
    <h2>ჩვენი ფოტოები 📸</h2>
    <div class="gallery">
      ${photos.map((p) => `<a href="${esc(p)}" target="_blank" rel="noopener"><img src="${esc(p)}" alt="photo"></a>`).join('')}
    </div>
  </section>`;
}

function videoSection(video) {
  if (!video) return '';
  return `<section class="card"><h2>ჩვენი ვიდეო 🎬</h2><video controls src="${esc(video)}"></video></section>`;
}

function baseStyles(theme = 'rose') {
  const themes = {
    rose: {
      bg: 'linear-gradient(135deg,#fff1f2,#fff,#fdf2f8)',
      accent: '#e11d48',
      card: '#ffffff',
      text: '#1f2937'
    },
    gold: {
      bg: 'linear-gradient(135deg,#fefce8,#fff,#fef3c7)',
      accent: '#b45309',
      card: '#ffffff',
      text: '#1f2937'
    },
    stars: {
      bg: 'linear-gradient(180deg,#05070a,#0b1220)',
      accent: '#f3cc4d',
      card: 'rgba(17,24,39,.85)',
      text: '#e5e7eb'
    }
  };
  const t = themes[theme];
  return `
  :root{--accent:${t.accent};--card:${t.card};--text:${t.text}}
  *{box-sizing:border-box}
  body{margin:0;font-family:'Noto Sans Georgian',sans-serif;background:${t.bg};color:var(--text)}
  .container{max-width:980px;margin:0 auto;padding:24px}
  .hero{padding:64px 16px 32px;text-align:center}
  .hero h1{font-size:clamp(2rem,6vw,3.8rem);margin:0 0 8px;line-height:1.15}
  .hero p{opacity:.85}
  .badge{display:inline-block;padding:6px 12px;border-radius:999px;background:color-mix(in srgb,var(--accent) 18%, white);font-size:13px;font-weight:600;margin-bottom:12px}
  .card{background:var(--card);border-radius:18px;padding:22px;margin:18px 0;border:1px solid color-mix(in srgb,var(--accent) 24%, transparent);box-shadow:0 10px 30px rgba(0,0,0,.08)}
  h2{margin:0 0 12px;font-size:1.5rem;color:var(--accent)}
  .gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
  .gallery img{width:100%;height:190px;object-fit:cover;border-radius:12px;display:block}
  video,.video-wrap iframe{width:100%;border:0;border-radius:12px;display:block}
  .video-wrap{aspect-ratio:16/9}
  .reasons{padding-left:20px;line-height:1.8}
  .footer{text-align:center;padding:42px 16px 56px;opacity:.8}
  .stars-grid{display:grid;gap:14px}
  .star-item{padding:16px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(243,204,77,.3)}
  .star-item h3{margin:0 0 6px;color:var(--accent)}
  a{color:var(--accent)}
  `;
}

function renderGirlfriend(data) {
  const reasons = data.reasons.length ? `<ul class="reasons">${data.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p>მიზეზი დამატებული არ არის.</p>';
  return `<!doctype html><html lang="ka"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(data.hero_title || 'ჩემო სიყვარულო')}</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%A9%3C/text%3E%3C/svg%3E"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@300;400;500;700&display=swap" rel="stylesheet"><style>${baseStyles('rose')}</style></head><body><main class="container"><header class="hero"><span class="badge">8 მარტი 💕</span><h1>${esc(data.hero_title || 'ჩემო სიყვარულო')}</h1><p>${esc(data.hero_subtitle || `${data.recipient_name}-სთვის, სიყვარულით`)}</p></header><section class="card"><h2>წერილი 💌</h2><p>${esc(data.love_message || '')}</p></section><section class="card"><h2>ჩვენი ისტორია</h2><p>${esc(data.story_or_memory || '')}</p></section><section class="card"><h2>რატომ მიყვარხარ</h2>${reasons}</section>${gallerySection(data.photos)}${videoSection(data.video)}${musicSection(data.music_link)}<section class="card"><h2>პაემანზე მოწვევა ✨</h2><p>${esc(data.date_invite_text || '')}</p></section><section class="card"><h2>საბოლოო სიტყვა</h2><p>${esc(data.final_message || '')}</p><p><strong>უსაზღვრო სიყვარულით, ${esc(data.sender_name)}</strong></p></section><footer class="footer">📩 Generated by 8march</footer></main></body></html>`;
}

function renderWife(data) {
  const reasons = data.reasons.length ? `<ul class="reasons">${data.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : '<p>მიზეზი დამატებული არ არის.</p>';
  return `<!doctype html><html lang="ka"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(data.hero_title || 'გილოცავ 8 მარტს')}</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%A9%3C/text%3E%3C/svg%3E"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Georgian:wght@300;400;500;700&display=swap" rel="stylesheet"><style>${baseStyles('gold')} body{font-family:'Noto Serif Georgian',serif}</style></head><body><main class="container"><header class="hero"><span class="badge">8 მარტი 💛</span><h1>${esc(data.hero_title || 'გილოცავ 8 მარტს')}</h1><p>${esc(data.hero_subtitle || `${data.recipient_name}-სთვის, სიყვარულით`)}</p></header><section class="card"><h2>სიყვარულის წერილი</h2><p>${esc(data.love_message || '')}</p></section><section class="card"><h2>მოგონება</h2><p>${esc(data.story_or_memory || '')}</p></section><section class="card"><h2>რატომ ხარ საუკეთესო</h2>${reasons}</section>${gallerySection(data.photos)}${videoSection(data.video)}${musicSection(data.music_link)}<section class="card"><h2>პაემანი</h2><p>${esc(data.date_invite_text || '')}</p></section><section class="card"><h2>საბოლოო სიტყვები</h2><p>${esc(data.final_message || '')}</p><p><strong>სამუდამოდ შენი, ${esc(data.sender_name)}</strong></p></section><footer class="footer">📩 Generated by 8march</footer></main></body></html>`;
}

function renderStars(data) {
  const blocks = data.memories.map((m, i) => `
    <article class="star-item">
      <h3>${esc(m.title || `ვარსკვლავი ${i + 1}`)}</h3>
      <p><strong>${esc(m.location || 'Location')}</strong></p>
      <p>${esc(m.content || '')}</p>
    </article>`).join('');

  return `<!doctype html><html lang="ka"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Map of Stars</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%A9%3C/text%3E%3C/svg%3E"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fira+Go:wght@300;400;500;700&display=swap" rel="stylesheet"><style>${baseStyles('stars')}</style></head><body><main class="container"><header class="hero"><span class="badge">The Map of Stars ✨</span><h1>${esc(data.hero_title || 'The Map of Stars')}</h1><p>${esc(data.hero_subtitle || `${data.sender_name}-სგან ${data.recipient_name}-ს`)}</p></header><section class="card"><h2>ვარსკვლავური ქრონოლოგია</h2><div class="stars-grid">${blocks}</div></section>${gallerySection(data.photos)}${videoSection(data.video)}${musicSection(data.music_link)}<section class="card"><h2>პაემანზე მოწვევა</h2><p>${esc(data.date_invite_text || data.memories[data.memories.length - 1]?.content || '')}</p></section><footer class="footer">გილოცავ 8 მარტს, ჩემო ვარსკვლავო! 📩</footer></main></body></html>`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => cb(null, safeName(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 17 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    cb(ok ? null : new Error('Only image/video files are allowed'), ok);
  }
});

app.use(express.static(PUBLIC_DIR));

app.post(
  '/api/generate',
  upload.fields([
    { name: 'photos', maxCount: 15 },
    { name: 'video', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const b = req.body || {};
      const slug = String(b.site_slug || '').trim().toLowerCase();

      if (!validSlug(slug)) {
        return res.status(400).json({ error: 'საიტის სახელი არასწორია. გამოიყენე მხოლოდ a-z, 0-9 და დეფისი (-).' });
      }

      const template = String(b.template_choice || 'girlfriend');
      const photosInput = req.files?.photos || [];
      const videoInput = (req.files?.video || [])[0] || null;

      if (photosInput.length > 15) {
        return res.status(400).json({ error: 'მაქსიმუმ 15 ფოტო.' });
      }

      const siteDir = path.join(GIFT_DIR, slug);
      if (fs.existsSync(siteDir)) {
        return res.status(409).json({ error: 'ეს საიტის სახელი უკვე დაკავებულია.' });
      }

      const photosDir = path.join(siteDir, 'assets', 'photos');
      const videoDir = path.join(siteDir, 'assets', 'video');
      fs.mkdirSync(photosDir, { recursive: true });
      fs.mkdirSync(videoDir, { recursive: true });

      const photoLinks = photosInput.map((f) => {
        const target = path.join(photosDir, f.filename);
        fs.renameSync(f.path, target);
        return `/gift/${slug}/assets/photos/${f.filename}`;
      });

      let videoLink = '';
      if (videoInput) {
        const target = path.join(videoDir, videoInput.filename);
        fs.renameSync(videoInput.path, target);
        videoLink = `/gift/${slug}/assets/video/${videoInput.filename}`;
      }

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
        reasons,
        final_message: String(b.final_message || '').trim(),
        date_invite_text: String(b.date_invite_text || '').trim(),
        music_link: String(b.music_link || '').trim(),
        photos: photoLinks,
        video: videoLink,
        memories
      };

      let html = '';
      if (template === 'wife') html = renderWife(data);
      else if (template === 'map-of-stars') html = renderStars(data);
      else html = renderGirlfriend(data);

      fs.writeFileSync(path.join(siteDir, 'index.html'), html, 'utf-8');

      const proto = req.headers['x-forwarded-proto']?.toString().split(',')[0] || req.protocol;
      const host = req.get('host');
      const base = BASE_URL || `${proto}://${host}`;

      return res.json({
        ok: true,
        slug,
        url: `${base}/gift/${slug}/`
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'გენერაციისას დაფიქსირდა შეცდომა.' });
    }
  }
);

app.listen(PORT, () => {
  console.log(`8march generator running on http://localhost:${PORT}`);
});
