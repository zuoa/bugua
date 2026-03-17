const STORAGE_KEY = "bugua-history-v1";
const SHARE_CARD_ID = "share-card";
const deferredAssets = {
  htmlToImage: null,
  markdown: null
};
const markdownRenderer = {
  domPurify: null,
  marked: null
};
let deferredWarmupScheduled = false;

const TRIGRAMS_BY_NUMBER = {
  1: {
    key: "qian",
    name: "乾",
    symbol: "☰",
    element: "天",
    lines: [1, 1, 1],
    energy: "开创、担当、向上",
    guidance: "先定方向，再稳步推进。"
  },
  2: {
    key: "dui",
    name: "兑",
    symbol: "☱",
    element: "泽",
    lines: [1, 1, 0],
    energy: "沟通、喜悦、互信",
    guidance: "把话说透，关系就会顺。"
  },
  3: {
    key: "li",
    name: "离",
    symbol: "☲",
    element: "火",
    lines: [1, 0, 1],
    energy: "明辨、表达、照亮",
    guidance: "看清重点，比一味求快更重要。"
  },
  4: {
    key: "zhen",
    name: "震",
    symbol: "☳",
    element: "雷",
    lines: [1, 0, 0],
    energy: "启动、突破、唤醒",
    guidance: "适合迈出第一步，但不宜冒进。"
  },
  5: {
    key: "xun",
    name: "巽",
    symbol: "☴",
    element: "风",
    lines: [0, 1, 1],
    energy: "渗透、细化、渐进",
    guidance: "柔和而持续，往往比硬推更有力。"
  },
  6: {
    key: "kan",
    name: "坎",
    symbol: "☵",
    element: "水",
    lines: [0, 1, 0],
    energy: "谨慎、韧性、穿越",
    guidance: "先稳住节奏，难处会成为转机的入口。"
  },
  7: {
    key: "gen",
    name: "艮",
    symbol: "☶",
    element: "山",
    lines: [0, 0, 1],
    energy: "止定、边界、沉淀",
    guidance: "守住界线，反而能看见新的方向。"
  },
  8: {
    key: "kun",
    name: "坤",
    symbol: "☷",
    element: "地",
    lines: [0, 0, 0],
    energy: "承载、包容、积累",
    guidance: "先厚植根基，好结果会更稳。"
  }
};

const TRIGRAMS = Object.values(TRIGRAMS_BY_NUMBER);
const TRIGRAM_BY_LINES = new Map(TRIGRAMS.map((item) => [item.lines.join(""), item]));

const HEXAGRAM_NAMES = {
  "乾-乾": "乾为天",
  "坤-坤": "坤为地",
  "坎-震": "水雷屯",
  "艮-坎": "山水蒙",
  "坎-乾": "水天需",
  "乾-坎": "天水讼",
  "坤-坎": "地水师",
  "坎-坤": "水地比",
  "巽-乾": "风天小畜",
  "乾-兑": "天泽履",
  "坤-乾": "地天泰",
  "乾-坤": "天地否",
  "乾-离": "天火同人",
  "离-乾": "火天大有",
  "坤-艮": "地山谦",
  "震-坤": "雷地豫",
  "兑-震": "泽雷随",
  "艮-巽": "山风蛊",
  "坤-兑": "地泽临",
  "巽-坤": "风地观",
  "离-震": "火雷噬嗑",
  "艮-离": "山火贲",
  "艮-坤": "山地剥",
  "坤-震": "地雷复",
  "乾-震": "天雷无妄",
  "艮-乾": "山天大畜",
  "艮-震": "山雷颐",
  "兑-巽": "泽风大过",
  "坎-坎": "坎为水",
  "离-离": "离为火",
  "兑-艮": "泽山咸",
  "震-巽": "雷风恒",
  "乾-艮": "天山遁",
  "震-乾": "雷天大壮",
  "离-坤": "火地晋",
  "坤-离": "地火明夷",
  "巽-离": "风火家人",
  "离-兑": "火泽睽",
  "坎-艮": "水山蹇",
  "震-坎": "雷水解",
  "艮-兑": "山泽损",
  "巽-震": "风雷益",
  "兑-乾": "泽天夬",
  "乾-巽": "天风姤",
  "兑-坤": "泽地萃",
  "坤-巽": "地风升",
  "兑-坎": "泽水困",
  "坎-巽": "水风井",
  "兑-离": "泽火革",
  "离-巽": "火风鼎",
  "震-震": "震为雷",
  "艮-艮": "艮为山",
  "巽-艮": "风山渐",
  "震-兑": "雷泽归妹",
  "震-离": "雷火丰",
  "离-艮": "火山旅",
  "巽-巽": "巽为风",
  "兑-兑": "兑为泽",
  "巽-坎": "风水涣",
  "坎-兑": "水泽节",
  "巽-兑": "风泽中孚",
  "震-艮": "雷山小过",
  "坎-离": "水火既济",
  "离-坎": "火水未济"
};

const EARTHLY_BRANCHES = [
  { name: "子", number: 1, hours: [23, 0] },
  { name: "丑", number: 2, hours: [1, 2] },
  { name: "寅", number: 3, hours: [3, 4] },
  { name: "卯", number: 4, hours: [5, 6] },
  { name: "辰", number: 5, hours: [7, 8] },
  { name: "巳", number: 6, hours: [9, 10] },
  { name: "午", number: 7, hours: [11, 12] },
  { name: "未", number: 8, hours: [13, 14] },
  { name: "申", number: 9, hours: [15, 16] },
  { name: "酉", number: 10, hours: [17, 18] },
  { name: "戌", number: 11, hours: [19, 20] },
  { name: "亥", number: 12, hours: [21, 22] }
];

