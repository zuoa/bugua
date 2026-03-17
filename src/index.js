import QRCode from "qrcode";

const SYSTEM_PROMPT = `
你是一位通晓易理、表达克制清楚的卦象解读者。请基于用户提供的起卦信息，写一份有古意、但现代人一看就懂的解读。可以有一点象数、气机、转势的意味，但必须用明白话说清楚，不能写成难懂的古文，也不要堆砌玄虚词句。

约束如下：
1. 必须使用中文 Markdown 输出，不要输出 JSON，不要解释你是 AI。
2. 固定使用以下四个二级标题：## 卦象深处、## 事势流转、## 应事之机、## 一句点醒。
3. “卦象深处”要结合本卦、变卦、动爻，直接说清眼下的核心态势，控制在 2 到 3 句。
4. “事势流转”要讲清事情接下来大致如何发展，少用典故，控制在 2 到 3 句。
5. “应事之机”给出 2 条可执行建议，使用无序列表，每条一句话即可。
6. “一句点醒”只写一句短句，要有余味，但也要让人立刻读懂。
7. 总长度控制在 220 到 320 字之间。
8. 优先使用现代白话，可点到即止地保留一点书面气息；避免“此间、其势、应期将至未至、宜静守心”等空泛套话。
9. 不要制造恐惧，不要下绝对判断，不要声称能确定未来，不要涉及医疗、法律、投资等确定性承诺。
`.trim();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return handleIndexHtml(request, env);
    }

    if (url.pathname === "/api/config") {
      const hasLlm = Boolean(getApiKey(env));
      return json({
        llmEnabled: hasLlm,
        model: hasLlm ? env.DEEPSEEK_MODEL || "deepseek-chat" : null
      });
    }

    if (url.pathname === "/api/interpret") {
      if (request.method !== "POST") {
        return json({ error: "METHOD_NOT_ALLOWED" }, 405);
      }
      return handleInterpret(request, env);
    }

    if (url.pathname === "/api/share-qr") {
      if (request.method !== "GET") {
        return json({ error: "METHOD_NOT_ALLOWED" }, 405);
      }
      return handleShareQr(request);
    }

    if (url.pathname === "/robots.txt") {
      return handleRobots(request);
    }

    if (url.pathname === "/sitemap.xml") {
      return handleSitemap(request);
    }

    if (url.pathname === "/og-image.svg") {
      return handleOgImage(request);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Missing ASSETS binding.", { status: 500 });
  }
};

async function handleIndexHtml(request, env) {
  if (!env.ASSETS) {
    return new Response("Missing ASSETS binding.", { status: 500 });
  }

  const assetUrl = new URL("/index.html", request.url);
  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));

  if (!assetResponse.ok) {
    return assetResponse;
  }

  const canonicalUrl = new URL("/", request.url).toString();
  const ogImageUrl = new URL("/og-image.svg", request.url).toString();
  const html = await assetResponse.text();
  const rendered = html
    .replaceAll("__CANONICAL_URL__", canonicalUrl)
    .replaceAll("__OG_IMAGE_URL__", ogImageUrl);

  const headers = new Headers(assetResponse.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=600");

  return new Response(rendered, {
    status: assetResponse.status,
    headers
  });
}

async function handleInterpret(request, env) {
  const apiKey = getApiKey(env);
  if (!apiKey) {
    return json({ error: "LLM_NOT_CONFIGURED" }, 501);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  if (!payload?.question || !payload?.primary?.name) {
    return json({ error: "MISSING_FIELDS" }, 400);
  }

  const apiUrl =
    env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/chat/completions";
  const body = {
    model: env.DEEPSEEK_MODEL || "deepseek-chat",
    temperature: 0.7,
    max_tokens: 420,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            method: payload.method,
            question: payload.question,
            primary: payload.primary,
            changed: payload.changed,
            movingLines: payload.movingLines,
            context: payload.context
          },
          null,
          2
        )
      }
    ]
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text();
    return json(
      {
        error: "UPSTREAM_ERROR",
        detail: detail.slice(0, 500)
      },
      502
    );
  }

  const data = await response.json();
  const text = extractAssistantText(data);

  if (!text) {
    return json({ error: "EMPTY_RESPONSE" }, 502);
  }

  return json({ text });
}

