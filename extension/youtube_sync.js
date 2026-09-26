// Talkline (uzantı): youtube_sync.js — YouTube izleme sayfasına enjekte edilen içerik betiği. İki işi var:
// 1) Oynatılan videonun kimliğini ve o anki oynatma zamanını (throttle'lanmış) arka plana (background.js)
//    bildirmek — "videoyla senkron takip" (Talkline sekmede "🔗" açıkken transcript kendiliğinden kayar).
// 2) Sayfanın sağ sütununa (normalde "sıradaki video" listesinin olduğu yer) tam boy bir Talkline paneli
//    yerleştirmek — transcript'i ayrı bir sekmede değil, videonun hemen yanında gösterir. Transcript arşivde
//    yoksa "Transcript'i Getir" düğmesi çıkar; varsa panel viewer.html'i bir iframe içinde yükler.

function currentVideoId() {
  let u;
  try { u = new URL(location.href); } catch { return null; }
  if (u.pathname === "/watch") return u.searchParams.get("v");
  const shortsM = u.pathname.match(/^\/shorts\/([\w-]{11})/);
  if (shortsM) return shortsM[1];
  const liveM = u.pathname.match(/^\/live\/([\w-]{11})/);
  if (liveM) return liveM[1];
  return null;
}

let lastSentAt = 0;
function onTimeUpdate(video, videoId) {
  const now = Date.now();
  if (now - lastSentAt < 400) return; // saniyede ~2 güncelleme yeterli, mesaj trafiğini gereksiz artırma
  lastSentAt = now;
  try {
    chrome.runtime.sendMessage({ type: "skimcast-time-update", videoId, currentTime: video.currentTime });
  } catch { /* uzantı yeniden yüklenmiş olabilir, sessizce geç */ }
}

// Kenar panelindeki (iframe içindeki viewer.js) bir zaman damgasına tıklanınca artık yeni bir sekme
// AÇMIYORUZ — aynı sayfadaki video zaten orada, doğrudan onu saniyeye atlatıyoruz. viewer.js iframe
// içindeyken bunun yerine postMessage ile buraya bildiriyor.
window.addEventListener("message", (e) => {
  if (e.source !== document.getElementById(SIDEBAR_IFRAME_ID)?.contentWindow) return;
  if (e.data?.type !== "skimcast-seek") return;
  const video = document.querySelector("video.html5-main-video") || document.querySelector("video");
  if (video && typeof e.data.sec === "number") video.currentTime = e.data.sec;
});

let attachedVideo = null;
let attachedId = null;
function attach() {
  const videoId = currentVideoId();
  const video = document.querySelector("video.html5-main-video") || document.querySelector("video");
  if (!videoId || !video) return;
  ensurePlayerButton();
  if (video === attachedVideo && videoId === attachedId) {
    // "Bazen sağda panel yok / boş" sorunu: YouTube sayfayı kendi içinde yeniden çizince paneli
    // silebiliyor, ya da ilk yüklemede panel iskeleti kurulup gövdesi boş kalabiliyor (tarayıcıda
    // görüldü). Video aynı kalsa bile her saniye kontrol edip eksikse/boşsa yeniden kuruyoruz.
    const panel = document.getElementById(PANEL_ID);
    const missing = !panel && !document.getElementById(FALLBACK_ID) && findSecondaryColumn();
    const empty = panel && !panel.querySelector(".skimcast-sb-body")?.firstChild;
    if (missing || empty) {
      panelVideoId = null;
      ensureSidebarPanel(videoId);
    }
    return;
  }
  if (attachedVideo && attachedVideo._skimcastHandler) {
    attachedVideo.removeEventListener("timeupdate", attachedVideo._skimcastHandler);
  }
  const handler = () => onTimeUpdate(video, videoId);
  video.addEventListener("timeupdate", handler);
  video._skimcastHandler = handler;
  attachedVideo = video;
  attachedId = videoId;
  ensureSidebarPanel(videoId);
}