const LUNAR_MONTHS = {
  正月: 1,
  一月: 1,
  二月: 2,
  三月: 3,
  四月: 4,
  五月: 5,
  六月: 6,
  七月: 7,
  八月: 8,
  九月: 9,
  十月: 10,
  十一月: 11,
  冬月: 11,
  十二月: 12,
  腊月: 12
};

const LUNAR_DAYS = {
  1: "初一",
  2: "初二",
  3: "初三",
  4: "初四",
  5: "初五",
  6: "初六",
  7: "初七",
  8: "初八",
  9: "初九",
  10: "初十",
  11: "十一",
  12: "十二",
  13: "十三",
  14: "十四",
  15: "十五",
  16: "十六",
  17: "十七",
  18: "十八",
  19: "十九",
  20: "二十",
  21: "廿一",
  22: "廿二",
  23: "廿三",
  24: "廿四",
  25: "廿五",
  26: "廿六",
  27: "廿七",
  28: "廿八",
  29: "廿九",
  30: "三十"
};

const LINE_GUIDANCE = {
  1: "初爻动，提醒先把根基打稳，起步宜小不宜躁。",
  2: "二爻动，说明顺势配合比单打独斗更容易见效。",
  3: "三爻动，临近转折，宁可慢一点，也别硬顶。",
  4: "四爻动，机会正在抬头，保持分寸感会更稳。",
  5: "五爻动，主位得中，适合以更成熟的方式承担责任。",
  6: "上爻动，提醒见好就收，留白比过满更吉。"
};

const DOMAIN_GUIDANCE = {
  career: {
    label: "事业",
    reading: "更适合看清阶段目标、整合资源，再把动作做稳。",
    actions: [
      "把当下目标压缩成一个最重要的推进点。",
      "优先处理能带来长期积累的事情，而不是短期喧闹。",
      "沟通时说清边界与预期，阻力会明显下降。"
    ]
  },
  love: {
    label: "感情",
    reading: "关系里的关键不是猜测，而是把真实需求表达出来。",
    actions: [
      "先把自己的感受说清楚，再讨论对错。",
      "少一点试探，多一点真诚回应。",
      "给彼此留出节奏，关系会更自然地靠近。"
    ]
  },
  study: {
    label: "学业",
    reading: "此时更需要清晰方法和稳定节奏，而不是临时用力。",
    actions: [
      "把目标拆成几段，每段都能被完成。",
      "优先补最薄弱的环节，提升会更明显。",
      "保持连续性，比偶尔爆发更重要。"
    ]
  },
  wealth: {
    label: "财务",
    reading: "重点不在冒进，而在判断节奏、控制风险、积小成大。",
    actions: [
      "先确认现金流与承受边界，再谈扩张。",
      "对短期诱惑保持克制，稳定比刺激更值钱。",
      "把资源投向你真正能持续经营的方向。"
    ]
  },
  health: {
    label: "身心",
    reading: "卦意更偏向调节作息、放慢消耗、让身体回到平衡。",
    actions: [
      "先把休息、饮食、运动的基本节律稳住。",
      "压力大时先减负，而不是继续硬撑。",
      "把注意力放回长期修复，而非短时焦虑。"
    ]
  },
  general: {
    label: "综合",
    reading: "这件事不必急着一步到位，先顺势整理，机会会逐渐显形。",
    actions: [
      "把握住眼前最现实的一步。",
      "判断形势后再发力，效果会更稳。",
      "允许过程有调整，不必因为小波动否定整体。"
    ]
  }
};

const state = {
  screen: "home",
  showHistory: false,
  config: {
    llmEnabled: false,
    model: null
  },
  forms: {
    meihuaQuestion: "",
    meihuaTime: toDateTimeLocalValue(new Date()),
    liuyaoQuestion: ""
  },
  liuyao: {
    tosses: []
  },
  result: null,
  history: loadHistory(),
  ai: {
    loading: false,
    text: "",
    error: ""
  },
  share: {
    loading: false,
    error: ""
  }
};

const root = document.querySelector("#app");

init();

function init() {
  render();
  void loadConfig();
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) {
    return;
  }

  const action = trigger.dataset.action;

  if (action === "open-history") {
    state.showHistory = true;
    render();
    return;
  }

  if (action === "close-history") {
    state.showHistory = false;
    render();
    return;
  }

  if (action === "go-screen") {
    state.screen = trigger.dataset.screen;
    state.showHistory = false;
    state.share = { loading: false, error: "" };
    render();
    return;
  }

  if (action === "go-home") {
    state.screen = "home";
    state.result = null;
    state.ai = { loading: false, text: "", error: "" };
    state.share = { loading: false, error: "" };
    render();
    return;
  }

  if (action === "reset-liuyao") {
    state.liuyao.tosses = [];
    render();
    return;
  }

  if (action === "toss-line") {
    handleLiuyaoToss();
    return;
  }

  if (action === "review-history") {
    const entry = state.history.find((item) => item.id === trigger.dataset.id);
    if (entry) {
      state.result = entry;
      state.ai = {
        loading: false,
        text: entry.aiText || "",
        error: ""
      };
      state.share = {
        loading: false,
        error: ""
      };
      state.screen = "result";
      state.showHistory = false;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  if (action === "clear-history") {
    const approved = window.confirm("确认清空本地卜卦历史吗？");
    if (!approved) {
      return;
    }
    state.history = [];
    persistHistory();
    render();
    return;
  }

  if (action === "ask-ai") {
    requestAiInterpretation();
    return;
  }

  if (action === "save-result-image") {
    void saveResultAsImage();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    return;
  }

  if (target.name === "meihuaQuestion") {
    state.forms.meihuaQuestion = target.value;
  }

  if (target.name === "meihuaTime") {
    state.forms.meihuaTime = target.value;
  }

  if (target.name === "liuyaoQuestion") {
    state.forms.liuyaoQuestion = target.value;
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  if (form.dataset.form === "meihua") {
    event.preventDefault();
    handleMeihuaSubmit();
  }
});

function render() {
  root.innerHTML = `
    <div class="app-frame">
      <div class="bg-aura bg-aura-one"></div>
      <div class="bg-aura bg-aura-two"></div>
      <div class="grain"></div>
      ${renderTopbar()}

      <main class="screen screen-${state.screen}">
        ${renderScreen()}
      </main>

      ${renderShareStage()}
      ${renderHistoryPanel()}
    </div>
  `;

  scheduleDeferredWarmup();
}

function scheduleDeferredWarmup() {
  if (deferredWarmupScheduled) {
    return;
  }

  deferredWarmupScheduled = true;

  const run = () => {
    deferredWarmupScheduled = false;

    if (state.screen !== "result" || !state.result) {
      return;
    }

    void loadHtmlToImage().catch(() => {});

    if (state.config.llmEnabled || state.result.aiText) {
      void loadMarkdownRenderer().catch(() => {});
    }
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1200 });
    return;
  }

  window.setTimeout(run, 180);
}