async function handleShareQr(request) {
  const url = new URL(request.url);
  const text = (url.searchParams.get("text") || "").trim();

  if (!text || text.length > 1024) {
    return new Response("Invalid QR payload.", { status: 400 });
  }

  try {
    const svg = await QRCode.toString(text, {
      type: "svg",
      margin: 1,
      width: 220,
      color: {
        dark: "#60441a",
        light: "#fffaf0"
      }
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch {
    return new Response("QR generation failed.", { status: 500 });
  }
}

function handleRobots(request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${origin}/sitemap.xml`
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

function handleSitemap(request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const lastmod = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

function handleOgImage(request) {
  const url = new URL(request.url);
  const homeUrl = `${url.origin}/`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="150" y1="40" x2="1000" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FBF4E8"/>
      <stop offset="1" stop-color="#EFDDBA"/>
    </linearGradient>
    <radialGradient id="aura1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1080 92) rotate(135.639) scale(313.641)">
      <stop stop-color="#D8B36B" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#D8B36B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aura2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(122 68) rotate(50.19) scale(254.019)">
      <stop stop-color="#D8B36B" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#D8B36B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" rx="32" fill="url(#bg)"/>
  <rect x="28" y="28" width="1144" height="574" rx="28" fill="rgba(255,251,243,0.54)" stroke="rgba(164,122,42,0.18)"/>
  <circle cx="1080" cy="92" r="180" fill="url(#aura1)"/>
  <circle cx="122" cy="68" r="132" fill="url(#aura2)"/>
  <rect x="90" y="86" width="92" height="92" rx="24" fill="#C59642"/>
  <text x="136" y="147" text-anchor="middle" font-size="48" fill="#FFF8EC" font-family="'Kaiti SC','STKaiti','KaiTi',serif">卦</text>
  <text x="214" y="126" font-size="28" fill="#A47A2A" letter-spacing="8" font-family="'Songti SC','STSong','Noto Serif SC',serif">云岫卜筮</text>
  <text x="90" y="246" font-size="70" fill="#2B2316" font-family="'Kaiti SC','STKaiti','KaiTi',serif">梅花易数与六爻在线起卦</text>
  <text x="90" y="316" font-size="32" fill="rgba(43,35,22,0.78)" font-family="'Songti SC','STSong','Noto Serif SC',serif">时间起卦、三币成卦、本地解读、AI 深度解意</text>
  <text x="90" y="374" font-size="26" fill="rgba(43,35,22,0.66)" font-family="'Songti SC','STSong','Noto Serif SC',serif">用于文化体验与自我整理，帮助你在一问一卦中梳理当下。</text>

  <rect x="90" y="440" width="1020" height="100" rx="24" fill="rgba(255,248,236,0.7)" stroke="rgba(164,122,42,0.16)"/>
  <text x="126" y="482" font-size="24" fill="#A47A2A" letter-spacing="6" font-family="'Songti SC','STSong','Noto Serif SC',serif">支持能力</text>
  <text x="126" y="522" font-size="30" fill="#2B2316" font-family="'Songti SC','STSong','Noto Serif SC',serif">梅花易数时间起卦 · 六爻三枚硬币起卦 · 本地历史记录 · 可选 AI 解卦</text>

  <text x="90" y="580" font-size="22" fill="rgba(43,35,22,0.58)" font-family="'Songti SC','STSong','Noto Serif SC',serif">${escapeXml(
    homeUrl
  )}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

function extractAssistantText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item?.type === "text") {
          return item.text || "";
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function getApiKey(env) {
  return env.DEEPSEEK_API_KEY || "";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
