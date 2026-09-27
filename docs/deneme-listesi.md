# Talkline — deneme listesi

Yayından önce Chrome'da ve Edge'de birer kez baştan sona dene (~15 dk). Her maddede "beklenen"
olmazsa: hangi madde, hangi tarayıcı, hangi link ve ekrandaki hata mesajını not al.

**Kurulum:** Mağaza linkinden kur. Geliştiriciysen `extension/` klasörünü "Paketlenmemiş öğe yükle"
ile de kurabilirsin.

## 1. YouTube
- [ ] Altyazılı bir video aç (ör. https://www.youtube.com/watch?v=rb7TVW77ZCs).
      **Beklenen:** Sağ sütunun en üstünde "Talkline" paneli ve **Transcript'i Getir** düğmesi.
- [ ] **Transcript'i Getir**'e bas. **Beklenen:** Birkaç saniyede transcript panelin içinde açılır.
- [ ] Oynatıcının sağ altındaki belge simgesine bas (altyazı/ayarlar düğmelerinin yanı).
      **Beklenen:** Panel kapanır; tekrar basınca açılır.
- [ ] Transcript'te bir zaman damgasına tıkla. **Beklenen:** Video o saniyeye atlar.
- [ ] Videoyu oynat. **Beklenen:** Transcript kendiliğinden kayar, konuşulan satır vurgulanır.
- [ ] Başka bir videoya geç (sayfayı yenilemeden, önerilenlerden tıklayarak).
      **Beklenen:** Panel yeni videoya göre güncellenir.
- [ ] Altyazısı olmayan bir video dene. **Beklenen:** Anlaşılır bir "Bu videoda altyazı yok." mesajı
      (çökme ya da boş panel değil).
- [ ] Pencereyi iyice daralt (YouTube sağ sütunu gizleyince). **Beklenen:** Oynatıcı düğmesi yerinde
      kalır; basınca transcript yeni sekmede açılır.

## 2. Popup ve sağ tık
- [ ] Bir YouTube sayfasında araç çubuğundaki Talkline simgesine bas. **Beklenen:** Link kutusu
      dolu gelir; **Transcript'i Getir** çalışır.
- [ ] Bir makale sayfasında (ör. bir haber yazısı) sayfaya sağ tıkla → **Talkline: Transcript'i Getir**.
      **Beklenen:** Makalenin metni yeni sekmede açılır, bir bildirim çıkar.
- [ ] Bir podcast RSS linki ya da Apple Podcasts bölüm linki yapıştır. **Beklenen:** Transcript'i
      varsa açılır; yoksa ne yapılabileceğini anlatan bir mesaj çıkar.

## 3. Görüntüleyici (transcript sayfası)
- [ ] Başlığın altında süre ve dil yazar (ör. "04:35 · Türkçe").
- [ ] Arama kutusuna bir kelime yaz. **Beklenen:** Eşleşen satırlar kalır, kelime vurgulanır.
- [ ] Bir satırı yıldızla (☆). **Beklenen:** "Favorilere eklendi ★" bildirimi; **Sadece Favoriler** yalnız onu gösterir.
- [ ] **Zaman Damgaları**'nı aç/kapat.
- [ ] **Not**'a bir şey yaz, sayfayı kapatıp aç. **Beklenen:** Not duruyor.
- [ ] **Sesli Oku**: 1x varsayılan; hızı değiştir (0.25x–2x); okunan kelime vurgulanır; ⏹ durdurur.
- [ ] **Transcript'i Kopyala** ve **İndir** → TXT ve PDF. **Beklenen:** PDF'te Türkçe karakterler
      (ı ş ğ ü ö ç İ) doğru görünür.
- [ ] **Dosyaya Taşı** ile bir klasöre koy.

## 4. Kütüphane
- [ ] Popup'tan **Kütüphane**'yi aç. **Beklenen:** Getirdiğin her şey listede; arama çalışır.
- [ ] Bir klasör oluştur, ikon/görsel seç, bir video taşı.
- [ ] **Notlarım** sekmesi: görüntüleyicide yazdığın not burada.
- [ ] Klasörde **⬇ Markdown olarak indir** çalışır.
- [ ] **Yedekle** → bir dosya iner. **Geri Yükle** ile aynı dosyayı yükle. **Beklenen:** Hiçbir şey kaybolmaz.
- [ ] Açık/koyu tema ve TR/EN dil düğmesi tüm sayfalarda çalışır.

## 5. Eski sürümden gelenler (skimcast → Talkline)
- [ ] Eski sürümde getirdiğin videolar, favoriler, klasörler ve notlar Talkline'da da duruyor.
- [ ] Eski sürümde aldığın bir yedek dosyası **Geri Yükle** ile açılıyor.

## Hata bildirirken
Tarayıcı + sürümü, madde numarası, denediğin link, ekrandaki mesaj. YouTube sayfasındaysa F12 →
Console'daki kırmızı satırların ekran görüntüsü. Bildirim yeri:
https://github.com/Opporhan/talkline/issues