function renderTopbar() {
  if (state.screen === "home") {
    return `<header class="topbar topbar-home"></header>`;
  }

  return `
    <header class="topbar ${state.screen === "result" ? "topbar-result" : ""}">
      <button class="brand" data-action="go-home">
        <span class="brand-mark">卦</span>
        <span class="brand-copy">
          <strong>云岫卜筮</strong>
          <small>梅花易数 · 六爻</small>
        </span>
      </button>
      <button class="ghost-button topbar-button" data-action="open-history">历史</button>
    </header>
  `;
}

function renderScreen() {
  if (state.screen === "meihua") {
    return renderMeihuaScreen();
  }

  if (state.screen === "liuyao") {
    return renderLiuyaoScreen();
  }

  if (state.screen === "result" && state.result) {
    return renderResultScreen();
  }

  return renderHomeScreen();
}

function renderHomeScreen() {
  return `
    <section class="hero hero-home reveal">
      <p class="hero-brand">云岫卜筮</p>
      <div class="hero-ornament" aria-hidden="true">
        <span class="hero-line"></span>
        <span class="hero-seal">卦</span>
        <span class="hero-line"></span>
      </div>
      <h1>
        <span>一念一问，</span>
        <span>取一卦明心。</span>
      </h1>
    </section>

    <section class="method-grid">
      <button class="method-card method-card-meihua reveal" data-action="go-screen" data-screen="meihua">
        <span class="method-order" aria-hidden="true">01</span>
        <div class="method-header">
          <div class="method-crest" aria-hidden="true">
            <span class="method-crest-mark">梅</span>
            <span class="method-crest-aura"></span>
          </div>
          <div class="method-title-group">
            <span class="method-name">梅花易数</span>
            <h2>时间起卦</h2>
          </div>
        </div>
        <p>适合心中有问、想迅速得一份提醒时使用。</p>
        <div class="method-bottom">
          <span class="method-meta">轻启一问，即可成卦</span>
          <span class="method-arrow" aria-hidden="true">↗</span>
        </div>
      </button>

      <button class="method-card method-card-liuyao reveal delay-1" data-action="go-screen" data-screen="liuyao">
        <span class="method-order" aria-hidden="true">02</span>
        <div class="method-header">
          <div class="method-crest" aria-hidden="true">
            <span class="method-crest-mark">爻</span>
            <span class="method-crest-aura"></span>
          </div>
          <div class="method-title-group">
            <span class="method-name">六爻</span>
            <h2>三币成卦</h2>
          </div>
        </div>
        <p>更适合想慢一点、把问题层层展开来看的人。</p>
        <div class="method-bottom">
          <span class="method-meta">六次成卦，步步见意</span>
          <span class="method-arrow" aria-hidden="true">↗</span>
        </div>
      </button>
    </section>

    <section class="home-history reveal delay-2">
      <div class="home-history-header">
        <span class="home-history-line"></span>
        <p>过往卦意</p>
        <span class="home-history-line"></span>
      </div>
      <button class="home-history-entry" data-action="open-history">
        <span>查看卦史</span>
        <small>${state.history.length ? `已有 ${state.history.length} 条记录` : "尚无记录"}</small>
      </button>
    </section>

  `;
}

function renderMeihuaScreen() {
  return `
    <section class="subhead reveal">
      <p class="eyebrow">梅花易数</p>
      <h1>时间起卦</h1>
      <p>此法适合心念初起之时，借当下时刻映照事情的走势。</p>
    </section>

    <form class="panel form-panel reveal delay-1" data-form="meihua">
      <label class="field">
        <span>所问之事</span>
        <textarea
          name="meihuaQuestion"
          rows="3"
          placeholder="例如：接下来三个月的工作推进是否顺势？"
        >${escapeHtml(state.forms.meihuaQuestion)}</textarea>
      </label>

      <label class="field">
        <span>起卦时间</span>
        <input name="meihuaTime" type="datetime-local" value="${escapeHtml(state.forms.meihuaTime)}" />
      </label>

      <div class="panel-inline">
        <p>选好时间，落下一问，即可得卦。</p>
      </div>

      <button class="primary-button" type="submit">开始起卦</button>
    </form>
  `;
}

