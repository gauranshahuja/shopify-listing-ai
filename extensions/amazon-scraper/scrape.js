"use strict";

function ceScrapeAmazonProduct() {
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));
  const txt = (el) => (el && el.textContent ? el.textContent.trim() : "");

  const title = txt(q("#productTitle")) || txt(q("#title")) || document.title;

  function getAsin() {
    const m = location.pathname.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
    if (m) return m[1];
    const el = q("#ASIN") || q("input[name='ASIN']");
    if (el && el.value) return el.value;
    return "";
  }
  const asin = getAsin();
  const slug = (title || "product")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  const handle = asin ? `${slug}-${asin.toLowerCase()}` : slug;

  const vendor =
    txt(q("#bylineInfo")).replace(/^(Visit the|Brand:)\s*/i, "").replace(/\s*Store$/i, "") ||
    txt(q("a#bylineInfo")) ||
    txt(q("tr.po-brand .po-break-word")) || "";

  function parseMoney(s) {
    if (!s) return null;
    const m = String(s).replace(/[, ]/g, "").match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }
  function getPrice() {
    const sels = [
      "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
      "#corePrice_feature_div .a-price .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      ".a-price .a-offscreen",
      "#sns-base-price",
    ];
    for (const s of sels) {
      const el = q(s);
      const v = parseMoney(txt(el));
      if (v) return v;
    }
    return null;
  }
  function getListPrice() {
    const sels = [
      "#corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen",
      ".basisPrice .a-offscreen",
      "span.a-price.a-text-price .a-offscreen",
      "#listPrice",
      "#priceblock_listprice",
    ];
    for (const s of sels) {
      const el = q(s);
      const v = parseMoney(txt(el));
      if (v) return v;
    }
    return null;
  }
  const price = getPrice();
  const listPrice = getListPrice();

  function getGrams() {
    const rows = qa("#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, .prodDetTable tr, #detailBullets_feature_div li");
    const reWeight = /(item weight|net weight|weight|वज़न|वजन)/i;
    for (const r of rows) {
      const label = txt(r.querySelector("th, .a-text-bold")) || txt(r);
      if (!reWeight.test(label)) continue;
      const valText = txt(r.querySelector("td")) || txt(r);
      const m = valText.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|mg|lb|pounds?|oz|ounces?)/i);
      if (!m) continue;
      const n = parseFloat(m[1]);
      const unit = m[2].toLowerCase();
      if (/^kg|kilo/.test(unit)) return Math.round(n * 1000);
      if (/^g|gram/.test(unit)) return Math.round(n);
      if (/^mg/.test(unit)) return Math.round(n / 1000);
      if (/^lb|pound/.test(unit)) return Math.round(n * 453.592);
      if (/^oz|ounce/.test(unit)) return Math.round(n * 28.3495);
    }
    return null;
  }
  const grams = getGrams();

  function getBody() {
    const parts = [];
    const bullets = qa("#feature-bullets ul li span.a-list-item")
      .map((e) => txt(e)).filter((t) => t && !/see more/i.test(t));
    if (bullets.length) parts.push("<ul>" + bullets.map((b) => `<li>${b}</li>`).join("") + "</ul>");
    const desc = txt(q("#productDescription"));
    if (desc) parts.push(`<p>${desc}</p>`);
    return parts.join("\n");
  }
  const body_html = getBody();

  function getImages() {
    const urls = new Set();

    const isProductImg = (u) =>
      /^https?:\/\//.test(u) &&
      /\/images\/I\//.test(u) &&
      !/sprite|grey-pixel|transparent|play-?(button|icon)|\/video\//i.test(u) &&
      !/_SS40_|_US40_|_SX38_|_CB\d/.test(u);

    const main = q("#landingImage, #imgBlkFront, #imgTagWrapperId img");
    if (main) {
      const dyn = main.getAttribute("data-a-dynamic-image");
      if (dyn) {
        try { Object.keys(JSON.parse(dyn)).forEach((u) => { if (isProductImg(u)) urls.add(u); }); } catch (_) {}
      }
      const hires = main.getAttribute("data-old-hires") || main.getAttribute("src") || "";
      if (hires && isProductImg(hires)) urls.add(hires.replace(/\._[^.]+_\./, "."));
    }

    qa("#altImages li.imageThumbnail img, #altImages img").forEach((img) => {
      let src = img.getAttribute("src") || img.getAttribute("data-old-hires") || "";
      if (!src) return;
      src = src.replace(/\._[^.]+_\./, ".");
      if (isProductImg(src)) urls.add(src);
    });

    return Array.from(urls).slice(0, 12).map((src, i) => ({ src, position: i + 1 }));
  }
  const images = getImages();

  return {
    handle,
    title,
    body_html,
    vendor,
    product_type: "",
    tags: [],
    published_at: null,
    options: [{ name: "Title" }],
    variants: [
      {
        option1: "Default Title",
        sku: asin || "",
        price: price != null ? String(price) : "",
        compare_at_price: listPrice != null ? String(listPrice) : "",
        grams: grams != null ? grams : "",
        barcode: "",
        requires_shipping: true,
        taxable: true,
      },
    ],
    images,
    _source: { site: "amazon", asin, url: location.href },
  };
}

ceScrapeAmazonProduct();
