"""
Membuat data/products.json dari file export Shopee Seller Centre.

Cara pakai (setiap kali produk di Shopee berubah):
  1. Shopee Seller Centre > Produk Saya > Update Massal > download:
     - Info Dasar (basic_info), Info Penjualan (sales_info),
       Info Media (media_info), Info Pengiriman (dts_info)
  2. Simpan semua file .xlsx dalam satu folder.
  3. Jalankan:  python tools/build_products.py "C:/path/ke/folder/export"
  4. Upload perubahan ke GitHub (git add . && git commit -m "update produk" && git push)

Butuh: pip install python-calamine
"""
import glob
import json
import os
import re
import sys
from datetime import date

from python_calamine import CalamineWorkbook

SHOP_ID = "22381416"
DATA_START_ROW = 6  # baris 0-5 adalah header / petunjuk Shopee

# Kategori yang tidak ditampilkan di website (bukan produk otomotif)
EXCLUDE_PREFIXES = ("Food & Beverages", "Stationery")

# Urutan aturan penting: yang lebih spesifik di atas.
KEYWORD_RULES = [
    ("filter", r"\bfilter\b|saringan"),
    ("rem", r"kampas rem|brake|master rem|\brem\b|disc pad|tromol|piringan|caliper|minyak rem"),
    ("lampu", r"mika|lampu|bohlam|\bdop\b|\bled\b|halogen|sein|stop lamp|head ?lamp|fog ?lamp"),
    ("wiper", r"wiper|washer"),
    ("kopling", r"juen|kopel|cross joint|kres |kopling|clutch|matahari|transmisi|persneling|cv ?joint|\bas roda|kruis|propeller|gardan|release bearing|dekrup"),
    ("kaki", r"sunduk|center bolt|bos per|pen per|anting per|shock|tie ?rod|ball ?joint|long ?tie|rack ?end|stabil|link|bushing|per daun|suspensi|arm|velg|ban\b|mur roda|baut roda|hub"),
    ("bearing", r"bearing|laher|seal|oil ?seal|sil "),
    ("belt", r"v-?belt|fan ?belt|tali kipas|timing belt|selang|pulley|tensioner|idler"),
    ("radiator", r"water outlet|radiator|water ?pump|thermostat|termostat|kipas|extra ?fan|\bac\b|kompresor|blower|evaporator|coolant"),
    ("kelistrikan", r"delco|delko|platina|rotor|flasher|flaser|aki|busi|coil|klakson|horn|relay|sensor|switch|saklar|alternator|dinamo|starter|kabel|soket|sekring|fuse|regulator|cdi"),
    ("oli", r"\boli\b|grease|gemuk|pelumas|fluid|\batf\b|minyak"),
    ("body", r"spion|mirror|bemper|garnis|handel|handle|grill|bumper|emblem|logo|kaca|engsel|kunci|lock|karpet|cover|sticker|stiker|pedal|tutup tangki"),
    ("mesin", r"packing|gasket|piston|ring|klep|valve|rocker|noken|camshaft|crank|karburator|injektor|injector|pompa|knalpot|tangki|mounting|engine|mesin|karet"),
    ("perawatan", r"poles|polish|coating|semir|shampo|cleaner|pembersih|lap|kanebo|amplas|kunci|obeng|tang|alat"),
]

CATEGORY_RULES = [
    ("rem", "Brake System"),
    ("lampu", "Lighting"),
    ("filter", "Air Filters"),
    ("filter", "Oil Filters"),
    ("wiper", "Windshield Wipers"),
    ("bearing", "Bearing & Seals"),
    ("belt", "Belts, Hoses"),
    ("kopling", "Drivetrain"),
    ("kaki", "Shocks, Struts"),
    ("kaki", "Wheels, Rims"),
    ("kaki", "Tires"),
    ("radiator", "Radiators"),
    ("kelistrikan", "Electronics"),
    ("oli", "Oils & Lubes"),
    ("perawatan", "Automotive Care"),
    ("perawatan", "Automotive Tools"),
    ("perawatan", "Tools & Home Improvement"),
    ("body", "Exterior Accessories"),
    ("body", "Interior Accessories"),
    ("body", "Body, Frame"),
    ("body", "Safety & Security"),
    ("mesin", "Engine Parts"),
    ("mesin", "Exhaust"),
    ("mesin", "Fuel System"),
]

