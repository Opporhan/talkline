// Saf mantık fonksiyonlarının (fetch/DOM gerektirmeyen) testleri. Çalıştır: node extension/test.mjs
// background.js/viewer.js/library.js'in tamamını import edemeyiz (chrome.* global'lerine ihtiyaç
// duyuyorlar); bu yüzden saf fonksiyonları kaynaktan çıkarıp izole çalıştırıyoruz. Python tarafındaki
// (tests/test_transcript.py) aynı senaryoların JS karşılığı.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

// Bir kaynak dosyadan isimle fonksiyon çıkarıp izole bir modül olarak çalıştırır. `preamble` o
// fonksiyonların ihtiyaç duyduğu üst düzey const'ları (regex'ler vb.) elle sağlar — kaynaktan otomatik
// çıkarmak (ör. çok satırlı bir const ifadesi) kırılgan olurdu.
async function extract(file, names, preamble = "") {
  const src = fs.readFileSync(path.join(dir, file), "utf8");
  let code = preamble;
  for (const n of names) {
    // Önce TEK SATIRLIK bir fonksiyon mu diye bakıyoruz (ör. "function isLikelyAd(t) { ... }\n") — bunu
    // atlayıp çok satırlı deseni (\n}\n ile biten) doğrudan denersek, tek satırlık gövdenin kendi kapanış
    // parantezini "\n}\n" sanmayıp bir SONRAKİ fonksiyonun sonuna kadar aç gözlü eşleşip iki fonksiyonu
    // birden yakalıyordu (ör. isLikelyAd + hemen altındaki jumpUrl) — "zaten tanımlı" hatasına yol açıyordu.
    const singleLine = src.match(new RegExp(`function ${n}\\([^\\n]*\\)\\s*\\{[^\\n]*\\}\\n`));
    const m = singleLine || src.match(new RegExp(`function ${n}\\([\\s\\S]*?\\n}\\n`));
    if (!m) throw new Error(`${file}: bulunamadı: ${n}`);
    code += m[0] + "\n";
  }
  const tmpMod = path.join(dir, `.test-${path.basename(file)}.mjs`);
  fs.writeFileSync(tmpMod, code + "\nexport {" + names.join(",") + "};\n");
  try {
    return await import(`file://${tmpMod}?t=${Date.now()}`);
  } finally {
    fs.unlinkSync(tmpMod);
  }
}

let totalFns = 0;