function renderLiuyaoScreen() {
  const progress = `${state.liuyao.tosses.length} / 6`;
  return `
    <section class="subhead reveal">
      <p class="eyebrow">六爻</p>
      <h1>三枚硬币起卦</h1>
      <p>六次起落，像把一个问题慢慢展开来看。</p>
    </section>

    <section class="panel form-panel reveal delay-1">
      <label class="field">
        <span>所问之事</span>
        <textarea
          name="liuyaoQuestion"
          rows="3"
          placeholder="例如：这次合作是否值得继续推进？"
        >${escapeHtml(state.forms.liuyaoQuestion)}</textarea>
      </label>

      <div class="liuyao-toolbar">
        <div class="progress-chip">
          <strong>${progress}</strong>
          <span>当前进度</span>
        </div>
        <div class="toolbar-actions">
          <button class="ghost-button" type="button" data-action="reset-liuyao">重置</button>
          <button class="primary-button" type="button" data-action="toss-line">
            ${state.liuyao.tosses.length === 0 ? "摇第一爻" : "继续摇卦"}
          </button>
        </div>
      </div>
    </section>

    <section class="toss-list reveal delay-2">
      ${state.liuyao.tosses.length ? state.liuyao.tosses.map(renderTossCard).join("") : renderTossPlaceholder()}
    </section>
  `;
}

function renderTossPlaceholder() {
  return `
    <div class="panel toss-card placeholder-card">
      <p class="eyebrow">起卦提示</p>
      <h3>先定一问，再缓缓成卦。</h3>
      <p>六次完成后，会自动进入结果页。</p>
    </div>
  `;
}

function renderTossCard(toss) {
  return `
    <article class="panel toss-card reveal">
      <div>
        <p class="eyebrow">第 ${toss.index} 爻</p>
        <h3>${toss.label}</h3>
      </div>
      <div class="coins">
        ${toss.coins
          .map(
            (coin, index) => `
            <span class="coin ${coin === 1 ? "coin-yang" : "coin-yin"}" style="--delay:${index * 0.08}s">
              ${coin === 1 ? "阳" : "阴"}
            </span>
          `
          )
          .join("")}
      </div>
      <p class="toss-meta">${toss.bit === 1 ? "本爻为阳" : "本爻为阴"}${toss.moving ? "，为动爻" : "，为静爻"}</p>
    </article>
  `;
}

function renderResultScreen() {
  const result = state.result;
  const hasAiInterpretation = Boolean(state.ai.text || result.aiText);
  return `
    <section class="result-hero panel reveal">
      <div class="result-copy">
        <p class="eyebrow">${result.methodLabel}</p>
        <h1>${escapeHtml(result.primary.name)}</h1>
        <p>${escapeHtml(result.question)}</p>
      </div>
      <div class="result-stats">
        <span>${escapeHtml(result.createdAtLabel)}</span>
        <span>${escapeHtml(result.movingLinesLabel)}</span>
      </div>
    </section>

    <section class="hexagram-grid reveal delay-1">
      ${renderHexagramCard("本卦", result.primary)}
      ${renderHexagramCard("变卦", result.changed)}
    </section>

    <section class="panel context-panel reveal delay-2">
      <p class="eyebrow">起卦信息</p>
      <div class="context-grid">
        ${result.contextList
          .map(
            (item) => `
            <div class="context-item">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </div>
          `
          )
          .join("")}
      </div>
    </section>

    <section class="panel interpretation-panel reveal delay-2">
      <p class="eyebrow">解卦</p>
      <h2>${escapeHtml(result.interpretation.headline)}</h2>
      <p class="reading-block">${escapeHtml(result.interpretation.overview)}</p>
      <p class="reading-block">${escapeHtml(result.interpretation.reading)}</p>
      <div class="advice-list">
        ${result.interpretation.advice
          .map(
            (item) => `
            <div class="advice-item">
              <span class="advice-dot"></span>
              <p>${escapeHtml(item)}</p>
            </div>
          `
          )
          .join("")}
      </div>
    </section>

    ${
      state.config.llmEnabled
        ? `
        <section class="panel ai-panel reveal delay-3" ${state.ai.loading ? 'aria-busy="true"' : ""}>
          <div class="ai-head">
            <div>
              <p class="eyebrow">幽微解意</p>
              <h2>再入一层卦气，看看此事暗线如何流转</h2>
            </div>
            ${
              hasAiInterpretation && !state.ai.loading
                ? ""
                : `
                  <button class="primary-button ai-trigger ${state.ai.loading ? "is-loading" : ""}" data-action="ask-ai" ${state.ai.loading ? "disabled" : ""}>
                    <span class="ai-trigger-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                    <span>${state.ai.loading ? "推解中" : "再参一层"}</span>
                  </button>
                `
            }
          </div>
          ${
            state.ai.error
              ? `<p class="inline-note">${escapeHtml(state.ai.error)}</p>`
              : ""
          }
          ${
            state.ai.loading
              ? `
                <div class="ai-loading" role="status" aria-live="polite">
                  <div class="ai-loading-head">
                    <span class="ai-loading-seal" aria-hidden="true"></span>
                    <div class="ai-loading-copy">
                      <strong>推解中</strong>
                      <p>卦气正在层层展开，稍候便有回音。</p>
                    </div>
                  </div>
                  <div class="ai-loading-waves" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              `
              : state.ai.text
              ? `<div class="ai-copy">${renderMarkdown(state.ai.text)}</div>`
              : `<p class="inline-note">若你还想继续往深处听，可再参一层卦意。</p>`
          }
        </section>
      `
        : `
        <section class="panel ai-panel reveal delay-3">
          <p class="eyebrow">幽微解意</p>
          <h2>此处天机未启</h2>
          <p class="inline-note">先看眼前这层卦意，也已足够照见当下。</p>
        </section>
      `
    }

    <section class="result-actions reveal delay-3">
      <button class="primary-button" data-action="save-result-image" ${state.share.loading ? "disabled" : ""}>
        ${state.share.loading ? "卦图落成中..." : "保存卦图"}
      </button>
      <button class="ghost-button" data-action="go-screen" data-screen="${result.method === "meihua" ? "meihua" : "liuyao"}">
        再起一卦
      </button>
      <button class="ghost-button" data-action="go-home">返回入口</button>
    </section>

    ${
      state.share.error
        ? `<p class="inline-note result-note reveal delay-3">${escapeHtml(state.share.error)}</p>`
        : ""
    }
  `;
}

