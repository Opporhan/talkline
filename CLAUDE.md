# Talkline — proje notları

Bu depoda iki AYRI ürün var, ortak kodları yok. Asıl ürün tarayıcı uzantısı; kökteki `README.md` /
`README.tr.md` yalnızca onu anlatır (iki dil aynı içerikte tutulur), plugin'in belgesi
`skills/summarize/README.md` / `README.tr.md` içindedir.

**İsim:** Her yerde "Talkline"/`talkline` (depolama anahtarları `talklineArchive:*` vb., DOM id'leri,
mesaj türleri, `TalklineError`, `~/.cache/talkline`). `extension/migrate.js` kullanıcıların eski
`skimcast…` depolama anahtarlarını bir kerelik taşır (arka plan, sayfalar ve YouTube betiği veriyi
okumadan önce çağırır) ve eski yedek dosyalarını geri yüklemede çevirir. "skimcast" geçen tek yer bu
geçiş kodu olmalı.

## 1) Tarayıcı uzantısı (`extension/`)

Chrome/Edge uzantısı: link → aranabilir, tıkla-git yapılabilir transcript görüntüleyici + kişisel arşiv.
**Özetleme ve çeviri YOK.** Barındırılan sunucu YOK; her şey tarayıcıda çalışır. Dil tespiti
(`LanguageDetector`) yalnızca sesli okuma için kullanılır.

- `background.js`: transcript çekme (YouTube: doğrudan tarayıcıdan InnerTube ANDROID istemcisiyle —
  `fromYoutubeDirect`, kullanıcının kendi IP'sinden — YouTube `Origin: chrome-extension://…` isteğini 403
  ile reddettiği için `declarativeNetRequest` oturum kuralıyla Origin youtube.com yapılıyor; podcast
  RSS/Apple/web sayfası doğrudan JS fetch ile), arşive kaydetme, sağ tık menüsü, YouTube açıklamasından bölüm (chapter)
  tespiti (`fetchYoutubeChapters`, best-effort), videoyla-senkron mesaj yönlendirme (relay).
- `youtube_sync.js`: YouTube izleme sayfasına enjekte edilen içerik betiği — sağ sütuna Talkline panelini
  ve oynatıcıya düğmeyi ekler, video oynatma zamanını `background.js`'e bildirir (kimlik doğrulama
  gerektirmez, sadece "hangi video, kaçıncı saniye").
- `viewer.js`: transcript'i gösterir — arama, tıkla-git, bölümler arası atlama, olası reklam tespiti, favori
  (yıldız + klasöre taşıma), videoyla senkron takip ("🔗", kelime kelime yaklaşık vurgu), sesli okuma
  (Web Speech API, kelime kelime GERÇEK vurgu — `boundary` olayı), video notu (paylaşılan Notlarım deposuna
  yazar), TXT/PDF indirme (PDF: `vendor/jspdf.umd.min.js` + Türkçe karakterler için gömülü font).
- `library.js`: kütüphane — "Dosyalarım"/"Notlarım" iki sekme; Dosyalarım'da klasörler (özel ikon/görsel,
  not, sabitleme), arama, favoriler, "bunu hatırlıyor musun?" hatırlatma kartı; Notlarım'da birleşik not
  sistemi (`talklineNotes` — video notu/favori notu/serbest not hepsi burada, isteğe bağlı kaynak bağlantısı
  ve alıntıyla); yedekleme/geri yükleme (notlar dahil), Markdown dışa aktarma.
- `theme.js` / `lang.js`: paylaşılan tema (açık/koyu) ve arayüz dili (TR/EN, tarayıcı dilinden bağımsız).
- Testler: `extension/test.mjs` (saf mantık fonksiyonları) — `node extension/test.mjs`.
- Mağaza paketi: `python3 scripts/build_store_zip.py` (çıktı `dist/`) (manifest'ten `key`i çıkarır, test dosyalarını
  dışarıda bırakır). Mağaza metinleri/izin gerekçeleri: `docs/store-listing.md`; görseller: `store-assets/`;
  gizlilik: `PRIVACY.md`; elle deneme listesi: `docs/deneme-listesi.md`.
- **TUZAK:** `extension/` klasöründe (ya da içindeki bir dosyayı hedefleyerek) `python3 -m py_compile`
  veya benzeri bytecode-üreten bir komut ÇALIŞTIRMA — `extension/__pycache__/` oluşturur, Chrome/Edge
  "_" ile başlayan dosya/klasör adlarını reddettiği için uzantı hiç yüklenemez ("Cannot load extension
  with file or directory name __pycache__"). Python syntax kontrolü gerekiyorsa
  `python3 -c "compile(open('dosya').read(), 'x', 'exec')"` kullan (bytecode dosyaya yazmaz), ya da işi
  bitince `rm -rf extension/__pycache__` çalıştır.

## 2) Claude Code plugin'i (`skills/summarize/`)

link → transcript → zaman damgalı özet. Kod bilinçli olarak **küçük** tutulur.

- `skills/summarize/transcript.py`: tek dosya, transcript aracı. Basamaklı yedek zinciri (YouTube altyazı → podcast etiketi →
  yt-dlp altyazı → web sayfası → whisper). Eksik paketi özel venv'e (`~/.cache/talkline/venv`) kendisi kurar.
- `skills/summarize/mcp_server.py`: Claude Desktop için ince MCP sarmalayıcı (`get_transcript` aracı, `transcript.load`'u kullanır; `mcp<2` sabitli, v2'de FastMCP yeniden adlandırıldı).
- `skills/summarize/SKILL.md`: özetin biçimi ve kalite kuralları (özet Claude Code tarafından yazılır; ayrı LLM yok).
- Testler: `.venv/bin/pytest -q`, lint: `.venv/bin/ruff check .`; plugin: `claude plugin validate .`.
- Ağ/yt-dlp/whisper testlerde mock'lanır; gerçek denemeler elle yapılır.
- Kapsamı büyütme: önbellek/devam altyapısı, doğrulayıcı, RSS izleme gibi şeyler bilinçli olarak dışarıda bırakıldı.
- Podcast `<podcast:transcript>` etiketi yerel adla aranır (feed'ler ad alanını farklı adreslerle tanımlıyor).