VEHICLE_MAKES = [
    "Toyota", "Daihatsu", "Mitsubishi", "Suzuki", "Honda", "Isuzu", "Nissan",
    "Hino", "Mazda", "Hyundai", "Kia", "Wuling", "Chevrolet", "Ford", "Datsun",
    "Mercedes", "BMW", "Proton", "Timor", "Peugeot", "Volkswagen", "Daewoo",
]
MAKE_ALIASES = {
    "Toyota": r"toyota|avanza|innova|kijang|fortuner|rush|yaris|vios|corolla|altis|camry|hilux|calya|agya|dyna|alphard|sienta|etios|limo|soluna|great corolla|\brino\b|dynasaurus",
    "Daihatsu": r"daihatsu|xenia|terios|gran ?max|grandmax|luxio|ayla|sigra|taruna|espass|zebra|feroza|hijet|taft|rocky|sirion|charade",
    "Mitsubishi": r"mitsubishi|pajero|colt|l300|l 300|kuda|xpander|outlander|strada|triton|canter|fuso|lancer|mirage|t120|ragasa",
    "Suzuki": r"suzuki|ertiga|carry|apv|futura|katana|jimny|swift|baleno|xl7|splash|karimun|aerio|escudo|vitara|ignis|s-?presso",
    "Honda": r"honda|jazz|brio|mobilio|city|civic|crv|cr-v|hrv|hr-v|brv|br-v|freed|accord|stream|odyssey",
    "Isuzu": r"isuzu|panther|traga|kbd|elf|d-?max|mu-x|nkr|nhr",
    "Nissan": r"nissan|grand livina|livina|march|serena|x-?trail|juke|navara|terrano|evalia",
    "Hino": r"\bhino\b|dutro",
    "Mazda": r"mazda|cx-?5|vantrend",
    "Hyundai": r"hyundai|atoz|getz|avega|accent",
    "Kia": r"\bkia\b|picanto|visto|carens|rio\b|pride",
    "Wuling": r"wuling|confero|cortez",
    "Chevrolet": r"chevrolet|bspinb|aveo|captiva|trailblazer",
    "Ford": r"\bford\b|ranger|everest|fiesta|ecosport",
    "Datsun": r"datsun|go\+|go panca",
    "Mercedes": r"mercedes|benz",
    "BMW": r"\bbmw\b",
    "Proton": r"proton|savvy|exora",
    "Timor": r"timor",
    "Peugeot": r"peugeot",
    "Volkswagen": r"volkswagen|\bvw\b",
    "Daewoo": r"daewoo|espero|lanos|cielo",
}

PART_BRANDS = [
    "WAKASA", "SEIKEN", "555", "DAIMARU", "CPU", "SANYCO", "BANDO", "EMGI", "KOYO",
    "MITSUDA", "NSK", "DNY", "GMB", "BIRKENS", "LAISIN", "ASPIRA", "HELLA", "MEC",
    "SEIWA", "INDOPARTS", "DENSO", "HITO", "YEC", "KYB", "NTN", "FBK", "AISIN",
    "BOSCH", "OSRAM", "PHILIPS", "TOKAI", "FLOSSER", "SAKURA", "NGK", "STANLEY",
    "PRESTONE", "SHELL", "TOP 1", "PRESTO", "SKF", "GATES", "MITSUBOSHI", "NPR",
    "TP", "RECCO", "KOITO", "VALEO", "EXEDY", "KAYABA", "TOKICO", "BENDIX",
]


