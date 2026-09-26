// Talkline (uzantı): background.js — transcript'i toplar, arşive kaydeder, görüntüleyici sekmesini açar.
// Podcast RSS / Apple Podcasts / web sayfası: doğrudan JS fetch ile (aşağıda). YouTube
// de doğrudan tarayıcıdan (InnerTube ANDROID istemcisi, bkz. fromYoutubeDirect).
//
// Eskiden burada bir de Groq'a (ücretsiz LLM API'si) istek atıp özet çıkarma adımı vardı. Bir gece
// boyunca kota/model/hız-sınırı sorunlarıyla uğraştıktan sonra (bkz. git geçmişi) bilinçli olarak
// vazgeçildi: ücretsiz bulut LLM'lerin kotaları güvenilir bir ürün için yetersiz. Bunun yerine zaten
// sağlam çalışan parçaya (transcript çıkarma) odaklanıldı — özet yerine aranabilir/atlanabilir bir
// transcript görüntüleyici + kişisel arşiv.

const BLOCK_SECONDS = 30;
const MIN_PAGE_CHARS = 300;

class SkimError extends Error {}

function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function toBlocks(segments) {
  const blocks = [];
  let start = null, buf = [];
  for (const [t, raw] of segments) {
    const text = String(raw).replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (start === null) start = t;
    buf.push(text);
    const span = t - start;
    if (span >= BLOCK_SECONDS && (/[.!?…]$/.test(text) || span >= 2 * BLOCK_SECONDS)) {
      blocks.push(`[${fmtTime(start)}] ${buf.join(" ")}`);
      start = null; buf = [];
    }
  }
  if (buf.length) blocks.push(`[${fmtTime(start)}] ${buf.join(" ")}`);
  return blocks;
}

async function fetchText(url) {
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": "talkline-extension/0.1" } });
  } catch (e) {
    throw new SkimError(`Bağlantı kurulamadı (${url.slice(0, 60)}…): ${e.message}`);
  }
  if (!res.ok) throw new SkimError(`Bağlantı kurulamadı (${url.slice(0, 60)}…): HTTP ${res.status}`);
  return res.text();
}

// ---------------------------------------------------------------- YouTube
const YT_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/|v\/))([\w-]{11})/;

function youtubeId(url) {
  const m = url.match(YT_ID_RE);
  return m ? m[1] : null;
}

// YouTube'un WEB istemcisinin caption/get_transcript API'leri tarayıcıdan çalışmıyor: bir "proof of
// origin" (pot) token istiyor, bu da yalnızca gerçek, işletim sistemi seviyesinde bir fare/klavye
// etkileşimiyle üretiliyor (denendi: .click() / chrome.debugger ile üretilen "tıklamalar" çalışmıyor;
// bunu atlatmaya çalışmak yapmayacağımız bir şey).
//
// Asıl yol (fromYoutubeDirect): youtube_transcript_api'nin yaptığının aynısı — InnerTube "player"
// uç noktasına ANDROID istemcisi olarak sorup altyazı listesini alıyor, altyazı XML'ini doğrudan
// indiriyoruz. Bu yol pot token istemiyor ve istek kullanıcının KENDİ IP'sinden gidiyor. Eskiden bunu
// barındırılan bir sunucu (Cloud Run) yapıyordu; YouTube veri merkezi IP'lerini "Sign in to confirm
// you're not a bot" diyerek engellediği için kaldırıldı (bkz. git geçmişi).
const INNERTUBE_CLIENT = { clientName: "ANDROID", clientVersion: "20.10.38" };

// transcript.py'deki _pick_track ile aynı: elle yazılmış > otomatik; aynı grupta langs sırası kazanır.
function pickCaptionTrack(tracks, langs) {
  const base = (t) => t.languageCode.split("-")[0];
  const rank = (t) => (langs.includes(base(t)) ? langs.indexOf(base(t)) : langs.length);
  const auto = (t) => t.kind === "asr";
  for (const pred of [
    (t) => !auto(t) && langs.includes(base(t)),
    (t) => !auto(t),
    (t) => auto(t) && langs.includes(base(t)),
    () => true,
  ]) {
    const found = tracks.filter(pred);
    if (found.length) return found.reduce((a, b) => (rank(b) < rank(a) ? b : a));
  }
  return null;
}

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
    const k = e.toLowerCase();
    if (k[0] === "#") return String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[k];
  });
}