// ================================================================== background.js
{
  const src = fs.readFileSync(path.join(dir, "background.js"), "utf8");
  const names = [
    "fmtTime", "toBlocks", "youtubeId", "parseSubtitles", "parsePodcastJson",
    "hashString", "stableId", "parseTimeLabel", "stripNonSpeech", "parseTimedBlocks",
    "blocksFromNative",
    "pickCaptionTrack", "decodeEntities", "parseCaptionXml", "blocksWithWords",
  ];
  const preamble = "const BLOCK_SECONDS = 30;\nconst YT_ID_RE = " + src.match(/const YT_ID_RE = (.+);/)[1] + ";\n" +
    "const NON_SPEECH_RE = " + src.match(/const NON_SPEECH_RE = (.+);/)[1] + ";\n";
  const {
    fmtTime, toBlocks, youtubeId, parseSubtitles, parsePodcastJson,
    hashString, stableId, parseTimeLabel, stripNonSpeech, parseTimedBlocks, blocksFromNative,
    pickCaptionTrack, parseCaptionXml, blocksWithWords,
  } = await extract("background.js", names, preamble);
  totalFns += names.length;

  assert.equal(fmtTime(65), "01:05");
  assert.equal(fmtTime(3725), "1:02:05");

  for (const u of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5",
    "https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
  ]) assert.equal(youtubeId(u), "dQw4w9WgXcQ", u);
  assert.equal(youtubeId("https://example.com/watch?v=x"), null);

  const srt = "1\n00:00:01,000 --> 00:00:04,000\nMerhaba arkadaşlar.\n\n2\n00:00:04,500 --> 00:00:09,000\nBugün <i>aşılardan</i> bahsedeceğiz.\n";
  assert.deepEqual(parseSubtitles(srt), [[1, "Merhaba arkadaşlar."], [4.5, "Bugün aşılardan bahsedeceğiz."]]);

  const vtt1 = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nfirst line\n\n00:00:02.000 --> 00:00:04.000\nfirst line\n\n00:00:04.000 --> 00:00:06.000\n<c>second</c> line\n";
  assert.deepEqual(parseSubtitles(vtt1), [[0, "first line"], [4, "second line"]]);
  const vtt2 = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nline one\nline two\n\n00:00:02.000 --> 00:00:04.000\nline two\nline three\n";
  assert.deepEqual(parseSubtitles(vtt2), [[0, "line one line two"], [2, "line three"]]);

  const segs = Array.from({ length: 14 }, (_, i) => [i * 5, `cümle ${i}.`]);
  const blocks = toBlocks(segs);
  assert.ok(blocks[0].startsWith("[00:00] cümle 0."));
  assert.ok(blocks.length >= 2);
  assert.ok(blocks.at(-1).includes("cümle 13."));

  assert.deepEqual(
    parsePodcastJson(JSON.stringify({ segments: [{ startTime: 1, body: "a" }, { startTime: 2.5, body: "b" }] })),
    [[1, "a"], [2.5, "b"]]
  );

  assert.equal(stableId("https://youtu.be/dQw4w9WgXcQ?si=abc"), "yt:dQw4w9WgXcQ");
  assert.equal(stableId("https://example.com/a"), stableId("https://example.com/a")); // aynı link -> aynı kimlik
  assert.notEqual(stableId("https://example.com/a"), stableId("https://example.com/b"));
  assert.equal(hashString("abc"), hashString("abc"));
  assert.notEqual(hashString("abc"), hashString("abd"));

  assert.equal(parseTimeLabel("01:05"), 65);
  assert.equal(parseTimeLabel("1:02:05"), 3725);

  assert.deepEqual(
    parseTimedBlocks("[00:05] merhaba dünya\n[1:02:05] ikinci blok\nzaman damgasız satır"),
    [{ sec: 5, text: "merhaba dünya" }, { sec: 3725, text: "ikinci blok" }, { sec: null, text: "zaman damgasız satır" }]
  );

  assert.equal(stripNonSpeech("(müzik) merhaba (alkış) dünya"), "merhaba dünya");
  assert.equal(stripNonSpeech("[Music]"), "");
  assert.deepEqual(
    parseTimedBlocks("[00:05] merhaba dünya\n[00:10] (müzik)\n[00:15] devam ediyor"),
    [{ sec: 5, text: "merhaba dünya" }, { sec: 15, text: "devam ediyor" }] // sadece "(müzik)" olan blok tamamen düşer
  );

  // blocksFromNative: YouTube yolundan gelen ham blok+kelime-grubu listesini temizler (videoyla kelime
  // kelime senkron takip için).
  const raw = [
    { sec: 0, text: "merhaba dünya", words: [[0, "merhaba"], [0.5, "dünya"]] },
    { sec: 10, text: "(müzik)", words: [[10, "(müzik)"]] }, // tamamen etiketten ibaret blok tamamen düşmeli
    { sec: 20, text: "devam (alkış) ediyor", words: [[20, "devam"], [20.5, "(alkış)"], [21, "ediyor"]] },
  ];
  const cleaned = blocksFromNative(raw);
  assert.equal(cleaned.length, 2, "sadece (müzik) olan blok düşmeli");
  assert.deepEqual(cleaned[0], { sec: 0, text: "merhaba dünya", words: [{ sec: 0, text: "merhaba" }, { sec: 0.5, text: "dünya" }] });
  assert.equal(cleaned[1].text, "devam ediyor");
  assert.deepEqual(cleaned[1].words.map((w) => w.text), ["devam", "ediyor"]); // (alkış) kelime grubu da düşmeli
  assert.equal(blocksFromNative(undefined).length, 0); // rawBlocks hiç gelmezse çökmemeli

  // pickCaptionTrack: transcript.py'deki _pick_track ile aynı öncelik (elle > otomatik, sonra dil sırası).
  const tr = (languageCode, kind) => ({ languageCode, kind });
  assert.equal(pickCaptionTrack([tr("en", "asr"), tr("tr"), tr("en")], ["tr", "en"]).languageCode, "tr");
  assert.equal(pickCaptionTrack([tr("en", "asr"), tr("de")], ["tr", "en"]).languageCode, "de"); // elle, dil dışı
  assert.equal(pickCaptionTrack([tr("fr", "asr"), tr("en-US", "asr")], ["tr", "en"]).languageCode, "en-US");
  assert.equal(pickCaptionTrack([], ["tr"]), null);

  // parseCaptionXml: YouTube'un <text start=..> XML'i; çift kaçışlı varlıklar ve iç etiketler.
  assert.deepEqual(
    parseCaptionXml('<transcript><text start="5.3" dur="1">it&amp;#39;s &lt;b&gt;ok</text>' +
      '<text start="7" dur="1"><font color="#fff">a &amp;amp; b</font></text><text start="9" dur="1"> </text></transcript>'),
    [[5.3, "it's ok"], [7, "a & b"]],
  );

  // blocksWithWords: transcript.py'nin to_blocks'uyla aynı birleştirme; ham segmentler words'te.
  const bw = blocksWithWords([[0, "bir."], [10, "iki"], [31, "üç."], [40, "dört"]]);
  assert.deepEqual(bw.map((b) => [b.sec, b.text]), [[0, "bir. iki üç."], [40, "dört"]]);
  assert.deepEqual(bw[0].words, [[0, "bir."], [10, "iki"], [31, "üç."]]);
}

