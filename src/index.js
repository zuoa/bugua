const SYSTEM_PROMPT =
  "你是一位温和、清晰、积极的易学解读助手。请基于用户给出的卦象信息，用现代中文输出简洁、正向、不过度玄断的解读。重点给出：1）当前阶段的趋势；2）可以执行的行动建议；3）一句鼓励性的提醒。不要制造恐惧，不要下绝对判断，不要涉及医疗、法律、投资等确定性承诺。";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Missing ASSETS binding.", { status: 500 });
  }
};

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
    max_tokens: 520,
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