// YouTube'un altyazı XML'i: <text start="5.3" dur="5.6">metin</text>. Metin bazen çift kaçışlı
// geliyor ("&amp;#39;"), bu yüzden iki kez çözüyoruz; içteki <font> gibi etiketler atılıyor.
function parseCaptionXml(xml) {
  const segs = [];
  for (const m of xml.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)) {
    const text = decodeEntities(decodeEntities(m[2])).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (text) segs.push([parseFloat(m[1]), text]);
  }
  return segs;
}

// transcript.py'nin to_blocks()'uyla aynı ~30sn birleştirme: gösterim blokları + her bloğun içine
// giren ham segmentler (videoyla kelime kelime senkron takip için).
function blocksWithWords(segments) {
  const blocks = [];
  let start = null, bufText = [], bufWords = [];
  for (const [t, raw] of segments) {
    const text = String(raw).replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (start === null) start = t;
    bufText.push(text);
    bufWords.push([t, text]);
    const span = t - start;
    if (span >= BLOCK_SECONDS && (/[.!?…]$/.test(text) || span >= 2 * BLOCK_SECONDS)) {
      blocks.push({ sec: start, text: bufText.join(" "), words: bufWords });
      start = null; bufText = []; bufWords = [];
    }
  }
  if (bufText.length) blocks.push({ sec: start, text: bufText.join(" "), words: bufWords });
  return blocks;
}

// YouTube, player uç noktasına "Origin: chrome-extension://…" ile gelen isteği 403 ile reddediyor
// (denendi: başlıksız ya da youtube.com origin'iyle 200). Bu yüzden yalnızca sekme dışı (uzantının
// kendi) isteklerinde Origin'i youtube.com yapan bir oturum kuralı kuruyoruz. Oturum kuralları tarayıcı
// kapanınca silindiğinden her istekten önce (idempotent) yeniden yazılıyor.
async function ensureYoutubeOriginRule() {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [1],
    addRules: [{
      id: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{ header: "origin", operation: "set", value: "https://www.youtube.com" }],
      },
      condition: {
        urlFilter: "||www.youtube.com/youtubei/v1/player",
        tabIds: [chrome.tabs.TAB_ID_NONE],
        resourceTypes: ["xmlhttprequest", "other"],
      },
    }],
  });
}

async function fromYoutubeDirect(videoId, langs) {
  await ensureYoutubeOriginRule();
  const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context: { client: INNERTUBE_CLIENT }, videoId }),
  });
  if (!res.ok) throw new Error(`YouTube HTTP ${res.status}`);
  const player = await res.json();
  const status = player.playabilityStatus?.status;
  if (status && status !== "OK") {
    throw new Error(`YouTube: ${player.playabilityStatus.reason || status}`);
  }
  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track = pickCaptionTrack(tracks, langs);
  if (!track) throw new SkimError("Bu videoda altyazı yok.");
  const segs = parseCaptionXml(await fetchText(track.baseUrl.replace("&fmt=srv3", "")));
  if (!segs.length) throw new Error("Altyazı boş geldi.");
  const blocks = blocksWithWords(segs);
  const kind = track.kind === "asr" ? "otomatik" : "elle";
  const seconds = Number(player.videoDetails?.lengthSeconds) || segs[segs.length - 1][0];
  const meta = {
    title: player.videoDetails?.title || "",
    method: `youtube-altyazı (${track.languageCode}, ${kind})`,
    duration: fmtTime(seconds),
    link_prefix: `https://youtu.be/${videoId}?t=`,
  };
  const text = blocks.map((b) => `[${fmtTime(b.sec)}] ${b.text}`).join("\n");
  return { native: true, meta, text, rawBlocks: blocks };
}