// ================================================================== viewer.js (reklam tespiti + kelime takibi)
{
  const names = [
    "escapeHtml", "fmtTime", "isLikelyAd", "jumpUrl", "wordsHtml", "wordIndexAtChar",
  ];
  const preamble = `
const AD_PATTERNS = [
  /\\bsponsor(lu|luk|luğunda|ed)?\\b/i,
  /(bu (video|bölüm)\\w*|this (video|episode))\\s+.{0,40}(sponsorluğunda|tarafından sunul\\w*|destekle\\w*|is sponsored by|brought to you by)/i,
  /\\btoday'?s sponsor\\b/i,
  /\\buse (code|promo code)\\b/i,
  /\\bindirim kodu\\b/i,
  /\\baffiliate link\\b/i,
  /\\bpartnered with\\b/i,
  /\\bpaid partnership\\b/i,
  /\\bthanks to .{0,30} for sponsoring\\b/i,
];
`;
  const {
    escapeHtml, fmtTime, isLikelyAd, jumpUrl, wordsHtml, wordIndexAtChar,
  } = await extract("viewer.js", names, preamble);
  totalFns += names.length;

  assert.equal(escapeHtml(`<b>&"'`), "&lt;b&gt;&amp;&quot;&#39;");
  assert.equal(fmtTime(125), "02:05");
  assert.ok(isLikelyAd("this video is sponsored by Acme"));
  assert.ok(isLikelyAd("bu video Acme sponsorluğunda hazırlandı"));
  assert.ok(!isLikelyAd("bugün hava çok güzel"));
  assert.equal(jumpUrl({ linkPrefix: "https://youtu.be/x?t=" }, 65), "https://youtu.be/x?t=65");
  assert.equal(jumpUrl({}, 65), null);
  assert.equal(jumpUrl({ linkPrefix: "https://youtu.be/x?t=" }, null), null);

  // wordsHtml/wordIndexAtChar: kelime kelime vurgulama alt yapısı — kelime sayısı ve karakter->indeks eşlemesi.
  const html = wordsHtml("Hello world");
  assert.equal((html.match(/class="word"/g) || []).length, 2);
  assert.equal(wordIndexAtChar("Hello world", 0), 0);
  assert.equal(wordIndexAtChar("Hello world", 6), 1);
  assert.equal(wordIndexAtChar("Hello world", 20), 1); // metin sonunu aşarsa son kelimede kalmalı
}

console.log(`Tüm mantık testleri geçti (${totalFns} fonksiyon doğrulandı: background.js + viewer.js).`);
