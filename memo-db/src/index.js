// 自然言語メモDB: 保存(/api/note) と 質問(/api/ask)
const JST_OFFSET = 9 * 3600 * 1000;

const todayJST = () => new Date(Date.now() + JST_OFFSET).toISOString().slice(0, 10);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

async function callLLM(env, system, user, maxTokens = 800) {
  // Cloudflare Workers AI(無料枠: 1日10,000 neurons)
  const d = await env.AI.run(env.AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_tokens: maxTokens,
    temperature: 0.1,
  });
  return typeof d.response === "string" ? d.response : JSON.stringify(d.response);
}

function parseJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// ---- 保存 ----
async function saveNote(env, raw) {
  const now = new Date().toISOString();
  let meta = {};
  try {
    const out = await callLLM(
      env,
      `あなたはメモ整理係です。今日は${todayJST()}(JST)。メモを読み、JSONのみを返してください。
{"title":"一行要約(40字以内)","event_date":"出来事の日付 YYYY-MM-DD。年が書かれていなければ今日以前で最も近い年を採用。日付が無ければnull","keywords":["検索に使う単語を10個程度。固有名詞・数値・別表記(例: 社保/社会保険)・上位概念も含める"]}`,
      raw,
      400,
    );
    meta = parseJSON(out) || {};
  } catch (e) {
    meta = {}; // LLMが失敗しても原文は必ず保存する
  }
  const kw = Array.isArray(meta.keywords) ? meta.keywords.join(" ") : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(meta.event_date || "") ? meta.event_date : null;
  const res = await env.DB.prepare(
    "INSERT INTO notes (raw, title, event_date, keywords, created_at) VALUES (?,?,?,?,?)",
  ).bind(raw, meta.title || null, date, kw, now).run();
  return { id: res.meta.last_row_id, title: meta.title || null, event_date: date, keywords: kw, structured: !!meta.title };
}

// ---- 質問 ----
async function ask(env, question) {
  const planText = await callLLM(
    env,
    `あなたは検索プランナーです。今日は${todayJST()}(JST)。質問に答えるためにメモDBを検索します。JSONのみ返してください。
{"keywords":["メモ本文に含まれていそうな単語を8個程度。別表記・上位概念も含める"],"date_from":"YYYY-MM-DD or null","date_to":"YYYY-MM-DD or null"}
「去年」「先月」など相対表現は今日を基準に日付範囲へ変換する。範囲が不明ならnull。`,
    question,
    300,
  );
  const plan = parseJSON(planText) || {};
  const kws = (plan.keywords || []).map(String).filter(Boolean);

  // 候補取得(キーワードのLIKE一致)。日付範囲は絞り込みではなく加点に使う(日付誤認で取りこぼさないため)
  let rows = [];
  if (kws.length) {
    const where = kws.map(() => "(raw LIKE ? OR keywords LIKE ? OR title LIKE ?)").join(" OR ");
    const params = kws.flatMap((k) => [`%${k}%`, `%${k}%`, `%${k}%`]);
    rows = (await env.DB.prepare(`SELECT * FROM notes WHERE ${where} ORDER BY id DESC LIMIT 300`).bind(...params).all()).results;
  }
  const inRange = (r) =>
    r.event_date && (!plan.date_from || r.event_date >= plan.date_from) && (!plan.date_to || r.event_date <= plan.date_to);
  const score = (r) => {
    const t = `${r.raw} ${r.keywords || ""} ${r.title || ""}`;
    return kws.filter((k) => t.includes(k)).length + (inRange(r) ? 3 : 0);
  };
  rows.sort((a, b) => score(b) - score(a));
  let hits = rows.slice(0, 25);
  if (!hits.length) {
    hits = (await env.DB.prepare("SELECT * FROM notes ORDER BY id DESC LIMIT 25").all()).results;
  }
  if (!hits.length) return { answer: "まだメモが登録されていません。", sources: [] };

  const context = hits
    .map((r) => `[#${r.id}] 記録日:${r.created_at.slice(0, 10)} 出来事日:${r.event_date || "不明"}\n${r.raw}`)
    .join("\n---\n");
  const answer = await callLLM(
    env,
    `あなたは個人メモDBの回答係です。今日は${todayJST()}(JST)。以下のメモだけを根拠に日本語で簡潔に答えてください。
メモに無いことは推測せず「記録が見つかりません」と答える。根拠にしたメモ番号を末尾に (#12) の形で付ける。
メモに年が無い日付は、記録日の年として解釈する。`,
    `# メモ\n${context}\n\n# 質問\n${question}`,
    700,
  );
  return {
    answer,
    sources: hits.map((r) => ({ id: r.id, title: r.title, event_date: r.event_date, raw: r.raw })),
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    const auth = request.headers.get("authorization") || "";
    if (!env.AUTH_TOKEN || auth !== `Bearer ${env.AUTH_TOKEN}`) return json({ error: "unauthorized" }, 401);

    try {
      if (url.pathname === "/api/note" && request.method === "POST") {
        const { text } = await request.json();
        if (!text || !text.trim()) return json({ error: "empty" }, 400);
        return json(await saveNote(env, text.trim()));
      }
      if (url.pathname === "/api/ask" && request.method === "POST") {
        const { question } = await request.json();
        if (!question || !question.trim()) return json({ error: "empty" }, 400);
        return json(await ask(env, question.trim()));
      }
      if (url.pathname === "/api/notes" && request.method === "GET") {
        const r = await env.DB.prepare("SELECT id, raw, title, event_date, created_at FROM notes ORDER BY id DESC LIMIT 30").all();
        return json(r.results);
      }
      const del = url.pathname.match(/^\/api\/notes\/(\d+)$/);
      if (del && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM notes WHERE id=?").bind(Number(del[1])).run();
        return json({ ok: true });
      }
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 500);
    }
  },
};
