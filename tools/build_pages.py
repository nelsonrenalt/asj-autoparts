"""
Membuat halaman statis untuk setiap produk (folder produk/) + sitemap.xml
supaya semua produk bisa ditemukan di Google.

Otomatis dijalankan oleh build_products.py. Bisa juga dijalankan sendiri:
  python tools/build_pages.py
"""
import html
import json
import os
import re
import shutil
from datetime import date
from urllib.parse import quote

SITE_URL = "https://nelsonrenalt.github.io/asj-autoparts/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CAT_NAME = {
    "rem": "Rem & Kampas", "kopling": "Kopling, Gardan & Transmisi", "kaki": "Kaki-kaki & Suspensi",
    "body": "Body, Spion & Aksesoris", "kelistrikan": "Kelistrikan & Pengapian", "lampu": "Lampu & Mika",
    "filter": "Filter Udara & Oli", "belt": "V-Belt, Selang & Pulley", "bearing": "Bearing / Laher & Seal",
    "mesin": "Mesin & Gasket", "wiper": "Wiper & Washer", "oli": "Oli, Grease & Cairan",
    "radiator": "Radiator & Pendingin", "perawatan": "Perawatan & Perkakas", "lainnya": "Lainnya",
}


def read_config():
    txt = open(os.path.join(ROOT, "assets", "js", "config.js"), encoding="utf-8").read()
    get = lambda k: (re.search(k + r':\s*"([^"]*)"', txt) or [None, ""])[1]
    return {k: get(k) for k in ("storeName", "whatsapp", "shopee", "shopeeShopId", "tokopedia", "tiktok", "hoursText")}


def asset_version():
    idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    m = re.search(r"style\.css\?v=(\w+)", idx)
    return m.group(1) if m else "1"


def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:70].rstrip("-")


def rupiah(n):
    return "Rp" + f"{n:,}".replace(",", ".")


def price_text(p):
    return rupiah(p["min"]) if p["min"] == p["max"] else rupiah(p["min"]) + " – " + rupiah(p["max"])


def stock_text(s):
    if s <= 0:
        return "stock--out", "Stok habis, tanyakan dulu"
    if s <= 3:
        return "stock--low", f"Sisa {s}"
    return "stock--ok", "Stok tersedia"


def icon_sprite():
    """Ambil ikon yang dipakai dari sprite di index.html supaya selalu sama."""
    idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    syms = [re.search(r'<symbol id="%s".*?</symbol>' % k, idx, re.S).group(0) for k in ("i-wa", "i-bag", "i-left")]
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + "".join(syms) + "</svg>"


