#!/usr/bin/env python3
"""Chrome Web Store / Edge Add-ons için yüklenecek zip'i üretir: dist/talkline-<sürüm>.zip

- manifest.json'dan `key` çıkarılır (yalnızca geliştirmede uzantı kimliğini sabitlemek için var;
  mağaza kendi anahtarını atıyor).
- Test dosyaları ve gizli dosyalar (.DS_Store vb.) pakete girmez.
Çalıştır: python3 scripts/build_store_zip.py
"""

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXT = ROOT / "extension"
EXCLUDE = {"test.mjs"}


def main() -> None:
    manifest = json.loads((EXT / "manifest.json").read_text(encoding="utf-8"))
    manifest.pop("key", None)
    out = ROOT / "dist" / f"talkline-{manifest['version']}.zip"
    out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        for f in sorted(EXT.rglob("*")):
            rel = f.relative_to(EXT)
            if f.is_dir() or rel.name == "manifest.json" or rel.name in EXCLUDE:
                continue
            if any(p.startswith(".") or p == "__pycache__" for p in rel.parts):
                continue
            z.write(f, rel.as_posix())
    print(out)


if __name__ == "__main__":
    main()
