# Mağaza formu metinleri (Chrome Web Store / Edge Add-ons)

Formdaki alanlara kopyala-yapıştır için. Paket: `python3 scripts/build_store_zip.py` → `dist/talkline-<sürüm>.zip`.

## Temel bilgiler

- **Kategori:** Productivity (Verimlilik). Alternatif: Education.
- **Dil:** Türkçe + English. Paket iki dili de içeriyor (`_locales/`); varsayılan dil `en`.
- **Gizlilik politikası URL'si:** https://github.com/Opporhan/talkline/blob/main/PRIVACY.md
  (Bağlantının çalışması için önce `PRIVACY.md` GitHub'a push edilmeli.)
- **Destek URL'si:** https://github.com/Opporhan/talkline/issues

## Ayrıntılı açıklama — English

```
Talkline turns a YouTube video, podcast episode or article into a clean, timestamped transcript you can search and navigate.

• Search inside the transcript; click any timestamp to jump the video to that moment
• Follow along: while the video plays, the transcript scrolls and highlights the words being spoken
• Chapters detected from the video description; likely sponsor segments flagged so you can skip them
• Read aloud with your browser's voices, with word-by-word highlighting
• Personal library: folders, favorite lines, notes, "remember this?" reminders
• Export as TXT, PDF or Markdown; back up and restore your whole library
• Light/dark theme; Turkish and English interface

Works with YouTube videos that have captions, podcasts that publish transcripts (RSS / Apple Podcasts), and web articles.

Privacy: no account, no analytics, no server of ours. Everything you save stays in your browser.
```

## Ayrıntılı açıklama — Türkçe

```
Talkline; bir YouTube videosunu, podcast bölümünü ya da makaleyi aranabilir, zaman damgalı, temiz bir transcript'e çevirir.

• Transcript içinde ara; herhangi bir zaman damgasına tıklayınca video o ana atlar
• Videoyla senkron takip: video oynarken transcript kayar, konuşulan kelimeleri vurgular
• Video açıklamasından bölümler; olası sponsor/reklam kısımları işaretlenir, atlayabilirsin
• Tarayıcının sesleriyle sesli okuma, kelime kelime vurguyla
• Kişisel kütüphane: klasörler, favori satırlar, notlar, "bunu hatırlıyor musun?" hatırlatmaları
• TXT, PDF ya da Markdown olarak dışa aktar; tüm kütüphaneni yedekle ve geri yükle
• Açık/koyu tema; Türkçe ve İngilizce arayüz

Altyazısı olan YouTube videoları, transcript yayınlayan podcast'ler (RSS / Apple Podcasts) ve web makaleleriyle çalışır.

Gizlilik: hesap yok, analitik yok, bizim bir sunucumuz yok. Kaydettiğin her şey tarayıcında kalır.
```

## Tek amaç (Single purpose)

```
Fetch the transcript of a YouTube video, podcast episode or web article the user chooses, and let the user read, search, navigate and save it.
```

## İzin gerekçeleri (Permission justification)

| İzin | Gerekçe (forma yapıştır) |
|---|---|
| `storage` | Saves fetched transcripts, favorites, folders, notes, reading progress and settings locally in the browser so the user's library persists. |
| `unlimitedStorage` | The user's library holds full transcripts (a long podcast can be hundreds of KB) plus uploaded folder images; the default 10 MB local quota fills up after a few dozen items. |
| `contextMenus` | Adds one right-click item, "Talkline: Get Transcript", so the user can fetch the transcript of the page, video or link they right-clicked without opening the popup. |
| `notifications` | After a transcript is fetched from the right-click menu (no popup is open), shows one notification that it is ready, or why it failed. |
| `declarativeNetRequestWithHostAccess` | Sets the Origin header to https://www.youtube.com on the extension's own request to YouTube's caption-list endpoint (youtubei/v1/player). YouTube rejects that request (HTTP 403) when it carries the extension's chrome-extension:// origin. The rule is a session rule limited to requests not made from any tab, so web pages are never affected. |
| Host permissions (`http://*/*`, `https://*/*`) | The user can paste any link: YouTube, any podcast's RSS feed (hosted on thousands of different domains, some http-only), Apple Podcasts lookup, or any article page. The extension fetches only the URL the user explicitly asks for (plus the resources that URL points to, like the podcast's transcript file) to extract its transcript/text. |
| Content script on `https://www.youtube.com/*` | On YouTube watch pages it adds a side panel showing the transcript next to the video, and reports the video's current playback time to the transcript view for follow-along highlighting and click-to-seek. It only locates the player and the sidebar column to place the panel; it does not collect or send page content. |

## Uzak kod (Remote code)

**No, I am not using remote code.** Tüm JavaScript paketin içinde; `vendor/jspdf.umd.min.js` ve font da
yerel dosya.

## Veri kullanımı (Data usage)

Uzantı geliştiriciye hiçbir veri göndermiyor. Yine de transcript'ler ve seçtiğin sayfaların metni cihazda
saklandığı için temkinli olup şu kutuyu işaretlemeni öneririm:

- [x] **Website content** (web sitesi içeriği)

Diğer kategorilerin hiçbiri işaretlenmez. Üç beyanın üçü de işaretlenir:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

## Görseller (senin hazırlaman gerekiyor)

- **Ekran görüntüsü:** en az 1, en fazla 5 adet; 1280×800 ya da 640×400. Öneri: YouTube kenar paneli,
  arama sonucu, kütüphane, sesli okuma.
- **Küçük tanıtım görseli:** 440×280 (Chrome Web Store'da zorunlu).
- **Simge:** 128×128. Pakette zaten var (`extension/icons/icon128.png`).

## Edge Add-ons

Aynı zip ve aynı metinler kullanılır. Edge formu gizlilik politikası URL'sini ve kısa açıklamayı ister;
izin gerekçeleri için ayrı bir tablo yok, "Notes for certification" alanına yukarıdaki
`declarativeNetRequestWithHostAccess` ve host permission gerekçelerini yapıştırmak incelemeyi hızlandırır.
