# Talkline

[English](README.md) · **Türkçe**

Bir YouTube videosunu, podcast bölümünü ya da makaleyi arayabileceğin, içinde gezebileceğin ve saklayabileceğin temiz, zaman damgalı bir transcript'e çeviren Chrome/Edge uzantısı. Her şey (transcript çekme, kütüphane, notlar, sesli okuma) tarayıcında çalışır: hesap yok, API anahtarı yok, sunucu yok.

## Demo

YouTube sayfasında Talkline videonun yanına bir panel, oynatıcı çubuğuna da bir düğme ekler:

![YouTube izleme sayfasında Talkline paneli](store-assets/3-youtube.png)

Transcript görüntüleyici — arama, bölümler, favoriler, notlar, sesli okuma, dışa aktarma:

![Transcript görüntüleyici](store-assets/1-goruntuleyici.png)

Kütüphane — klasörler, favoriler, notlar, yedekleme:

![Kütüphane](store-assets/2-kutuphane.png)

## Yapabildikleri

- **Getir** — altyazısı olan YouTube videoları (elle yazılmış ya da otomatik), transcript yayınlayan podcast'ler (RSS ya da Apple Podcasts linki) ve web makaleleri. Linki popup'a yapıştır, YouTube sayfasındaki paneli kullan ya da sayfaya sağ tıkla → **Talkline: Transcript'i Getir**.
- **Oku ve gez** — transcript içinde ara, herhangi bir zaman damgasına tıklayınca video o saniyeye atlar, bölümler arası atla (video açıklamasından tespit edilir), zaman damgalarını açıp kapat. Olası sponsor/reklam kısımları işaretlenir.
- **Videoyla senkron takip** — video oynarken transcript kendiliğinden kayar ve o an konuşulan yeri vurgular.
- **Sesli okuma** — tarayıcının sesleriyle, 0.25x–2x hızda, kelime kelime vurguyla.
- **Kişisel kütüphane** — getirdiğin her transcript yerelde saklanır; klasörler (kendi ikonun ya da görselinle), favori satırlar, getirdiğin her şeyde arama. "Bunu hatırlıyor musun?" kartı ara sıra eski bir favoriyi hatırlatır.
- **Notlar** — tek bir not sistemi: bir videonun tamamına, tek bir satırına ya da tamamen bağımsız not al; hepsi "Notlarım" sekmesinde.
- **Dışa aktar** — kopyala, `.txt` ya da `.pdf` olarak indir (Türkçe karakterler doğru görünür), ya da bir klasörü Markdown olarak dışa aktar.
- **Yedekle** — tüm kütüphanen tek bir dosyada; başka bir bilgisayarda geri yükle.
- **Açık/koyu tema; Türkçe ve İngilizce arayüz**, tarayıcı dilinden bağımsız.

## Yapamadıkları

- **Altyazı yoksa transcript de yok.** Uzantı sesi yazıya dökmez. Hiç altyazısı olmayan YouTube videosunda "altyazı yok" hatası verir, podcast'te de yalnızca feed'de [`<podcast:transcript>`](https://podcasting2.org/docs/podcast-namespace/tags/transcript) etiketi varsa çalışır (çoğunda yok).
- **Özet ve çeviri yok.** Transcript hangi dildeyse o dilde kalır.
- **Spotify yok** (DRM). Podcast'in Apple Podcasts ya da RSS linkini kullan.
- **Cihazlar arası eşitleme yok.** Kütüphaneni Yedekle → Geri Yükle ile taşı.
- **Podcast ve makalede** tıkla-git ve senkron takip yoktur; makalede zaman damgası da yoktur.
- **Hata mesajları** şimdilik yalnızca Türkçe.
- **Yalnızca masaüstünde Chrome ve Edge.**

## Kurulum

1. Bu depoyu indir (**Code → Download ZIP**, sonra zip'i aç) ya da klonla.
2. `chrome://extensions` (ya da `edge://extensions`) aç, **Geliştirici modu**'nu aç, **Paketlenmemiş öğe yükle**'ye tıkla ve `extension/` klasörünü seç.
3. Bir YouTube videosu aç ve Talkline panelindeki **Transcript'i Getir**'e bas, ya da herhangi bir sayfada araç çubuğu simgesine tıkla.

Denemek için linkler:

| Tür | Link |
|---|---|
| YouTube | `https://www.youtube.com/watch?v=rb7TVW77ZCs` |
| Transcript'li podcast feed'i | `https://feeds.buzzsprout.com/231452.rss` |

## Gizlilik

Hesap yok, analitik yok, bizim bir sunucumuz yok. İstekler tarayıcından doğrudan istediğin siteye gider, kaydettiğin her şey tarayıcında kalır. Ayrıntılar: [PRIVACY.md](PRIVACY.md).

## Geliştirme

```
node extension/test.mjs              # mantık testleri
python3 scripts/build_store_zip.py   # mağaza paketi → dist/
```

- Elle deneme listesi: [docs/deneme-listesi.md](docs/deneme-listesi.md)
- Mağaza metinleri ve izin gerekçeleri: [docs/store-listing.md](docs/store-listing.md)

## Bu depoda ayrıca

Bir linkten zaman damgalı özet yazan ayrı bir [Claude Code plugin'i](skills/summarize/README.tr.md). Uzantıyla ortak kodu yoktur.

## Lisans

[MIT](LICENSE)
