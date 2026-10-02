# Talkline

[English](README.md) · **Türkçe**

Bu depoda ortak kodu olmayan iki ayrı ürün var:

1. **[Tarayıcı uzantısı](#tarayıcı-uzantısı)** (Chrome/Edge) — link → aranabilir, tıkla-git yapılabilir transcript + kişisel kütüphane. Özet yok, LLM yok, API anahtarı yok, sunucu yok.
2. **[Claude Code plugin'i](#claude-code-plugini)** — link → transcript → zaman damgalı özet; özeti kendi Claude Code oturumun yazar.

## Tarayıcı uzantısı

`extension/`; bir YouTube videosunu, podcast bölümünü ya da makaleyi arayabileceğin, içinde gezebileceğin ve saklayabileceğin temiz, zaman damgalı bir transcript'e çevirir. Her şey (transcript çekme, kütüphane, notlar, sesli okuma) tarayıcında çalışır.

### Demo

YouTube sayfasında Talkline videonun yanına bir panel, oynatıcı çubuğuna da bir düğme ekler:

![YouTube izleme sayfasında Talkline paneli](store-assets/3-youtube.png)

Transcript görüntüleyici — arama, bölümler, favoriler, notlar, sesli okuma, dışa aktarma:

![Transcript görüntüleyici](store-assets/1-goruntuleyici.png)

Kütüphane — klasörler, favoriler, notlar, yedekleme:

![Kütüphane](store-assets/2-kutuphane.png)

### Yapabildikleri

- **Getir** — altyazısı olan YouTube videoları (elle yazılmış ya da otomatik), transcript yayınlayan podcast'ler (RSS ya da Apple Podcasts linki) ve web makaleleri. Linki popup'a yapıştır, YouTube sayfasındaki paneli kullan ya da sayfaya sağ tıkla → **Talkline: Transcript'i Getir**.
- **Oku ve gez** — transcript içinde ara, herhangi bir zaman damgasına tıklayınca video o saniyeye atlar, bölümler arası atla (video açıklamasından tespit edilir), zaman damgalarını açıp kapat. Olası sponsor/reklam kısımları işaretlenir.
- **Videoyla senkron takip** — video oynarken transcript kendiliğinden kayar ve o an konuşulan yeri vurgular.
- **Sesli okuma** — tarayıcının sesleriyle, 0.25x–2x hızda, kelime kelime vurguyla.
- **Kişisel kütüphane** — getirdiğin her transcript yerelde saklanır; klasörler (kendi ikonun ya da görselinle), favori satırlar, getirdiğin her şeyde arama. "Bunu hatırlıyor musun?" kartı ara sıra eski bir favoriyi hatırlatır.
- **Notlar** — tek bir not sistemi: bir videonun tamamına, tek bir satırına ya da tamamen bağımsız not al; hepsi "Notlarım" sekmesinde.
- **Dışa aktar** — kopyala, `.txt` ya da `.pdf` olarak indir (Türkçe karakterler doğru görünür), ya da bir klasörü Markdown olarak dışa aktar.
- **Yedekle** — tüm kütüphanen tek bir dosyada; başka bir bilgisayarda geri yükle.
- **Açık/koyu tema; Türkçe ve İngilizce arayüz**, tarayıcı dilinden bağımsız.

### Yapamadıkları

- **Altyazı yoksa transcript de yok.** Uzantı sesi yazıya dökmez; hiç altyazısı olmayan YouTube videosunda "Bu videoda altyazı yok." der, podcast'te de yalnızca feed'de [`<podcast:transcript>`](https://podcasting2.org/docs/podcast-namespace/tags/transcript) etiketi varsa çalışır (çoğunda yok). Aşağıdaki plugin sesi bilgisayarında deşifre edebilir.
- **Özet ve çeviri yok** — ikisi de bilinçli olarak çıkarıldı.
- **Spotify yok** (DRM). Podcast'in Apple Podcasts ya da RSS linkini kullan.
- **Cihazlar arası eşitleme yok** — kütüphaneni Yedekle → Geri Yükle ile taşı.
- Podcast ve makalede tıkla-git ve senkron takip yoktur; makalede zaman damgası da yoktur.
- Yalnızca masaüstünde Chrome ve Edge.

### Kurulum (paketlenmemiş)

1. Bu depoyu indir (**Code → Download ZIP**, sonra zip'i aç) ya da klonla.
2. `chrome://extensions` (ya da `edge://extensions`) aç, **Geliştirici modu**'nu aç, **Paketlenmemiş öğe yükle**'ye tıkla, `extension/` klasörünü seç.
3. Bir YouTube videosu aç ve Talkline panelindeki **Transcript'i Getir**'e bas, ya da herhangi bir sayfada araç çubuğu simgesine tıkla.

Denemek için: `https://www.youtube.com/watch?v=rb7TVW77ZCs` (YouTube) ya da `https://feeds.buzzsprout.com/231452.rss` (transcript'li bir podcast feed'i). Elle deneme listesinin tamamı: [docs/deneme-listesi.md](docs/deneme-listesi.md).

Gizlilik: hesap yok, analitik yok, bizim bir sunucumuz yok — bkz. [PRIVACY.md](PRIVACY.md).

## Claude Code plugin'i

**Linki yapıştır, zaman damgalı özeti al.** YouTube videosu, podcast, video sitesi veya makaleden transcript çıkarıp özetleyen bir [Claude Code](https://claude.com/claude-code) plugin'i. API anahtarı yok, n8n yok, ek maliyet yok.

```
/talkline:summarize https://www.youtube.com/watch?v=rb7TVW77ZCs
```

→ genel bir özet ve altında **tıklanabilir `[dd:ss]` bağlantılı**, dakikalara göre kronolojik döküm. 4 dakikalık video ~20 sn, 1,5 saatlik podcast ~40 sn. Gerçek çıktılar: [YouTube örneği](docs/example-youtube.md) · [90 dakikalık podcast örneği](docs/example-podcast.md).

### Kurulum

```
/plugin marketplace add Opporhan/talkline
/plugin install talkline@talkline
```

İlk çalıştırmada gerekli paketler özel bir sanal ortama kurulur (`~/.cache/talkline`, ~1 dk, tek sefer). Sistem Python'una dokunulmaz. Python 3.10+ gerekir (3.12 ve 3.14'te denendi).

### Ne okuyabilir

En hızlı kaynağı dener, otomatik yedeğe düşer:

| Girdi | Transcript nasıl bulunur |
|---|---|
| YouTube | Elle altyazı → otomatik altyazı (önce senin dilin) → yerel deşifre |
| Podcast (RSS, Apple Podcasts linki) | Bölümün [`<podcast:transcript>`](https://podcasting2.org/docs/podcast-namespace/tags/transcript) etiketi → yerel deşifre |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp)'nin desteklediği siteler (1000+) | Site altyazısı → yerel deşifre |
| Makale / web sayfası | Ana metin çıkarımı |
| Yerel ses/video dosyası | Yerel deşifre ([faster-whisper](https://github.com/SYSTRAN/faster-whisper)) |

Deşifre **kendi bilgisayarında** çalışır ve yalnızca hazır transcript yoksa devreye girer. Uzun seste yavaştır — Apple M2'de ölçüm: küçük `tiny` model gerçek sürenin yaklaşık 8 katı hızında, varsayılan `small` daha yavaş ama daha doğru — ve gerektiğinde kurulur. Özet, transcript'in nasıl elde edildiğini her zaman söyler; otomatik üretilmişse uyarır.

### Claude Desktop'ta kullan (terminal ve VS Code gerekmez)

Talkline bir [MCP](https://modelcontextprotocol.io) sunucusu da içerir; Claude masaüstü uygulamasına link yapıştırıp özet isteyebilirsin. Özeti yine Claude yazar, API anahtarı gerekmez.

1. Python 3.10+ kurulu değilse kur; GitHub'da **Code → Download ZIP** ile indirip kalıcı bir klasöre çıkar.
2. Claude Desktop'ta **Settings → Developer → Edit Config**'i aç ve ekle (gerçek yolu yaz; Windows'ta `python3` yerine `python`):

```json
{
  "mcpServers": {
    "talkline": {
      "command": "python3",
      "args": ["/yol/talkline/skills/summarize/mcp_server.py"]
    }
  }
}
```

3. Claude Desktop'ı yeniden başlat. İlk açılışta bağımlılıklar kurulur (~1 dk). Sonra sadece şunu yaz: *"Şu videoyu özetle: https://www.youtube.com/watch?v=…"*.

### Betiği tek başına kullan

```
python3 skills/summarize/transcript.py "<link ya da dosya>" [--lang tr,en] [--episode 0] [--whisper-model small]
```

Transcript'i `[dd:ss] metin` blokları olarak yazdırır (uzun olanlar parça dosyalarına bölünür). Sonuçlar link başına önbelleğe alınır.

### Yapamadıkları (dürüstçe)

- **DRM'li / girişli içerik:** Spotify, Netflix, özel veya bölge kısıtlı videolar. Spotify yerine podcast'in Apple Podcasts ya da RSS linkini kullan.
- **yt-dlp'nin çözemediği siteler** (bazen bozulur; örn. TED). Talkline sayfa metnine düşer ve *"bu videonun transkripti DEĞİL"* diye işaretler.
- YouTube bulut/VPN IP'lerini engelleyebilir; kendi bilgisayarında çalıştır.
- "Ücretsiz": ek API anahtarı veya fatura yok; özeti kendi Claude Code oturumun yazar ve plan kullanımına sayılır.
- Okuduğun sitelerin kullanım şartlarına uy; kişisel kullanım içindir.

### Benzerlerinden farkı

"Link → özet" yapan başka Claude Code skill'leri zaten var ([audio-tldr-skill](https://github.com/AugustusW/audio-tldr-skill), [claude-video](https://github.com/bradautomates/claude-video), [youtube-transcriber](https://github.com/lifesized/youtube-transcriber) ve diğerleri). Talkline'ın farkı, **her tür link için tek, küçük ve güvenilir bir yol** olması — hazır transcript'i olan podcast'ler ve Apple Podcasts linkleri dahil — özel otomatik kurulum, anlaşılır hata mesajları ve her zaman zaman damgası taşıyan, kaynak metnin ne kadar güvenilir olduğunu söyleyen özetlerle.

## Geliştirme

```
node extension/test.mjs        # uzantının mantık testleri
python3 -m venv .venv && .venv/bin/pip install -r skills/summarize/requirements.txt pytest ruff
.venv/bin/pytest -q && .venv/bin/ruff check .
claude --plugin-dir .          # plugin'i yerelde dene
```

MIT lisanslı.