// ------------------------------------------------------------ kenar paneli
const PANEL_ID = "skimcast-sidebar-panel";
const SIDEBAR_IFRAME_ID = "skimcast-sidebar-iframe";
const archiveKey = (id) => `skimcastArchive:${id}`;

// Uzantının kendi _locales/<dil>/messages.json'ından okuyor (background.js'in sağ tık menüsü başlığı için
// yaptığının aynısı) — içerik betiği viewer.js'nin i18n sistemini (lang.js) doğrudan kullanamıyor.
let messagesCache = null;
async function loadMessages() {
  if (messagesCache) return messagesCache;
  const { skimcastUiLang } = await chrome.storage.local.get("skimcastUiLang");
  const lang = skimcastUiLang || (chrome.i18n.getUILanguage().split("-")[0] === "tr" ? "tr" : "en");
  try {
    const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
    messagesCache = await res.json();
  } catch {
    messagesCache = {};
  }
  return messagesCache;
}
async function tt(key, fallback) {
  const messages = await loadMessages();
  return messages[key]?.message || fallback;
}

let panelVideoId = null;

function findSecondaryColumn() {
  return document.querySelector("#secondary #secondary-inner") || document.querySelector("#secondary");
}

// YouTube'un sağ sütununu bulmak için #secondary/#secondary-inner adlı, YouTube'un KENDİ (belgelenmemiş,
// önceden haber vermeden değişebilen) bir DOM yapısına bakıyoruz — bu bir gün değişirse kenar paneli hiç
// yerleşemez. Bunu SESSİZCE kaybolan bir özellik olmaktan çıkarmak için: sütunu birkaç saniye boyunca
// (SECONDARY_RETRY_LIMIT kere, ~her saniye bir) aramayı deniyoruz; hâlâ bulamazsak "artık bu sayfa
// yapısı değişmiş" kabul edip, hiçbir YouTube-özel elemente bağımlı OLMAYAN (sadece document.body'ye
// eklenen, garanti her zaman var olan) küçük bir yedek düğmeye düşüyoruz — o da eski, her zaman çalışan
// yöntemi (transcript'i yeni sekmede aç) tetikliyor. Böylece özellik YouTube'un sayfası değişse bile
// TAMAMEN kaybolmuyor, sadece kenar paneli konforunu kaybedip eski davranışa dönüyor.
const SECONDARY_RETRY_LIMIT = 6;
const SECONDARY_RETRY_DELAY_MS = 1000;
const FALLBACK_ID = "skimcast-fallback-btn";