function renderHexagramCard(title, hexagram) {
  return `
    <article class="panel hex-card">
      <div class="hex-head">
        <p class="eyebrow">${title}</p>
        <h2>${escapeHtml(hexagram.name)}</h2>
        <p>${escapeHtml(hexagram.upper.element)}上${escapeHtml(hexagram.lower.element)}下 · ${hexagram.upper.symbol}${hexagram.lower.symbol}</p>
      </div>
      <div class="hex-lines">
        ${hexagram.lines
          .slice()
          .reverse()
          .map((bit, index) => renderLine(bit, 5 - index, hexagram.movingLines.includes(6 - index)))
          .join("")}
      </div>
      <div class="hex-foot">
        <span>${escapeHtml(hexagram.upper.name)}：${escapeHtml(hexagram.upper.energy)}</span>
        <span>${escapeHtml(hexagram.lower.name)}：${escapeHtml(hexagram.lower.energy)}</span>
      </div>
    </article>
  `;
}

function renderLine(bit, index, moving) {
  return `
    <div class="line-row ${moving ? "line-moving" : ""}" style="--line-delay:${index * 0.07}s">
      ${
        bit
          ? `<span class="yang-line"></span>`
          : `<span class="yin-line"><i></i><i></i></span>`
      }
    </div>
  `;
}

function renderHistoryPanel() {
  return `
    <div class="history-overlay ${state.showHistory ? "is-open" : ""}" data-action="close-history"></div>
    <aside class="history-panel ${state.showHistory ? "is-open" : ""}">
      <div class="history-header">
        <div>
          <p class="eyebrow">过往卦意</p>
          <h2>卦史</h2>
        </div>
        <button class="ghost-button" data-action="close-history">关闭</button>
      </div>
      <div class="history-body">
        ${
          state.history.length
            ? state.history
                .map(
                  (item) => `
                  <button class="history-item" data-action="review-history" data-id="${escapeHtml(item.id)}">
                    <span class="history-method">${escapeHtml(item.methodLabel)}</span>
                    <strong>${escapeHtml(item.primary.name)}</strong>
                    <p>${escapeHtml(item.question)}</p>
                    <small>${escapeHtml(item.createdAtLabel)}</small>
                  </button>
                `
                )
                .join("")
            : `
            <div class="history-empty">
              <p>还没有卜卦记录。</p>
              <small>有了新的卦意，会留存在这里。</small>
            </div>
          `
        }
      </div>
      ${
        state.history.length
          ? `<button class="ghost-button wide-button" data-action="clear-history">清空记录</button>`
          : ""
      }
    </aside>
  `;
}

function renderShareStage() {
  if (!state.result) {
    return "";
  }

  return `
    <div class="share-stage" aria-hidden="true">
      ${renderShareCard(state.result)}
    </div>
  `;
}

function renderShareCard(result) {
  return `
    <article class="share-card" id="${SHARE_CARD_ID}">
      <div class="share-card-aura share-card-aura-one"></div>
      <div class="share-card-aura share-card-aura-two"></div>

      <header class="share-card-head">
        <div class="share-card-brand">
          <span class="share-card-seal">卦</span>
          <div>
            <p class="eyebrow">云岫卜筮 · ${escapeHtml(result.methodLabel)}</p>
            <h1>${escapeHtml(result.primary.name)}</h1>
          </div>
        </div>
        <div class="share-card-meta">
          <span>${escapeHtml(result.createdAtLabel)}</span>
          <span>${escapeHtml(result.movingLinesLabel)}</span>
        </div>
      </header>

      <section class="share-card-question">
        <p class="eyebrow">所问之事</p>
        <p>${escapeHtml(result.question)}</p>
      </section>

      <section class="share-card-grid">
        ${renderShareHexagramCard("本卦", result.primary)}
        ${renderShareHexagramCard("变卦", result.changed)}
      </section>

      <section class="share-reading-panel">
        <p class="eyebrow">卦意摘要</p>
        <h2>${escapeHtml(result.interpretation.headline)}</h2>
        <p>${escapeHtml(result.interpretation.overview)}</p>
        <p>${escapeHtml(result.interpretation.reading)}</p>
      </section>

      ${
        result.aiText
          ? `
      <section class="share-ai-panel">
        <p class="eyebrow">幽微解意</p>
        <div class="share-ai-copy">${renderMarkdown(result.aiText)}</div>
      </section>
      `
          : ""
      }

      <section class="share-advice-panel">
        <p class="eyebrow">应事之机</p>
        <div class="share-advice-list">
          ${result.interpretation.advice
            .slice(0, 4)
            .map(
              (item) => `
                <div class="share-advice-item">
                  <span class="share-advice-dot"></span>
                  <p>${escapeHtml(item)}</p>
                </div>
              `
            )
            .join("")}
        </div>
      </section>

      <footer class="share-card-foot">
        <div class="share-foot-copy">
          <p class="eyebrow">带走这一卦</p>
          <h3>此卦可留，后验自明。</h3>
          <p>保存此图，日后回看；若想另起一卦，扫一扫便可。</p>
          <small>${escapeHtml(getSiteShareUrl())}</small>
        </div>
        <div class="share-qr-panel">
          <img class="share-qr-image" src="${escapeHtml(getShareQrUrl())}" alt="云岫卜筮二维码" />
          <span>云岫卜筮</span>
        </div>
      </footer>
    </article>
  `;
}

