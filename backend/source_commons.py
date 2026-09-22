import argparse
import html
import json
import re
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


api_url = "https://commons.wikimedia.org/w/api.php"
queries = [
    "car road India",
    "cars street India",
    "traffic India cars",
    "highway India car",
    "Maruti Suzuki Swift India",
    "Maruti Suzuki Baleno India",
    "Hyundai Creta India",
    "Hyundai Venue India",
    "Tata Nexon India",
    "Mahindra XUV India",
    "Kia Seltos India",
    "Toyota Innova India"
]
allowed_licenses = ("CC BY", "CC-BY", "CC0", "PUBLIC DOMAIN", "PDM")


def clean(value):
    return re.sub(r"<[^>]+>", "", html.unescape(value or "")).strip()


def request_json(params):
    url = f"{api_url}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": "RoadWidthResearchDataset/0.1"})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def candidates_for(query, limit=40):
    data = request_json({
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "iiurlwidth": 1600
    })
    for page in data.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        metadata = info.get("extmetadata", {})
        license_name = clean(metadata.get("LicenseShortName", {}).get("value", ""))
        width = int(info.get("width", 0))
        height = int(info.get("height", 0))
        if not any(item in license_name.upper() for item in allowed_licenses):
            continue
        if width < 900 or height < 500 or not 1.15 <= width / max(height, 1) <= 2.5:
            continue
        yield {
            "title": page.get("title", ""),
            "download_url": info.get("thumburl") or info.get("url"),
            "source_url": info.get("descriptionurl"),
            "license": license_name,
            "artist": clean(metadata.get("Artist", {}).get("value", "Unknown")),
            "credit": clean(metadata.get("Credit", {}).get("value", "")),
            "width": width,
            "height": height,
            "query": query
        }


def download(url, path):
    request = Request(url, headers={"User-Agent": "RoadWidthResearchDataset/0.1"})
    with urlopen(request, timeout=60) as response:
        path.write_bytes(response.read())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=100)
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "dataset" / "inbox")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    seen = set()
    saved = 0
    for query in queries:
        for item in candidates_for(query):
            if saved >= args.count:
                break
            if item["source_url"] in seen or not item["download_url"]:
                continue
            seen.add(item["source_url"])
            extension = Path(item["download_url"].split("?", 1)[0]).suffix.lower()
            if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
                extension = ".jpg"
            filename = f"candidate-{saved + 1:03d}{extension}"
            try:
                download(item["download_url"], args.output / filename)
            except OSError:
                continue
            item["filename"] = filename
            (args.output / f"candidate-{saved + 1:03d}.json").write_text(json.dumps(item, indent=2), encoding="utf-8")
            saved += 1
            print(f"{saved}/{args.count} {item['title']}")
            time.sleep(0.15)
        if saved >= args.count:
            break
    (args.output / "manifest.json").write_text(json.dumps({"count": saved, "items": sorted(seen)}, indent=2), encoding="utf-8")
    print(f"Saved {saved} candidates to {args.output}")


if __name__ == "__main__":
    main()