def page(p, cfg, img_base, ver, related, sprite):
    name = p["name"]
    e = html.escape
    url = SITE_URL + "produk/" + p["u"] + ".html"
    cat = CAT_NAME.get(p["cat"], "Lainnya")
    imgs = [img_base + h for h in p["img"]]
    desc_short = re.sub(r"\s+", " ", p["desc"])[:155] or name
    meta_desc = f"{name}. Harga {price_text(p)}. {('Cocok untuk ' + ', '.join(p['makes']) + '. ') if p['makes'] else ''}Beli aman di Shopee, Tokopedia, TikTok Shop atau tanya via WhatsApp {cfg['storeName']}."
    shopee = f"https://shopee.co.id/product/{cfg['shopeeShopId']}/{p['id']}"
    tokped = cfg["tokopedia"] or "https://www.tokopedia.com/search?st=shop&q=" + quote(cfg["storeName"])
    tiktok = cfg["tiktok"] or "https://www.tiktok.com/search?q=" + quote(cfg["storeName"])
    wa_msg = f"Halo {cfg['storeName']}, saya tertarik dengan produk ini:\n*{name}*\nHarga: {price_text(p)}\n{url}\n\nApakah stoknya ada dan cocok untuk mobil saya? Tipe/tahun mobil: "
    wa = f"https://wa.me/{cfg['whatsapp']}?text={quote(wa_msg)}"
    st_cls, st_txt = stock_text(p["stock"])

    offers = {
        "@type": "AggregateOffer" if p["min"] != p["max"] else "Offer",
        "priceCurrency": "IDR",
        "availability": "https://schema.org/" + ("InStock" if p["stock"] > 0 else "OutOfStock"),
        "url": url,
        "seller": {"@type": "Organization", "name": cfg["storeName"]},
    }
    if p["min"] != p["max"]:
        offers.update({"lowPrice": p["min"], "highPrice": p["max"], "offerCount": len(p["var"])})
    else:
        offers["price"] = p["min"]
    ld = {
        "@context": "https://schema.org", "@type": "Product", "name": name, "sku": p["id"],
        "image": imgs[:5], "description": p["desc"][:500] or name, "category": cat, "offers": offers,
    }
    if p["brand"] and p["brand"] != "Original":
        ld["brand"] = {"@type": "Brand", "name": p["brand"]}
    crumbs = {
        "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Beranda", "item": SITE_URL},
            {"@type": "ListItem", "position": 2, "name": cat, "item": SITE_URL + "?kategori=" + p["cat"] + "#katalog"},
            {"@type": "ListItem", "position": 3, "name": name, "item": url},
        ]}

    gallery = ""
    if imgs:
        thumbs = "".join(f'<a href="{e(u)}" target="_blank" rel="noopener"><img src="{e(u)}_tn" alt="{e(name)} foto {i + 1}" loading="lazy" width="68" height="68"></a>' for i, u in enumerate(imgs)) if len(imgs) > 1 else ""
        gallery = f'<div class="pd__main"><img src="{e(imgs[0])}" alt="{e(name)}" width="600" height="600"></div>' + (f'<div class="pd__thumbs sp-thumbs">{thumbs}</div>' if thumbs else "")
    tags = (f'<span class="tag tag--brand">{e(p["brand"])}</span>' if p["brand"] else "") + "".join(f'<span class="tag">{e(m)}</span>' for m in p["makes"])
    vars_html = ""
    if p["var"]:
        rows = "".join(f'<li><span>{e(v["n"] or "Standar")}</span><b>{rupiah(v["p"])}</b><span class="stock {stock_text(v["s"])[0]}">{stock_text(v["s"])[1]}</span></li>' for v in p["var"])
        vars_html = f'<div class="pd__vars"><h2 class="sp-h">Varian</h2><ul class="sp-vars">{rows}</ul></div>'
    rel = "".join(
        f'<li><a class="sp-rel" href="{r["u"]}.html">' + (f'<img src="{e(img_base + r["img"][0])}_tn" alt="" loading="lazy" width="160" height="160">' if r["img"] else "") +
        f'<span>{e(r["name"])}</span><b>{price_text(r)}</b></a></li>' for r in related)

    return f"""<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(name)} | {e(cfg['storeName'])}</title>
<meta name="description" content="{e(meta_desc[:300])}">
<link rel="canonical" href="{e(url)}">
<meta name="theme-color" content="#0a0820">
<meta property="og:type" content="product">
<meta property="og:title" content="{e(name)}">
<meta property="og:description" content="{e(price_text(p) + ' · ' + desc_short)}">
<meta property="og:url" content="{e(url)}">
{f'<meta property="og:image" content="{e(imgs[0])}">' if imgs else ''}
<link rel="icon" type="image/svg+xml" href="../assets/img/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..900&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/style.css?v={ver}">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(crumbs, ensure_ascii=False)}</script>
</head>
<body class="sp">
{sprite}
<header class="header"><div class="container header__inner">
<a href="../" class="brand"><img src="../assets/img/logo.png" alt="{e(cfg['storeName'])}" width="900" height="324"></a>
<a href="../#katalog" class="btn btn--line sp-back"><svg class="ico" aria-hidden="true"><use href="#i-left"/></svg> Semua produk</a>
</div></header>
<main class="container sp-main">
<nav class="sp-crumbs" aria-label="Breadcrumb"><a href="../">Beranda</a> › <a href="../?kategori={p['cat']}#katalog">{e(cat)}</a> › <span>{e(name)}</span></nav>
<article class="sp-card pd__inner">
<div class="pd__gallery">{gallery}</div>
<div class="pd__info">
<p class="pd__crumbs">{e(cat)}</p>
<h1 class="sp-title">{e(name)}</h1>
<div class="pd__tags">{tags}</div>
<p class="pd__price">{price_text(p)}</p>
<p class="pd__stock"><span class="stock {st_cls}">{st_txt}</span></p>
{vars_html}
<div class="pd__buy">
<p class="pd__buy-label">Beli dengan aman di:</p>
<a class="btn btn--shopee btn--block btn--lg" href="{e(shopee)}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-bag"/></svg> Beli di Shopee</a>
<div class="pd__buy-row"><a class="btn btn--tokopedia" href="{e(tokped)}" target="_blank" rel="noopener">Tokopedia</a><a class="btn btn--tiktok" href="{e(tiktok)}" target="_blank" rel="noopener">TikTok Shop</a></div>
<a class="btn btn--wa btn--block" href="{e(wa)}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg> Tanya stok &amp; kecocokan via WhatsApp</a>
</div>
<section class="pd__desc"><h2 class="sp-h">Deskripsi produk</h2><div>{e(p['desc'] or 'Hubungi kami untuk detail produk.')}</div></section>
</div>
</article>
{f'<section class="sp-related"><h2 class="sp-h2">Produk lain di {e(cat)}</h2><ul>{rel}</ul></section>' if rel else ''}
</main>
<footer class="footer sp-footer"><div class="container footer__bottom">
<p>© {date.today().year} {e(cfg['storeName'])} · {e(cfg['hoursText'])}</p>
<p><a href="../" style="color:inherit">Kembali ke katalog</a></p>
</div></footer>
<a class="fab-wa" href="{e(wa)}" target="_blank" rel="noopener" aria-label="Chat WhatsApp"><svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg><span>Tanya stok</span></a>
</body>
</html>"""


def main():
    cfg = read_config()
    ver = asset_version()
    sprite = icon_sprite()
    path = os.path.join(ROOT, "data", "products.json")
    data = json.load(open(path, encoding="utf-8"))
    prods = data["products"]
    for p in prods:
        p["u"] = p["id"] + "-" + slugify(p["name"])
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    out_dir = os.path.join(ROOT, "produk")
    shutil.rmtree(out_dir, ignore_errors=True)
    os.makedirs(out_dir)
    by_cat = {}
    for p in prods:
        by_cat.setdefault(p["cat"], []).append(p)
    for p in prods:
        same = [r for r in by_cat[p["cat"]] if r is not p and r["img"]]
        shared = [r for r in same if set(r["makes"]) & set(p["makes"])]
        related = (shared + [r for r in same if r not in shared])[:6]
        with open(os.path.join(out_dir, p["u"] + ".html"), "w", encoding="utf-8") as f:
            f.write(page(p, cfg, data["imgBase"], ver, related, sprite))

    today = data.get("updated") or date.today().isoformat()
    urls = [f"<url><loc>{SITE_URL}</loc><lastmod>{today}</lastmod><priority>1.0</priority></url>"]
    urls += [f"<url><loc>{SITE_URL}produk/{quote(p['u'])}.html</loc><lastmod>{today}</lastmod></url>" for p in prods]
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n")
    print(f"{len(prods)} halaman produk + sitemap.xml dibuat")


if __name__ == "__main__":
    main()