function renderShareHexagramCard(title, hexagram) {
  return `
    <section class="share-hex-card">
      <div class="share-hex-head">
        <p class="eyebrow">${title}</p>
        <h3>${escapeHtml(hexagram.name)}</h3>
        <p>${escapeHtml(hexagram.upper.element)}上${escapeHtml(hexagram.lower.element)}下</p>
      </div>
      <div class="share-hex-lines">
        ${hexagram.lines
          .slice()
          .reverse()
          .map((bit, index) => renderLine(bit, 5 - index, hexagram.movingLines.includes(6 - index)))
          .join("")}
      </div>
    </section>
  `;
}

function handleMeihuaSubmit() {
  const question = state.forms.meihuaQuestion.trim();
  if (!question) {
    window.alert("请先写下所问之事。");
    return;
  }

  const date = state.forms.meihuaTime ? new Date(state.forms.meihuaTime) : new Date();
  if (Number.isNaN(date.getTime())) {
    window.alert("起卦时间无效，请重新选择。");
    return;
  }

  const result = createMeihuaResult(question, date);
  commitResult(result);
}

function handleLiuyaoToss() {
  const question = state.forms.liuyaoQuestion.trim();
  if (!question) {
    window.alert("请先写下所问之事，再开始摇卦。");
    return;
  }

  if (state.liuyao.tosses.length >= 6) {
    return;
  }

  const toss = createCoinToss(state.liuyao.tosses.length + 1);
  state.liuyao.tosses = [...state.liuyao.tosses, toss];

  if (state.liuyao.tosses.length === 6) {
    const result = createLiuyaoResult(question, state.liuyao.tosses);
    commitResult(result);
    return;
  }

  render();
}

function commitResult(result) {
  state.result = result;
  state.ai = {
    loading: false,
    text: result.aiText || "",
    error: ""
  };
  state.share = {
    loading: false,
    error: ""
  };
  state.screen = "result";
  state.showHistory = false;
  state.liuyao.tosses = [];
  saveHistoryEntry(result);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function createMeihuaResult(question, date) {
  const lunar = getLunarInfo(date);
  const hourBranch = getHourBranch(date.getHours());
  const upperNumber = wrapMod(lunar.yearBranchNumber + lunar.month + lunar.day, 8);
  const lowerNumber = wrapMod(lunar.yearBranchNumber + lunar.month + lunar.day + hourBranch.number, 8);
  const movingLine = wrapMod(lunar.yearBranchNumber + lunar.month + lunar.day + hourBranch.number, 6);

  const upper = TRIGRAMS_BY_NUMBER[upperNumber];
  const lower = TRIGRAMS_BY_NUMBER[lowerNumber];
  const primary = createHexagramFromTrigrams(upper, lower, [movingLine]);
  const changed = createChangedHexagram(primary.lines, [movingLine]);

  return buildResult({
    method: "meihua",
    methodLabel: "梅花易数",
    question,
    primary,
    changed,
    movingLines: [movingLine],
    contextList: [
      { label: "起卦时间", value: formatDate(date) },
      { label: "农历", value: lunar.display },
      { label: "时辰", value: `${hourBranch.name}时` },
      { label: "动爻", value: movingLinesLabel([movingLine]) },
      { label: "卦象", value: `${upper.name}上${lower.name}下` }
    ],
    recordedAt: date
  });
}

function createLiuyaoResult(question, tosses) {
  const lines = tosses.map((item) => item.bit);
  const movingLines = tosses.filter((item) => item.moving).map((item) => item.index);
  const primary = createHexagramFromLines(lines, movingLines);
  const changed = createChangedHexagram(lines, movingLines);

  return buildResult({
    method: "liuyao",
    methodLabel: "六爻",
    question,
    primary,
    changed,
    movingLines,
    contextList: [
      { label: "起卦方式", value: "三枚硬币六次起卦" },
      { label: "动爻", value: movingLines.length ? movingLinesLabel(movingLines) : "静卦" },
      { label: "卦势", value: primary.name },
      {
        label: "六次结果",
        value: tosses.map((item) => `第${item.index}爻${item.label}`).join(" / ")
      }
    ],
    recordedAt: new Date()
  });
}

function buildResult({
  method,
  methodLabel,
  question,
  primary,
  changed,
  movingLines,
  contextList,
  recordedAt = new Date()
}) {
  const now = recordedAt instanceof Date ? recordedAt : new Date(recordedAt);
  const interpretation = buildInterpretation({
    method,
    question,
    primary,
    changed,
    movingLines
  });

  return {
    id: createId(),
    method,
    methodLabel,
    question,
    primary,
    changed,
    movingLines,
    movingLinesLabel: movingLines.length ? movingLinesLabel(movingLines) : "静卦",
    contextList,
    createdAt: now.toISOString(),
    createdAtLabel: formatDate(now),
    interpretation,
    aiText: ""
  };
}

function buildInterpretation({ question, primary, changed, movingLines }) {
  const domain = inferDomain(question);
  const domainGuide = DOMAIN_GUIDANCE[domain];
  const sameHexagram = primary.name === changed.name;
  const motionGuide = movingLines.length
    ? movingLines.map((line) => LINE_GUIDANCE[line]).join(" ")
    : "本次为静卦，事情更适合按既定节奏推进，不必为了求快而频繁变招。";

  const transition = sameHexagram
    ? `本卦与变卦同为“${primary.name}”，说明主题比较集中，越是稳住核心，越容易看到成果。`
    : `本卦由“${primary.name}”转向“${changed.name}”，代表局势并非僵住，而是在变化中寻找新的着力点。`;

  return {
    headline: `${primary.name} · ${domainGuide.label}启示`,
    overview: `外势见 ${primary.upper.name} 之 ${primary.upper.energy}，内里需 ${primary.lower.name} 之 ${primary.lower.energy}。${transition}`,
    reading: `${domainGuide.reading} ${motionGuide} ${primary.upper.guidance} ${primary.lower.guidance}`,
    advice: [
      domainGuide.actions[0],
      domainGuide.actions[1],
      domainGuide.actions[2],
      "把这次卦意当作整理思路的镜子，而不是替你代做决定。"
    ]
  };
}

async function requestAiInterpretation() {
  if (!state.result || !state.config.llmEnabled || state.ai.loading || state.ai.text || state.result.aiText) {
    return;
  }

  state.ai.loading = true;
  state.ai.error = "";
  render();

  try {
    const response = await fetch("/api/interpret", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        method: state.result.methodLabel,
        question: state.result.question,
        primary: simplifyHexagram(state.result.primary),
        changed: simplifyHexagram(state.result.changed),
        movingLines: state.result.movingLines,
        context: state.result.contextList
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.detail || data?.error || "AI 解卦请求失败");
    }

    state.ai.text = data.text || "";
    state.ai.error = "";
    state.result.aiText = state.ai.text;
    updateHistoryEntry(state.result.id, { aiText: state.ai.text });
  } catch (error) {
    state.ai.error = error instanceof Error ? error.message : "AI 解卦请求失败";
  } finally {
    state.ai.loading = false;
    render();
  }
}