async function fromYoutube(url, langs) {
  try {
    return await fromYoutubeDirect(youtubeId(url), langs);
  } catch (e) {
    if (e instanceof SkimError) throw e;
    throw new SkimError(`YouTube altyazısı alınamadı: ${e.message}`);
  }
}

// ---------------------------------------------------------------- YouTube bölümleri (chapters)
// Birçok YouTube videosunun açıklamasında zaman damgalı bir bölüm listesi olur (ör. "0:00 Giriş\n2:15 ...").
// Bunun için ayrı bir resmi API yok; videonun herkese açık izleme sayfasının HTML'inde gömülü olan
// "shortDescription" alanını okuyup regex ile ayıklıyoruz. Bulunamazsa (chapters yok, sayfa yapısı
// değişmiş, vs.) sessizce null dönüyoruz — best-effort bir özellik, transcript almayı etkilememeli.
function unescapeJsString(s) {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\//g, "/").replace(/\\u0026/g, "&");
}

async function fetchYoutubeChapters(videoId) {
  try {
    const html = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
    const m = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
    if (!m) return null;
    const desc = unescapeJsString(m[1]);
    const lineRe = /^(\d{1,2}(?::\d{2}){1,2})\s*[-–:]?\s+(.+)$/;
    const chapters = [];
    for (const raw of desc.split("\n")) {
      const lm = raw.trim().match(lineRe);
      if (!lm) continue;
      const title = lm[2].trim();
      if (title) chapters.push({ sec: parseTimeLabel(lm[1]), title });
    }
    // YouTube'un kendi kuralı: en az 3 bölüm, ilk bölüm 0:00'a yakın başlar, zaman damgaları kesin artan.
    if (chapters.length < 3 || chapters[0].sec > 3) return null;
    for (let i = 1; i < chapters.length; i++) {
      if (chapters[i].sec <= chapters[i - 1].sec) return null;
    }
    return chapters;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- podcast RSS / Apple
function parseSubtitles(text) {
  const segs = []; let curT = null, lines = [], prev = [];
  const timeRe = /((?:\d+:)?\d+:\d+[.,]\d+)\s*-->/;
  const toSec = (stamp) => {
    const parts = stamp.replace(",", ".").split(":").map(Number);
    while (parts.length < 3) parts.unshift(0);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };
  const flush = () => {
    if (curT !== null) {
      let k = 0;
      for (let n = Math.min(lines.length, prev.length); n > 0; n--) {
        if (lines.slice(0, n).join("\u0001") === prev.slice(prev.length - n).join("\u0001")) { k = n; break; }
      }
      const line = lines.slice(k).join(" ").trim();
      if (line) segs.push([curT, line]);
      prev = lines;
    }
    curT = null; lines = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(timeRe);
    if (m) { flush(); curT = toSec(m[1]); }
    else if (curT !== null) {
      const line = raw.replace(/<[^>]+>/g, "").trim();
      if (!line) flush();
      else if (!/^\d+$/.test(line)) lines.push(line);
    }
  }
  flush();
  return segs;
}

function parsePodcastJson(text) {
  const data = JSON.parse(text);
  return (data.segments || []).map((s) => [Number(s.startTime || 0), s.body || ""]);
}

async function rssItem(feedUrl, audioHint, titleHint) {
  const xml = new DOMParser().parseFromString(await fetchText(feedUrl), "application/xml");
  if (xml.querySelector("parsererror")) throw new SkimError("RSS okunamadı (bozuk XML).");
  const items = [...xml.querySelectorAll("channel > item")];
  if (!items.length) throw new SkimError("RSS'te bölüm bulunamadı.");
  const norm = (u) => (u || "").split("?")[0];
  if (audioHint || titleHint) {
    for (const it of items) {
      const enc = it.querySelector("enclosure");
      const t = it.querySelector("title")?.textContent?.trim();
      if ((audioHint && enc && norm(enc.getAttribute("url")) === norm(audioHint)) ||
          (titleHint && t === titleHint.trim())) return it;
    }
    throw new SkimError("Linkteki bölüm RSS'te bulunamadı (çok eski olabilir).");
  }
  return items[0]; // en yeni bölüm
}

async function fromFeed(feedUrl, audioHint, titleHint) {
  const item = await rssItem(feedUrl, audioHint, titleHint);
  const title = item.querySelector("title")?.textContent?.trim() || "";
  const prefer = ["text/vtt", "application/srt", "application/x-subrip", "application/json", "text/plain"];
  const tags = [...item.getElementsByTagName("*")]
    .filter((e) => e.localName === "transcript" && e.getAttribute("url"))
    .sort((a, b) => {
      const rank = (e) => { const i = prefer.indexOf(e.getAttribute("type")); return i === -1 ? 99 : i; };
      return rank(a) - rank(b);
    });
  for (const tag of tags) {
    try {
      const body = await fetchText(tag.getAttribute("url"));
      const type = tag.getAttribute("type") || "";
      let segs = type.includes("json") ? parsePodcastJson(body) : parseSubtitles(body);
      if (!segs.length && type.startsWith("text/plain")) segs = [[0, body]];
      if (segs.length) return { title, method: `podcast-transcript-etiketi (${type})`, segments: segs, duration: 0, linkPrefix: "", timestamps: true };
    } catch { /* bu etiket olmadı, sıradakini dene */ }
  }
  throw new SkimError("Bu bölümde hazır transcript etiketi yok. (Uzantı sürümü sesi deşifre edemez; " +
    "Claude Code + Talkline eklentisi bunu whisper ile yapabilir.)");
}

async function fromApple(url) {
  const showId = url.match(/podcasts\.apple\.com\/.*?\/id(\d+)/)?.[1];
  const ep = new URL(url).searchParams.get("i");
  const country = url.match(/podcasts\.apple\.com\/([a-z]{2})\//)?.[1];
  const lookupUrl = `https://itunes.apple.com/lookup?id=${showId}&entity=podcastEpisode&limit=200` + (country ? `&country=${country}` : "");
  const data = JSON.parse(await fetchText(lookupUrl));
  const results = data.results || [];
  const feed = results.find((r) => r.feedUrl)?.feedUrl;
  const episodes = results.filter((r) => r.wrapperType === "podcastEpisode");
  const chosen = ep ? episodes.find((r) => String(r.trackId) === ep) : episodes[0];
  if (!feed || !chosen) {
    throw new SkimError(!ep || !episodes.length ? "Apple Podcasts kaydı bulunamadı." :
      "Linkteki bölüm Apple'ın döndürdüğü son 200 bölüm içinde yok; podcast'in RSS linkini deneyin.");
  }
  return fromFeed(feed, chosen.episodeUrl, chosen.trackName);
}

// ---------------------------------------------------------------- web sayfası
async function fromWebpage(url) {
  const html = await fetchText(url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,nav,header,footer,aside,noscript").forEach((e) => e.remove());
  const text = (doc.body?.innerText || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < MIN_PAGE_CHARS) throw new SkimError("Sayfadan okunabilir metin çıkarılamadı (giriş gerektiriyor olabilir).");
  const title = doc.querySelector("title")?.textContent?.trim() || "";
  return { title, method: "web-sayfası", segments: [[0, text]], duration: 0, linkPrefix: "", timestamps: false };
}

// ---------------------------------------------------------------- yönlendirme
const FEED_RE = /(\.xml|\.rss|\/feed|\/rss)(\/|\?|$)/i;
const APPLE_RE = /podcasts\.apple\.com\/.*?\/id\d+/;

async function getTranscript(target, langs) {
  let host;
  try { host = new URL(target).hostname.toLowerCase(); } catch { throw new SkimError("Geçerli bir link (http…) girin."); }
  if (host.includes("spotify.com")) {
    throw new SkimError("Spotify içeriği korumalıdır (DRM) ve desteklenmez. Aynı podcast'in Apple Podcasts veya RSS linkini kullanın.");
  }
  if (youtubeId(target)) return fromYoutube(target, langs);
  if (APPLE_RE.test(target)) return fromApple(target);
  if (FEED_RE.test(target)) return fromFeed(target);
  try {
    return await fromWebpage(target);
  } catch (e) {
    throw e instanceof SkimError ? e : new SkimError(String(e.message || e));
  }
}

function buildTranscriptText(t) {
  const blocks = t.timestamps ? toBlocks(t.segments) : [t.segments[0][1]];
  return blocks.join("\n");
}

// ---------------------------------------------------------------- kimlik + arşiv
// FNV-1a: podcast/web linkleri için basit, hızlı, senkron bir hash — kriptografik bir amacı yok, sadece
// aynı link tekrar getirilince aynı arşiv kaydının üzerine yazılsın diye (YouTube'da video ID zaten var).
function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function stableId(url) {
  const vid = youtubeId(url);
  return vid ? `yt:${vid}` : `u:${hashString(url)}`;
}

function parseTimeLabel(label) {
  const parts = label.split(":").map(Number);
  while (parts.length < 3) parts.unshift(0);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

// Otomatik altyazılar (YouTube/whisper) konuşma olmayan anları "(müzik)", "[Music]", "(alkış)" gibi
// parantez/köşeli parantez içinde işaretliyor — bunlar gerçek konuşma değil, arama/alıntıda
// gürültü yaratıyor. Bilinen etiketleri (TR+EN) satırdan siler; satırın tamamı bir etiketten ibaretse
// (ör. sadece "(müzik)") blok tamamen atlanır.
const NON_SPEECH_RE = /[([](müzik|music|gülüşme\w*|laugh\w*|alkış\w*|applause|gürültü\w*|noise|sessizlik|silence|anlaşılamıyor|inaudible|crosstalk|arka plan( müziği| sesi)?|background( music| noise)?)[)\]]/gi;

function stripNonSpeech(text) {
  return text.replace(NON_SPEECH_RE, "").replace(/\s{2,}/g, " ").trim();
}

// Hem native (Python) tarafının hem de kendi toBlocks()'umuzun ürettiği "[mm:ss] metin" satırlarını
// {sec, text} nesnelerine çevirir — görüntüleyici ve kütüphane (arama, tıkla-git, reklam tespiti)
// bunun üzerinden çalışır. Zaman damgası yoksa (web sayfası) sec null kalır.
function parseTimedBlocks(text) {
  const blocks = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^\[(\d{1,2}(?::\d{2}){1,2})\]\s?(.*)$/);
    const sec = m ? parseTimeLabel(m[1]) : null;
    const cleaned = stripNonSpeech(m ? m[2] : line);
    if (!cleaned) continue; // satır sadece "(müzik)" gibi bir etiketti, atla
    blocks.push({ sec, text: cleaned });
  }
  return blocks;
}

const archiveKey = (id) => `skimcastArchive:${id}`;
const ARCHIVE_INDEX_KEY = "skimcastArchiveIndex";

// Arşiv iki parçada tutulur: her kayıt kendi anahtarında (tam metin, olası büyük), ve hafif bir dizin
// (skimcastArchiveIndex) sadece kütüphane sayfasını hızlıca doldurmak için. Aynı video/link tekrar
// getirilirse (stableId aynı çıkar) kayıt GÜNCELLENİR — ama kullanıcının o kayda eklediği şeyler
// (favoriler, etiketler, not, sabitleme) korunur, sadece transcript/meta tazelenir.
async function saveToArchive(id, url, meta, blocks) {
  const prevKey = archiveKey(id);
  const { [prevKey]: prev } = await chrome.storage.local.get(prevKey);
  const entry = { ...prev, id, url, meta, blocks, ts: Date.now() };
  const { [ARCHIVE_INDEX_KEY]: index = [] } = await chrome.storage.local.get(ARCHIVE_INDEX_KEY);
  const nextIndex = [
    { id, title: meta.title, method: meta.method, duration: meta.duration, ts: entry.ts,
      folder: prev?.folder || "", pinned: prev?.pinned || false },
    ...index.filter((e) => e.id !== id),
  ];
  await chrome.storage.local.set({ [prevKey]: entry, [ARCHIVE_INDEX_KEY]: nextIndex });
  return entry;
}

// Tek iş: transcript'i almak, arşive kaydetmek, görüntüleyici sekmesini açmak. Artık bir LLM'e istek
// atmıyoruz (bkz. proje geçmişi: Groq'un ücretsiz katman kotaları + servis çalışanının uzun işlerin
// ortasında Chrome tarafından sonlandırılması bütün geceyi almıştı) — transcript alma saniyeler
// sürdüğü için servis çalışanının ömrüyle ilgili bir risk de yok.
// Hem popup'tan (mesajla) hem sağ tık menüsünden çağrıldığı için ortak bir fonksiyona çıkarıldı.
// YouTube yolu (fromYoutubeDirect), gösterim bloğuna (~30sn) ek olarak İÇİNE giren HAM, ince taneli
// altyazı parçalarını da veriyor (block.words) — kelime kelime videoyla senkron takip bunları kullanıyor.
// parseTimedBlocks() gibi "(müzik)" vb. konuşma-olmayan etiketleri hem bloğun hem her kelime grubunun
// metninden temizliyoruz; tamamen etiketten ibaret olan kelime grupları (ya da bloklar) atlanıyor.
function blocksFromNative(rawBlocks) {
  const blocks = [];
  for (const b of rawBlocks || []) {
    const cleanedText = stripNonSpeech(b.text);
    if (!cleanedText) continue;
    const words = (b.words || [])
      .map(([sec, text]) => ({ sec, text: stripNonSpeech(text) }))
      .filter((w) => w.text);
    blocks.push({ sec: b.sec, text: cleanedText, words });
  }
  return blocks;
}

// Sadece getirip arşive kaydeder, hiçbir sekme AÇMAZ — YouTube kenar paneli (youtube_sync.js) buradan
// çağırıyor: video zaten aynı sayfada oynuyor, yeni bir sekmeye gerek yok, panel kendi içine (iframe)
// yükleyecek.
async function fetchOnly(url) {
  const t = await getTranscript(url, ["tr", "en"]);
  const meta = t.native
    ? { title: t.meta.title, method: t.meta.method, duration: t.meta.duration, linkPrefix: t.meta.link_prefix }
    : { title: t.title, method: t.method, duration: t.duration ? fmtTime(t.duration) : "", linkPrefix: t.linkPrefix };
  const blocks = t.native && Array.isArray(t.rawBlocks) && t.rawBlocks.length
    ? blocksFromNative(t.rawBlocks)
    : parseTimedBlocks(t.native ? t.text : buildTranscriptText(t));

  const id = stableId(url);
  const ytId = youtubeId(url);
  if (ytId) {
    const chapters = await fetchYoutubeChapters(ytId);
    if (chapters) meta.chapters = chapters;
  }
  await saveToArchive(id, url, meta, blocks);
  return { id, meta };
}

async function fetchAndOpen(url) {
  const { id, meta } = await fetchOnly(url);
  // Bu video zaten bir YouTube sekmesinde açıksa YENİ SEKME AÇMA — o sekmenin kenar paneline
  // (youtube_sync.js) haber ver, orada (videonun hemen yanında) göstersin. Video hiçbir sekmede açık
  // değilse (ör. linki popup'a yapıştırıp video hiç izlenmiyorken getirdiyse) gösterecek bir sayfa yok,
  // eskisi gibi yeni sekmede aç.
  const ytId = youtubeId(url);
  if (ytId) {
    const tabs = await chrome.tabs.query({ url: ["https://www.youtube.com/*", "https://youtu.be/*"] });
    const match = tabs.find((tab) => youtubeId(tab.url || "") === ytId);
    if (match) {
      try {
        await chrome.tabs.sendMessage(match.id, { type: "skimcast-refresh-panel", videoId: ytId });
        await chrome.tabs.update(match.id, { active: true });
        return meta;
      } catch { /* içerik betiği yok/yanıt vermedi (ör. sekme çok eski) — sekmede aç */ }
    }
  }
  chrome.tabs.create({ url: chrome.runtime.getURL(`viewer.html?id=${encodeURIComponent(id)}`) });
  return meta;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.action !== "fetch") return;
  (async () => {
    try {
      const meta = await fetchAndOpen(msg.url);
      sendResponse({ ok: true, meta });
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof SkimError ? e.message : `Beklenmeyen hata: ${e.message || e}` });
    }
  })();
  return true; // asenkron yanıt
});

