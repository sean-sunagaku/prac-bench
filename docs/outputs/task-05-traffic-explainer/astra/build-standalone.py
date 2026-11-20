"""Run python3 build-standalone.py to package the editable site as one offline HTML file."""

import base64
import re
from pathlib import Path

root = Path(__file__).resolve().parent
page = (root / "index.html").read_text(encoding="utf-8")
style = (root / "styles.css").read_text(encoding="utf-8")
license_text = (root / "assets/dm-sans-license.txt").read_text(encoding="utf-8")
page = page.replace('<link rel="stylesheet" href="styles.css">',
                    f"<style>\n{style}\n/* Bundled DM Sans license\n{license_text}\n*/\n</style>")
page = re.sub(r'  <link rel="preload"[^>]+>\n', "", page)

# Inline scripts at the end of the body to preserve deferred dependency order.
scripts = re.findall(r'  <script src="([^"]+)" defer></script>\n', page)
page = re.sub(r'  <script src="[^"]+" defer></script>\n', "", page)
inline = "\n".join("<script>\n" + (root / name).read_text(encoding="utf-8") + "\n</script>" for name in scripts)
page = page.replace("</body>", inline + "\n</body>")

mime_types = {"webp": "image/webp", "png": "image/png", "woff2": "font/woff2"}
for asset in set(re.findall(r'assets/[\w.-]+\.(?:webp|png|woff2)', page)):
    encoded = base64.b64encode((root / asset).read_bytes()).decode("ascii")
    media_type = mime_types[Path(asset).suffix[1:]]
    page = page.replace(asset, f"data:{media_type};base64,{encoded}")

(root / "flow-lab.html").write_text(page, encoding="utf-8")
