# Talkline — proje notları

Bu depoda iki AYRI ürün var, ortak kodları yok:

**İsim:** Proje eskiden "skimcast"ti; 2026-09-26/27'de iç adlar dahil HER ŞEY "Talkline"/`talkline` oldu
(plugin, depolama anahtarları `talklineArchive:*` vb., DOM id'leri, mesaj türleri, `TalklineError`,
`~/.cache/talkline`). Kullanıcıların eski `skimcast…` depolama anahtarlarını `extension/migrate.js` bir
kerelik taşıyor (arka plan, sayfalar ve YouTube betiği veriyi okumadan önce çağırır); eski yedek dosyaları
da geri yüklemede çevriliyor. "skimcast" geçen tek yer bu geçiş kodu olmalı.

## 1) Claude Code plugin'i (`skills/summarize/`)

link → transcript → zaman damgalı özet. Kod bilinçli olarak **küçük** tutulur.

- `skills/summarize/transcript.py`: tek dosya, transcript aracı. Basamaklı yedek zinciri (YouTube altyazı → podcast etiketi →
  yt-dlp altyazı → web sayfası → whisper). Eksik paketi özel venv'e (`~/.cache/talkline/venv`) kendisi kurar.
- `skills/summarize/mcp_server.py`: Claude Desktop için ince MCP sarmalayıcı (`get_transcript` aracı, `transcript.load`'u kullanır; `mcp<2` sabitli, v2'de FastMCP yeniden adlandırıldı).
- `skills/summarize/SKILL.md`: özetin biçimi ve kalite kuralları (özet Claude Code tarafından yazılır; ayrı LLM yok).
- Testler: `.venv/bin/pytest -q`, lint: `.venv/bin/ruff check .`; plugin: `claude plugin validate .`.
- Ağ/yt-dlp/whisper testlerde mock'lanır; gerçek denemeler elle yapılır.
- Kapsamı büyütme: önbellek/devam altyapısı, doğrulayıcı, RSS izleme gibi şeyler bilinçli olarak dışarıda bırakıldı.
- Podcast `<podcast:transcript>` etiketi yerel adla aranır (feed'ler ad alanını farklı adreslerle tanımlıyor).

## 2) Tarayıcı uzantısı (`extension/`)

Chrome/Edge uzantısı: link → aranabilir, tıkla-git yapılabilir transcript görüntüleyici + kişisel arşiv.
**Özetleme ve çeviri YOK** — özetleme bir gece süren Groq (ücretsiz LLM) kota/güvenilirlik sorunlarından sonra bilinçli olarak
terk edildi (bkz. git geçmişi); bunun yerine sağlam çalışan transcript-çekme parçası üzerine inşa edildi.
Cihaz üzerindeki çeviri (`Translator` API) de kaldırıldı: kalitesi zayıftı (sayı atlama, özetleme,
sızan etiketler) ve tarayıcıya göre değişiyordu (ör. Edge'de İngilizce→Türkçe yok). Dil tespiti
(`LanguageDetector`) sesli okuma için kaldı.

- `background.js`: transcript çekme (YouTube: doğrudan tarayıcıdan InnerTube ANDROID istemcisiyle —
  `fromYoutubeDirect`, kullanıcının kendi IP'sinden — YouTube `Origin: chrome-extension://…` isteğini 403
  ile reddettiği için `declarativeNetRequest` oturum kuralıyla Origin youtube.com yapılıyor; podcast
  RSS/Apple/web sayfası doğrudan JS fetch ile), arşive kaydetme, sağ tık menüsü, YouTube açıklamasından bölüm (chapter)
  tespiti (`fetchYoutubeChapters`, best-effort), videoyla-senkron mesaj yönlendirme (relay).
- `youtube_sync.js`: YouTube izleme sayfasına enjekte edilen içerik betiği — video oynatma zamanını
  `background.js`'e bildirir (kimlik doğrulama gerektirmez, sadece "hangi video, kaçıncı saniye").
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
- Barındırılan sunucu YOK. Eskiden YouTube transcript'i önce kullanıcının bilgisayarındaki bir "native
  messaging host" (Python kurulumu gerektirdiği için kaldırıldı), sonra bir Cloud Run sunucusu (`server/`;
  YouTube veri merkezi IP'lerini engellediği için kaldırıldı) üzerinden çekiliyordu — bkz. git geçmişi.
- Mağaza paketi: `python3 scripts/build_store_zip.py` (çıktı `dist/`) (manifest'ten `key`i çıkarır, test dosyalarını
  dışarıda bırakır). Mağaza metinleri/izin gerekçeleri: `docs/store-listing.md`; gizlilik: `PRIVACY.md`.
- **TUZAK:** `extension/` klasöründe (ya da içindeki bir dosyayı hedefleyerek) `python3 -m py_compile`
  veya benzeri bytecode-üreten bir komut ÇALIŞTIRMA — `extension/__pycache__/` oluşturur, Chrome/Edge
  "_" ile başlayan dosya/klasör adlarını reddettiği için uzantı hiç yüklenemez ("Cannot load extension
  with file or directory name __pycache__"). Bir kere gerçekten oldu, kullanıcı "uzantı görünmüyor"
  diye şaşırdı. Python syntax kontrolü gerekiyorsa `python3 -c "compile(open('dosya').read(), 'x', 'exec')"`
  kullan (bytecode dosyaya yazmaz), ya da işi bitince `rm -rf extension/__pycache__` çalıştır.