// ---------------------------------------------------------------- videoyla senkron takip (follow-along)
// youtube_sync.js (YouTube sayfasına enjekte edilen içerik betiği) oynatma anını buraya bildiriyor;
// hangi görüntüleyici sekmesinin hangi videoyu gösterdiğini (viewer.js "eşitle"yi açtığında kayıt olarak)
// burada tutup eşleşeni buluyoruz ve ona iletiyoruz. Sekme kapanınca kaydı temizliyoruz ki hayalet mesaj
// gitmeye çalışıp konsola gereksiz hata yazmasın.
const syncViewerTabs = new Map(); // tabId -> videoId

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "skimcast-register-viewer") {
    if (sender.tab?.id != null) {
      if (msg.videoId) syncViewerTabs.set(sender.tab.id, msg.videoId);
      else syncViewerTabs.delete(sender.tab.id);
    }
    return;
  }
  if (msg?.type === "skimcast-time-update" && msg.videoId) {
    for (const [tabId, videoId] of syncViewerTabs) {
      if (videoId === msg.videoId) {
        chrome.tabs.sendMessage(tabId, { type: "skimcast-time-sync", currentTime: msg.currentTime }).catch(() => {});
      }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => { syncViewerTabs.delete(tabId); });

// ---------------------------------------------------------------- YouTube kenar paneli (sessiz getirme)
// youtube_sync.js, izlenen videonun transcript'i arşivde yoksa (kenar panelindeki "Transcript'i Getir"
// düğmesine basıldığında) bunu çağırır — fetchAndOpen'dan farkı: hiçbir sekme açmaz, sadece getirip
// arşive kaydeder; panel sonra kendi içine (iframe) yükler.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "skimcast-fetch-silent") return;
  (async () => {
    try {
      const { id } = await fetchOnly(msg.url);
      sendResponse({ ok: true, id });
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof SkimError ? e.message : `Beklenmeyen hata: ${e.message || e}` });
    }
  })();
  return true;
});