function buildFallbackButton(videoId) {
  if (document.getElementById(FALLBACK_ID) || document.getElementById(PANEL_ID)) return;
  const btn = document.createElement("button");
  btn.id = FALLBACK_ID;
  btn.textContent = "📝 Talkline";
  tt("sidebar_fallback_hint", "YouTube's page layout changed and the sidebar panel couldn't attach — click to open the transcript in a new tab instead.")
    .then((hint) => { btn.title = hint; });
  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "…";
    try {
      const res = await chrome.runtime.sendMessage({ action: "fetch", url: location.href });
      if (!res?.ok) throw new Error(res?.error || "?");
    } catch (e) {
      btn.title = String(e?.message || e);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
  document.body.appendChild(btn);
}

async function buildPanelShell() {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="skimcast-sb-header">
      <span>Talkline</span>
      <button type="button" class="skimcast-sb-toggle" title="${escapeAttr(await tt("sidebar_collapse_hint", "Collapse"))}">▾</button>
    </div>
    <div class="skimcast-sb-body"></div>
  `;
  panel.querySelector(".skimcast-sb-toggle").addEventListener("click", () => {
    const collapsed = panel.classList.toggle("skimcast-collapsed");
    panel.querySelector(".skimcast-sb-toggle").textContent = collapsed ? "▸" : "▾";
  });
  return panel;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

async function renderCta(body, videoId) {
  body.innerHTML = `
    <div class="skimcast-sb-cta">
      <p>${await tt("sidebar_cta_text", "See this video's searchable, click-to-jump transcript right here.")}</p>
      <button type="button" class="skimcast-sb-fetch">${await tt("fetch_btn", "Get transcript")}</button>
      <p class="skimcast-sb-status" hidden></p>
    </div>`;
  const btn = body.querySelector(".skimcast-sb-fetch");
  const status = body.querySelector(".skimcast-sb-status");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    status.hidden = false;
    status.textContent = await tt("status_fetching", "Fetching transcript…");
    try {
      const res = await chrome.runtime.sendMessage({ type: "skimcast-fetch-silent", url: location.href });
      if (!res?.ok) throw new Error(res?.error || "?");
      if (panelVideoId === videoId) renderIframe(body, videoId);
    } catch (e) {
      status.textContent = `${await tt("error_prefix", "Error:")} ${e.message || e}`;
      btn.disabled = false;
    }
  });
}

function renderIframe(body, videoId) {
  const src = chrome.runtime.getURL(`viewer.html?id=${encodeURIComponent(`yt:${videoId}`)}`);
  // "allow" olmadan Chrome'un cihaz üzerindeki dil-tespit API'si (LanguageDetector — sesli okumanın
  // doğru sesi seçmesi için) bir iframe içinde varsayılan olarak kapalı geliyor (Permissions Policy).
  // clipboard-write kopyala düğmesi için gerekli.
  body.innerHTML = `<iframe id="${SIDEBAR_IFRAME_ID}" src="${src}" allow="clipboard-write; language-detector"></iframe>`;
}

// Video değiştiğinde (SPA navigasyonu) paneli o videoya göre yeniden kuruyoruz: arşivde zaten varsa
// doğrudan iframe, yoksa "Transcript'i Getir" çağrısı. Panelin kendisi (başlık, küçült düğmesi) sabit
// kalıyor, sadece gövdesi değişiyor. `attempt`: sağ sütun bulunamadığında kaç kere yeniden denediğimiz —
// dışarıdan hep 0 ile çağrılır, kendi içinde setTimeout ile kendini artan bir sayaçla tekrar çağırır.
async function ensureSidebarPanel(videoId, attempt = 0) {
  if (attempt === 0) {
    if (panelVideoId === videoId && (document.getElementById(PANEL_ID) || document.getElementById(FALLBACK_ID))) return;
    panelVideoId = videoId;
  } else if (panelVideoId !== videoId) {
    return; // bu deneme zincirinden sonra kullanıcı zaten başka bir videoya geçmiş, boşa devam etme
  }

  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    const column = findSecondaryColumn();
    if (!column) {
      if (attempt + 1 >= SECONDARY_RETRY_LIMIT) { buildFallbackButton(videoId); return; }
      setTimeout(() => ensureSidebarPanel(videoId, attempt + 1), SECONDARY_RETRY_DELAY_MS);
      return;
    }
    document.getElementById(FALLBACK_ID)?.remove(); // sütun nihayet bulunduysa yedek düğmeye artık gerek yok
    const shell = await buildPanelShell();
    // buildPanelShell beklerken başka bir çağrı paneli çoktan eklemiş olabilir — iki panel olmasın.
    panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = shell;
      column.insertBefore(panel, column.firstChild);
    }
  }

  const body = panel.querySelector(".skimcast-sb-body");
  const { [archiveKey(`yt:${videoId}`)]: entry } = await chrome.storage.local.get(archiveKey(`yt:${videoId}`));
  if (panelVideoId !== videoId) return; // bu sırada video tekrar değişmiş olabilir
  if (entry) renderIframe(body, videoId);
  else await renderCta(body, videoId);
}

// ------------------------------------------------------------ oynatıcı düğmesi
// Videonun kendi kontrol çubuğunda (sağ alt, altyazı/ayarlar düğmelerinin yanı) bir Talkline düğmesi.
// Panel sağ sütunda görünüyorsa onu açıp/kapatıyor; sağ sütun görünmüyorsa (dar pencere, sinema modu —
// YouTube sütunu gizliyor ya da videonun altına taşıyor) transcript'i yeni sekmede açıyor.
const PLAYER_BTN_ID = "skimcast-player-btn";

function ensurePlayerButton() {
  if (document.getElementById(PLAYER_BTN_ID)) return;
  // YouTube'un güncel oynatıcısında sağ kontroller iki gruba ayrılmış; düğmeyi altyazı/ayarların olduğu
  // sol gruba koyuyoruz (tarayıcıda doğrulandı). Eski düzende grup yoksa doğrudan sağ kontrollere.
  const controls = document.querySelector(".html5-video-player .ytp-right-controls-left")
    || document.querySelector(".html5-video-player .ytp-right-controls");
  if (!controls) return;
  const btn = document.createElement("button");
  btn.id = PLAYER_BTN_ID;
  btn.className = "ytp-button";
  // innerHTML yerine DOM API: YouTube sayfası "Trusted Types" zorunlu kılıyor (tarayıcıda görüldü).
  const NS = "http://www.w3.org/2000/svg";
  // Material Symbols "article" (Apache 2.0) — YouTube'un yeni oynatıcısındaki 24px çizgi simgelerle aynı
  // boyut/tarz; CSS düğmenin ortasına yerleştiriyor (youtube_sidebar.css).
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("fill", "#fff");
  path.setAttribute("d", "M7 17h7v-2H7v2zm0-4h10v-2H7v2zm0-4h10V7H7v2zM5 21q-.825 0-1.412-.587Q3 19.825 3 19V5q0-.825.588-1.413Q4.175 3 5 3h14q.825 0 1.413.587Q21 4.175 21 5v14q0 .825-.587 1.413Q19.825 21 19 21Zm0-2h14V5H5v14Z");
  svg.appendChild(path);
  btn.appendChild(svg);
  tt("player_btn_hint", "Talkline transcript").then((hint) => {
    btn.title = hint;
    btn.setAttribute("aria-label", hint);
  });
  btn.addEventListener("click", async () => {
    const panel = document.getElementById(PANEL_ID);
    if (panel && panel.offsetParent !== null) {
      const wasCollapsed = panel.classList.contains("skimcast-collapsed");
      panel.querySelector(".skimcast-sb-toggle").click();
      if (wasCollapsed) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    try {
      const res = await chrome.runtime.sendMessage({ action: "fetch", url: location.href });
      if (!res?.ok) throw new Error(res?.error || "?");
    } catch (e) {
      btn.title = String(e?.message || e);
    }
  });
  controls.insertBefore(btn, controls.firstChild);
}

// Popup'tan ya da sağ tık menüsünden "Transcript'i Getir" tetiklendiğinde (background.js:fetchAndOpen)
// — bu video zaten bu sekmede açıksa arka plan yeni sekme açmak yerine buraya haber veriyor. panelVideoId'yi
// sıfırlayıp ensureSidebarPanel'i zorla yeniden çalıştırıyoruz ki artık arşivde olan kaydı görüp iframe'e
// geçsin (aksi halde "zaten bu videoya göre kurulu" diye hiçbir şey yapmadan çıkardı).
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "skimcast-refresh-panel" && msg.videoId) {
    panelVideoId = null;
    ensureSidebarPanel(msg.videoId);
  }
});

attach();
// YouTube bir SPA — sayfa hiç yenilenmeden video/URL değişebiliyor (bir sonraki videoya geçme, ilgili
// video tıklama, vb.). Kendi navigasyon olayını dinliyoruz; garanti olsun diye periyodik de kontrol ediyoruz.
document.addEventListener("yt-navigate-finish", attach);
setInterval(attach, 1000);
