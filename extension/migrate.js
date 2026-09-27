// Talkline (uzantı): migrate.js — proje eskiden "skimcast" adını taşıyordu ve depolama anahtarları
// "skimcast…" ile başlıyordu (skimcastArchive:…, skimcastNotes, …). Artık hepsi "talkline…". Bu dosya
// eski anahtarları bir kerelik yeni adlarına taşır; arka plan, sayfalar ve YouTube içerik betiği kendi
// verilerini okumadan önce çağırıyor (hangisi önce çalışırsa o taşır, sonrakiler için iş kalmaz).
// Eski yedek dosyalarını geri yüklerken de aynı ad çevirisi kullanılıyor (legacyToNewKeys).

const LEGACY_PREFIX = "skimcast";
const LEGACY_DROPPED = new Set(["skimcastDefaultTranslateLang"]); // kaldırılan çeviri özelliğinin artığı

// {eski anahtar: değer} → {yeni anahtar: değer}; zaten yeni adlı anahtarlara dokunmaz.
function legacyToNewKeys(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (LEGACY_DROPPED.has(k)) continue;
    out[k.startsWith(LEGACY_PREFIX) ? "talkline" + k.slice(LEGACY_PREFIX.length) : k] = v;
  }
  return out;
}

async function migrateLegacyStorage() {
  for (const area of [chrome.storage.local, chrome.storage.sync]) {
    try {
      const all = await area.get(null);
      const legacy = Object.keys(all).filter((k) => k.startsWith(LEGACY_PREFIX));
      if (!legacy.length) continue;
      const moved = {};
      for (const [k, v] of Object.entries(legacyToNewKeys(Object.fromEntries(legacy.map((k) => [k, all[k]]))))) {
        if (!(k in all)) moved[k] = v; // yeni adla zaten kayıt varsa (daha yeni) üzerine yazma
      }
      await area.set(moved);
      await area.remove(legacy);
    } catch { /* sync kapalı olabilir; bir sonraki açılışta tekrar denenir */ }
  }
}