// ---------------------------------------------------------------- sağ tık menüsü
// Popup'ı açıp linki yapıştırmaya gerek kalmadan, bir videoya/linke sağ tıklayıp doğrudan getirmek için.
// Menü başlığı kullanıcının seçtiği arayüz diline göre (lang.js'in kullandığı aynı _locales/<dil>/
// messages.json dosyalarından) oluşturuluyor; dil değişirse menü de tazeleniyor.
const CONTEXT_MENU_ID = "skimcast-fetch";

async function contextMenuTitle() {
  const { skimcastUiLang } = await chrome.storage.local.get("skimcastUiLang");
  const lang = skimcastUiLang || (chrome.i18n.getUILanguage().split("-")[0] === "tr" ? "tr" : "en");
  try {
    const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    const data = await res.json();
    return data.context_menu_fetch?.message || "Talkline: Get Transcript";
  } catch {
    return "Talkline: Get Transcript";
  }
}

async function setupContextMenu() {
  const title = await contextMenuTitle();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: CONTEXT_MENU_ID, title, contexts: ["page", "video", "link"] });
  });
}

chrome.runtime.onInstalled.addListener(setupContextMenu);
chrome.runtime.onStartup.addListener(setupContextMenu);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.skimcastUiLang) setupContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const url = info.linkUrl || info.pageUrl;
  if (!url) return;
  try {
    const meta = await fetchAndOpen(url);
    chrome.notifications.create({
      type: "basic", iconUrl: "icons/icon128.png",
      title: "Talkline", message: meta.title || "Transcript hazır.",
    });
  } catch (e) {
    chrome.notifications.create({
      type: "basic", iconUrl: "icons/icon128.png",
      title: "Talkline", message: e instanceof SkimError ? e.message : `Beklenmeyen hata: ${e.message || e}`,
    });
  }
});