def rows(folder, kind):
    files = sorted(glob.glob(os.path.join(folder, f"mass_update_{kind}_*.xlsx")))
    if not files:
        sys.exit(f"File mass_update_{kind}_*.xlsx tidak ditemukan di {folder}")
    wb = CalamineWorkbook.from_path(files[-1])
    data = wb.get_sheet_by_name(wb.sheet_names[0]).to_python()
    return [r for r in data[DATA_START_ROW:] if r and str(r[0]).strip().isdigit()]


def to_int(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def classify(name, cat):
    low = name.lower()
    for cid, needle in CATEGORY_RULES:
        if needle in cat and "Others" not in cat.split("/")[-1]:
            return cid
    for cid, pattern in KEYWORD_RULES:
        if re.search(pattern, low):
            return cid
    for cid, needle in CATEGORY_RULES:
        if needle in cat:
            return cid
    return "lainnya"


def detect_makes(text):
    low = text.lower()
    return [m for m in VEHICLE_MAKES if re.search(MAKE_ALIASES[m], low)]


def detect_brand(name, desc):
    head = (desc.split("\n", 1)[0] if desc else "") + " " + name
    up = head.upper()
    for b in PART_BRANDS:
        if re.search(r"(?<![A-Z0-9])" + re.escape(b) + r"(?![A-Z0-9])", up):
            return b.title() if len(b) > 4 else b
    if re.search(r"\b(original|ori|asli|genuine)\b", head.lower()):
        return "Original"
    return ""


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else "."
    basic = {r[0]: r for r in rows(folder, "basic_info")}
    media = {r[0]: r for r in rows(folder, "media_info")}
    sales = {}
    for r in rows(folder, "sales_info"):
        sales.setdefault(r[0], []).append(r)

    products = []
    skipped = 0
    for pid, b in basic.items():
        m = media.get(pid)
        cat = (m[3] if m else "") or ""
        cat = cat.split(" - ", 1)[-1]
        if cat.startswith(EXCLUDE_PREFIXES):
            skipped += 1
            continue
        name = re.sub(r"\s+", " ", str(b[2])).strip()
        desc = str(b[3] or "").strip()
        images = []
        if m:
            images = [u for u in m[4:13] if isinstance(u, str) and u.startswith("http")]
        variants = []
        for s in sales.get(pid, []):
            price = to_int(s[6])
            if price <= 0:
                continue
            variants.append({"n": str(s[3] or "").strip(), "p": price, "s": to_int(s[8])})
        if not variants:
            skipped += 1
            continue
        prices = [v["p"] for v in variants]
        products.append({
            "id": pid,
            "name": name,
            "cat": classify(name, cat),
            "brand": detect_brand(name, desc),
            "makes": detect_makes(name + " " + desc[:400]),
            "min": min(prices),
            "max": max(prices),
            "stock": sum(v["s"] for v in variants),
            "img": [u.replace("https://cf.shopee.co.id/file/", "") for u in images],
            "var": variants if len(variants) > 1 or variants[0]["n"] else [],
            "desc": desc[:2500],
        })

    # Produk tersedia & yang punya foto ditampilkan lebih dulu
    products.sort(key=lambda p: (p["stock"] <= 0, not p["img"], -int(p["id"])))

    out = {
        "shopId": SHOP_ID,
        "updated": date.today().isoformat(),
        "imgBase": "https://cf.shopee.co.id/file/",
        "products": products,
    }
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, "data", "products.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    from collections import Counter
    print(f"{len(products)} produk ditulis ke {path} ({skipped} dilewati)")
    print("Kategori:", Counter(p["cat"] for p in products).most_common())
    print("Merk mobil:", Counter(m for p in products for m in p["makes"]).most_common())
    print("Merk part:", Counter(p["brand"] for p in products).most_common(15))

    # Halaman per produk + sitemap untuk Google
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_pages
    build_pages.main()


if __name__ == "__main__":
    main()
