# Talkline

**English** · [Türkçe](README.tr.md)

A Chrome/Edge extension that turns a YouTube video, podcast episode or article into a clean, timestamped transcript you can search, navigate and keep. Everything (fetching, library, notes, read-aloud) runs in your browser: no account, no API key, no server.

## Demo

On a YouTube page, Talkline adds a panel next to the video and a button in the player bar:

![Talkline panel on a YouTube watch page](store-assets/3-youtube.png)

The transcript viewer — search, chapters, favorites, notes, read aloud, export:

![Transcript viewer](store-assets/1-goruntuleyici.png)

The library — folders, favorites, notes, backup:

![Library](store-assets/2-kutuphane.png)

## What it can do

- **Fetch** — YouTube videos that have captions (manual or auto-generated), podcasts that publish a transcript (RSS feed or Apple Podcasts link), and web articles. Paste a link in the popup, use the panel on the YouTube page, or right-click a page → **Talkline: Get Transcript**.
- **Read & navigate** — search inside the transcript, click any timestamp to jump the video to that second, jump between chapters (detected from the video description), toggle timestamps. Likely sponsor segments are flagged.
- **Follow along with the video** — while the video plays, the transcript scrolls and highlights what is being spoken.
- **Read aloud** — your browser's voices, 0.25x–2x, with word-by-word highlighting.
- **Personal library** — every transcript you fetch is saved locally; folders (with your own icon or image), favorite lines, search across everything. A "remember this?" card occasionally resurfaces an old favorite.
- **Notes** — one notes system: a note on a whole video, on one line, or free-standing, all in the "My Notes" tab.
- **Export** — copy, download as `.txt` or `.pdf` (Turkish/accented characters render correctly), or export a folder as Markdown.
- **Back up** — one file holds your whole library; restore it on another machine.
- **Light/dark theme; Turkish and English interface**, independent of your browser's language.

## What it can't do

- **No captions, no transcript.** The extension does not do speech-to-text. A YouTube video without any captions gives a "no captions" error, and a podcast only works if its feed carries a [`<podcast:transcript>`](https://podcasting2.org/docs/podcast-namespace/tags/transcript) tag (most don't).
- **No summaries, no translation.** The transcript stays in its original language.
- **No Spotify** (DRM). Use the podcast's Apple Podcasts or RSS link.
- **No sync between devices.** Move your library with Back up → Restore.
- **Podcasts and articles** have no click-to-jump or follow-along; articles have no timestamps.
- **Error messages** are currently in Turkish only.
- **Desktop Chrome and Edge only.**

## Install

1. Download this repo (**Code → Download ZIP**, then unzip) or clone it.
2. Open `chrome://extensions` (or `edge://extensions`), enable **Developer mode**, click **Load unpacked** and select the `extension/` folder.
3. Open a YouTube video and click **Get transcript** in the Talkline panel, or click the toolbar icon on any page.

Links to try:

| Type | Link |
|---|---|
| YouTube | `https://www.youtube.com/watch?v=rb7TVW77ZCs` |
| Podcast feed with transcripts | `https://feeds.buzzsprout.com/231452.rss` |

## Privacy

No account, no analytics, no server of ours. Requests go straight from your browser to the site you asked for, and everything you save stays in your browser. Details: [PRIVACY.md](PRIVACY.md).

## Develop

```
node extension/test.mjs              # logic tests
python3 scripts/build_store_zip.py   # store package → dist/
```

- Manual test checklist: [docs/deneme-listesi.md](docs/deneme-listesi.md) (Turkish)
- Store listing texts and permission justifications: [docs/store-listing.md](docs/store-listing.md)

## Also in this repo

A separate [Claude Code plugin](skills/summarize/README.md) that writes a timestamped summary from a link. It shares no code with the extension.

## License

[MIT](LICENSE)
