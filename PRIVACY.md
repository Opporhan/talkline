# Talkline browser extension — Privacy Policy

_Last updated: 2026-10-02_ · [Türkçe aşağıda](#türkçe)

Talkline turns a YouTube video, podcast episode or article into a searchable, timestamped transcript.
It has **no account, no analytics, no ads and no server of its own**. The developer receives no data.

## What is stored, and where

Everything you create stays in your browser's extension storage (`chrome.storage.local`) on your device:
transcripts you fetch, favorites, folders (including icons/images you upload), notes and your
text-to-speech voice choice. It is never sent to the developer. Removing the extension deletes it.
The backup feature writes a file only when you click it, to a place you choose.

Two small preferences — light/dark theme and interface language — are saved with `chrome.storage.sync`,
so your browser can carry them to your other devices if you use browser sync. This is handled by your
browser vendor (Google/Microsoft), not by Talkline.

## Network requests

Talkline only makes requests needed to get the transcript you asked for, directly from your browser:

- **YouTube** (`www.youtube.com`): the video's caption track, title, length and description (for chapters).
- **Podcasts**: the podcast's RSS feed and transcript file; for Apple Podcasts links, Apple's public
  lookup service (`itunes.apple.com`) to find the feed.
- **Articles / other links**: the page you asked for, to read its text.

These requests go straight to those sites, as when you visit them yourself; their own privacy policies apply.

## On-device features

Language detection and text-to-speech use your browser's built-in APIs. Voices marked 🌐 are online voices
provided by your browser/OS vendor; if you pick one, your browser sends the text being read to that vendor.

## Contact

Questions: <https://github.com/Opporhan/talkline/issues>

---

## Türkçe

Talkline; bir YouTube videosunu, podcast bölümünü ya da makaleyi aranabilir, zaman damgalı bir transcript'e
çevirir. **Hesap, analitik, reklam ve kendine ait bir sunucu yoktur.** Geliştiriciye hiçbir veri gelmez.

**Saklanan veriler:** Getirdiğin transcript'ler, favoriler, klasörler (yüklediğin ikon/görseller dahil),
notlar ve sesli okuma ses tercihi yalnızca tarayıcının uzantı deposunda
(`chrome.storage.local`), senin cihazında durur; geliştiriciye gönderilmez. Uzantıyı kaldırınca silinir.
Yedekleme yalnızca sen tıkladığında, seçtiğin yere bir dosya yazar. Tema ve arayüz dili tercihleri
`chrome.storage.sync` ile saklanır; tarayıcı eşitlemesi açıksa tarayıcın (Google/Microsoft) bunları diğer
cihazlarına taşır.

**Ağ istekleri:** Yalnızca istediğin transcript için, doğrudan tarayıcından: YouTube (altyazı, başlık, süre,
bölümler için açıklama), podcast RSS'i ve transcript dosyası (Apple Podcasts linklerinde akışı bulmak için
`itunes.apple.com`), makalelerde istediğin sayfanın kendisi. Bu istekler doğrudan o sitelere gider; o sitelerin kendi
gizlilik politikaları geçerlidir.

**Cihaz üzerindeki özellikler:** Dil tespiti ve sesli okuma tarayıcının yerleşik API'lerini kullanır. 🌐 ile
işaretli sesler tarayıcı/işletim sistemi sağlayıcısının çevrimiçi sesleridir; birini seçersen okunan metin
tarayıcın tarafından o sağlayıcıya gönderilir.

**İletişim:** <https://github.com/Opporhan/talkline/issues>