async function saveResultAsImage() {
  if (!state.result || state.share.loading) {
    return;
  }

  state.share.loading = true;
  state.share.error = "";
  render();

  try {
    if (state.result.aiText) {
      try {
        await loadMarkdownRenderer();
        render();
      } catch {
        // Keep plain-text fallback if markdown enhancement fails to warm up.
      }
    }

    await waitForNextFrame();
    await waitForNextFrame();

    const card = document.getElementById(SHARE_CARD_ID);
    if (!(card instanceof HTMLElement)) {
      throw new Error("未找到可导出的卦图。");
    }

    await waitForShareAssets(card);

    const htmlToImage = await loadHtmlToImage();
    if (!htmlToImage?.toPng) {
      throw new Error("图片导出能力尚未加载完成。");
    }

    const dataUrl = await htmlToImage.toPng(card, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#f4ecdd",
      width: card.scrollWidth,
      height: card.scrollHeight
    });

    downloadDataUrl(dataUrl, buildShareFileName(state.result));
  } catch (error) {
    state.share.error = error instanceof Error ? error.message : "保存卦图失败，请稍后再试。";
  } finally {
    state.share.loading = false;
    render();
  }
}

function loadHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryEntry(result) {
  state.history = [result, ...state.history.filter((item) => item.id !== result.id)].slice(0, 36);
  persistHistory();
}

function updateHistoryEntry(id, patch) {
  state.history = state.history.map((item) => (item.id === id ? { ...item, ...patch } : item));
  persistHistory();
}

function persistHistory() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  } catch {
    // ignore quota errors
  }
}

function createHexagramFromTrigrams(upper, lower, movingLines = []) {
  return createHexagramFromLines([...lower.lines, ...upper.lines], movingLines);
}

function createHexagramFromLines(lines, movingLines = []) {
  const lower = TRIGRAM_BY_LINES.get(lines.slice(0, 3).join(""));
  const upper = TRIGRAM_BY_LINES.get(lines.slice(3, 6).join(""));
  const key = `${upper.name}-${lower.name}`;

  return {
    key,
    name: HEXAGRAM_NAMES[key] || `${upper.element}${lower.element}卦`,
    upper,
    lower,
    lines: [...lines],
    movingLines: [...movingLines]
  };
}

function createChangedHexagram(lines, movingLines) {
  const nextLines = lines.map((bit, index) =>
    movingLines.includes(index + 1) ? (bit === 1 ? 0 : 1) : bit
  );
  return createHexagramFromLines(nextLines, []);
}

function createCoinToss(index) {
  const coins = Array.from({ length: 3 }, () => (Math.random() > 0.5 ? 1 : 0));
  const yangCount = coins.reduce((sum, bit) => sum + bit, 0);
  const value = yangCount * 3 + (3 - yangCount) * 2;
  const mapping = {
    6: { label: "老阴", bit: 0, moving: true },
    7: { label: "少阳", bit: 1, moving: false },
    8: { label: "少阴", bit: 0, moving: false },
    9: { label: "老阳", bit: 1, moving: true }
  };

  return {
    index,
    coins,
    value,
    ...mapping[value]
  };
}

function getLunarInfo(date) {
  const formatter = new Intl.DateTimeFormat("zh-Hans-u-ca-chinese", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const parts = formatter.formatToParts(date);
  const yearName = parts.find((item) => item.type === "yearName")?.value || "甲子";
  const monthLabel = parts.find((item) => item.type === "month")?.value || "正月";
  const dayRaw = parts.find((item) => item.type === "day")?.value || "1";
  const day = parseLunarDay(dayRaw);
  const yearBranchName = yearName.slice(-1);
  const yearBranchNumber =
    EARTHLY_BRANCHES.find((item) => item.name === yearBranchName)?.number || 1;

  return {
    yearName,
    yearBranchName,
    yearBranchNumber,
    month: parseLunarMonth(monthLabel),
    day,
    display: `${yearName}年 ${monthLabel}${formatLunarDay(day)}`
  };
}

function getHourBranch(hour) {
  if (hour === 23 || hour === 0) {
    return EARTHLY_BRANCHES[0];
  }

  return EARTHLY_BRANCHES.find((item) => item.hours.includes(hour)) || EARTHLY_BRANCHES[0];
}

function parseLunarMonth(label) {
  const clean = label.replace("闰", "");
  if (LUNAR_MONTHS[clean]) {
    return LUNAR_MONTHS[clean];
  }

  const numeric = clean.match(/\d+/);
  return numeric ? parseInt(numeric[0], 10) : 1;
}

function formatLunarDay(day) {
  return LUNAR_DAYS[day] || `初${day}`;
}

function parseLunarDay(label) {
  const numeric = parseInt(label, 10);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  const dayEntry = Object.entries(LUNAR_DAYS).find(([, dayName]) => dayName === label);
  return dayEntry ? parseInt(dayEntry[0], 10) : 1;
}

function inferDomain(question) {
  const text = question.toLowerCase();

  if (/(工作|事业|项目|升职|跳槽|创业|合作|offer)/.test(text)) {
    return "career";
  }

  if (/(感情|恋爱|婚姻|关系|复合|喜欢|相处)/.test(text)) {
    return "love";
  }

  if (/(考试|学习|学业|论文|面试|备考|申请)/.test(text)) {
    return "study";
  }

  if (/(钱|财|投资|收入|副业|生意|回款|消费)/.test(text)) {
    return "wealth";
  }

  if (/(健康|身体|睡眠|焦虑|情绪|恢复|状态)/.test(text)) {
    return "health";
  }

  return "general";
}

function movingLinesLabel(lines) {
  return lines.map((line) => `${lineName(line)}动`).join("、");
}

function lineName(line) {
  return {
    1: "初爻",
    2: "二爻",
    3: "三爻",
    4: "四爻",
    5: "五爻",
    6: "上爻"
  }[line];
}

function simplifyHexagram(hexagram) {
  return {
    name: hexagram.name,
    upper: `${hexagram.upper.name}${hexagram.upper.element}`,
    lower: `${hexagram.lower.name}${hexagram.lower.element}`,
    lines: hexagram.lines
  };
}

function wrapMod(number, mod) {
  const remainder = number % mod;
  return remainder === 0 ? mod : remainder;
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMarkdown(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  if (!markdownRenderer.marked || !markdownRenderer.domPurify) {
    void loadMarkdownRenderer().catch(() => {});
    return renderMarkdownFallback(text);
  }

  const rawHtml = markdownRenderer.marked.parse(text);
  const cleanHtml = markdownRenderer.domPurify.sanitize(rawHtml);
  const template = document.createElement("template");

  template.innerHTML = cleanHtml;

  template.content.querySelectorAll("a[href]").forEach((link) => {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noreferrer noopener");
  });

  return template.innerHTML;
}

function renderMarkdownFallback(value) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

async function loadMarkdownRenderer() {
  if (markdownRenderer.marked && markdownRenderer.domPurify) {
    return markdownRenderer;
  }

  if (!deferredAssets.markdown) {
    deferredAssets.markdown = Promise.all([
      import("./vendor/purify.es.mjs"),
      import("./vendor/marked.esm.js")
    ])
      .then(([domPurifyModule, markedModule]) => {
        markdownRenderer.domPurify = domPurifyModule.default;
        markdownRenderer.marked = markedModule.marked;
        markdownRenderer.marked.setOptions({
          gfm: true,
          breaks: true
        });

        if (state.ai.text || state.result?.aiText) {
          render();
        }

        return markdownRenderer;
      })
      .catch((error) => {
        deferredAssets.markdown = null;
        throw error;
      });
  }

  return deferredAssets.markdown;
}

async function loadHtmlToImage() {
  if (window.htmlToImage?.toPng) {
    return window.htmlToImage;
  }

  if (!deferredAssets.htmlToImage) {
    deferredAssets.htmlToImage = new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.async = true;
      script.src = "/vendor/html-to-image.js";
      script.dataset.vendor = "html-to-image";

      script.addEventListener(
        "load",
        () => {
          if (window.htmlToImage?.toPng) {
            resolve(window.htmlToImage);
            return;
          }

          reject(new Error("图片导出能力加载失败。"));
        },
        { once: true }
      );

      script.addEventListener(
        "error",
        () => reject(new Error("图片导出能力加载失败。")),
        { once: true }
      );

      document.head.append(script);
    }).catch((error) => {
      deferredAssets.htmlToImage = null;
      return Promise.reject(error);
    });
  }

  return deferredAssets.htmlToImage;
}

function getSiteShareUrl() {
  return new URL("/", window.location.href).toString();
}

function getShareQrUrl() {
  return `/api/share-qr?text=${encodeURIComponent(getSiteShareUrl())}`;
}

function buildShareFileName(result) {
  const date = new Date(result.createdAt);
  const year = `${date.getFullYear()}`;
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `bugua-${result.method}-${year}${month}${day}.png`;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

async function waitForShareAssets(node) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(images.map(waitForImageReady));
}

async function waitForImageReady(image) {
  if (image.complete && image.naturalWidth > 0) {
    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        // ignore decode errors for already loaded images
      }
    }
    return;
  }

  await new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("二维码载入失败，请稍后再试。"));
    };

    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
  });
}

function waitForNextFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function formatDate(dateInput) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function toDateTimeLocalValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    state.config.llmEnabled = Boolean(data.llmEnabled);
    state.config.model = data.model || null;
  } catch {
    state.config.llmEnabled = false;
    state.config.model = null;
  } finally {
    render();
  }
}
