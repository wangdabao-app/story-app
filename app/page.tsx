"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SavedStory = {
  id: string;
  title: string;
  story: string;
  storyTip: string;
  childName: string;
  char1: string;
  char2: string;
  relation: string;
  scene: string;
  theme: string;
  length: string;
  createdAt: string;
};

const randomCharacters1 = [
  "豆豆小熊",
  "团团小兔",
  "圆圆小猫",
  "乐乐小狐狸",
  "阿星小恐龙",
  "小云朵",
  "叮叮小松鼠",
  "暖暖小刺猬",
  "咕咕小鸽子",
  "糯糯小熊猫",
];
const randomCharacters2 = [
  "星星萤火虫",
  "月牙小鹿",
  "泡泡小鸭",
  "软软小熊",
  "小海豚",
  "小松果",
  "小瓢虫",
  "小海星",
  "小青蛙",
  "小雪团",
];
const randomRelations = ["好朋友", "兄妹", "姐弟", "同学", "邻居", "小伙伴", "搭档", "同路人"];
const randomScenes = [
  "森林小屋",
  "云朵村",
  "月亮船",
  "海边小屋",
  "星星花园",
  "彩虹山坡",
  "蘑菇小镇",
  "萤火虫小路",
  "棉花糖云海",
  "风铃小院",
];
const randomThemes = ["不怕黑", "勇敢", "分享", "交朋友", "自信", "诚实", "耐心", "谢谢你"];

const RECENT_RANDOM_KEY = "moonstory-recent-random-keys";

function pickOne<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function Home() {
  const [childName, setChildName] = useState("");
  const [char1, setChar1] = useState("");
  const [char2, setChar2] = useState("");
  const [relation, setRelation] = useState("好朋友");
  const [scene, setScene] = useState("");
  const [theme, setTheme] = useState("");
  const [length, setLength] = useState("标准（5分钟）");

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [storyTip, setStoryTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [error, setError] = useState("");
  const [activeMobileTab, setActiveMobileTab] = useState<"custom" | "story" | "favorites">("custom");
  const [isMobile, setIsMobile] = useState(false);
  const [showAdviceOnMobile, setShowAdviceOnMobile] = useState(false);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeFavorite, setActiveFavorite] = useState<SavedStory | null>(null);
  const [recentRandomKeys, setRecentRandomKeys] = useState<string[]>([]);

  const speechQueueRef = useRef<string[]>([]);
  const speechCancelledRef = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem("moonstory-saved-stories");
    if (raw) {
      try {
        setSavedStories(JSON.parse(raw));
      } catch {
        setSavedStories([]);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(RECENT_RANDOM_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setRecentRandomKeys(parsed.filter((x) => typeof x === "string"));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    localStorage.setItem("moonstory-saved-stories", JSON.stringify(savedStories));
  }, [savedStories]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        RECENT_RANDOM_KEY,
        JSON.stringify(recentRandomKeys.slice(0, 30)),
      );
    } catch {
      // ignore
    }
  }, [recentRandomKeys]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ message, id });
    window.setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t));
    }, 1800);
  };

  const canGenerate = useMemo(() => {
    return char1 && char2 && relation && scene && theme && !loading;
  }, [char1, char2, relation, scene, theme, loading]);

  const canRead = Boolean(story) && !isSpeaking;
  const canStop = isSpeaking;

  const isCurrentStorySaved = useMemo(() => {
    if (!story) return false;
    const normalized = story.trim();
    return savedStories.some((s) => s.story.trim() === normalized);
  }, [savedStories, story]);

  const storyParagraphs = useMemo(() => {
    if (!story) return [];
    return story
      .split(/\n+/g)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [story]);

  const fillRandomStoryInputs = () => {
    const makeKey = (v: {
      c1: string;
      c2: string;
      r: string;
      s: string;
      t: string;
      l: string;
    }) => `${v.c1}|${v.c2}|${v.r}|${v.s}|${v.t}|${v.l}`;

    const currentKey = makeKey({
      c1: char1,
      c2: char2,
      r: relation,
      s: scene,
      t: theme,
      l: length,
    });

    const recentSet = new Set(recentRandomKeys);

    let picked = {
      c1: "",
      c2: "",
      r: "",
      s: "",
      t: "",
      l: "",
    };

    // 多尝试几次，尽量避开“最近用过的组合”和“当前组合”
    for (let i = 0; i < 14; i += 1) {
      const candidate = {
        c1: pickOne(randomCharacters1),
        c2: pickOne(randomCharacters2),
        r: pickOne(randomRelations),
        s: pickOne(randomScenes),
        t: pickOne(randomThemes),
        l: pickOne(["短故事（3分钟）", "标准（5分钟）", "长故事（8分钟）"]),
      };

      // 避免人物撞名（偶发）
      if (candidate.c1 === candidate.c2) continue;

      const k = makeKey(candidate);
      if (k === currentKey) continue;
      if (recentSet.has(k)) continue;

      picked = candidate;
      break;
    }

    // 若实在避不开，就退化为普通随机
    if (!picked.c1) {
      picked = {
        c1: pickOne(randomCharacters1),
        c2: pickOne(randomCharacters2),
        r: pickOne(randomRelations),
        s: pickOne(randomScenes),
        t: pickOne(randomThemes),
        l: pickOne(["短故事（3分钟）", "标准（5分钟）", "长故事（8分钟）"]),
      };
    }

    setChar1(picked.c1);
    setChar2(picked.c2);
    setRelation(picked.r);
    setScene(picked.s);
    setTheme(picked.t);
    setLength(picked.l);
    setError("");

    const newKey = makeKey(picked);
    setRecentRandomKeys((prev) => [newKey, ...prev.filter((x) => x !== newKey)].slice(0, 30));
    showToast("已为你换一组新设定");
  };

  type StoryApiPayload = {
    childName: string;
    char1: string;
    char2: string;
    relation: string;
    scene: string;
    theme: string;
    length: string;
    previousStory: string;
    previousTitle: string;
    continueStory: boolean;
  };

  const requestStory = async (payload: StoryApiPayload, errorPrefix: string) => {
    setError("");
    setStoryTip("");

    if (!payload.char1 || !payload.char2 || !payload.relation || !payload.scene || !payload.theme) {
      setError("请先把人物、关系、场景和主题填写完整。");
      return;
    }

    try {
      setLoading(true);
      stopReading();

      const res = await fetch("/api/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `${errorPrefix}失败，请稍后再试。`);
        showToast(data.error || `${errorPrefix}失败`);
        return;
      }

      setTitle(data.title || "今晚的小故事");
      setStory(data.story || "");
      setStoryTip(data.storyTip || "");
      if (isMobile) {
        setActiveMobileTab("story");
      }
      showToast(payload.continueStory ? "下一集已生成" : "故事已生成");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("网络开小差了，请稍后再试。");
      showToast("网络开小差了");
    } finally {
      setLoading(false);
    }
  };

  const generateStory = async () => {
    await requestStory(
      {
        childName,
        char1,
        char2,
        relation,
        scene,
        theme,
        length,
        previousStory: "",
        previousTitle: "",
        continueStory: false,
      },
      "故事生成",
    );
  };

  const generateNextStory = async () => {
    if (!story) {
      setError("请先生成一个故事，再继续下一集。");
      return;
    }

    await requestStory(
      {
        childName,
        char1,
        char2,
        relation,
        scene,
        theme,
        length,
        previousStory: story,
        previousTitle: title,
        continueStory: true,
      },
      "下一集生成",
    );
  };

  const readStory = () => {
    if (isSpeaking) return;
    if (!story) return;
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器不支持朗读");
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    // iOS/部分浏览器需要先触发 voices 初始化
    try {
      synth.getVoices();
    } catch {
      // ignore
    }

    const raw = `${title ? `${title}。` : ""}${story}`.trim();
    const normalized = raw.replace(/\s+/g, " ");

    // 将长文本拆成更稳的短段，避免移动端“无声/直接结束”
    const splitIntoChunks = (text: string, maxLen = 120) => {
      const sentences = text
        .split(/(?<=[。！？!?…])|\n+/g)
        .map((s) => s.trim())
        .filter(Boolean);

      const chunks: string[] = [];
      let buf = "";
      for (const s of sentences) {
        if (!buf) {
          buf = s;
          continue;
        }
        if ((buf + s).length <= maxLen) {
          buf += s;
        } else {
          chunks.push(buf);
          buf = s;
        }
      }
      if (buf) chunks.push(buf);
      return chunks;
    };

    speechCancelledRef.current = false;
    speechQueueRef.current = splitIntoChunks(normalized, 140);

    const speakNext = () => {
      if (speechCancelledRef.current) return;
      const next = speechQueueRef.current.shift();
      if (!next) {
        setIsSpeaking(false);
        return;
      }

      const u = new SpeechSynthesisUtterance(next);
      u.lang = "zh-CN";
      u.rate = 0.9;
      u.pitch = 1;
      u.onend = () => speakNext();
      u.onerror = () => {
        setIsSpeaking(false);
        showToast("朗读失败，建议换浏览器试试");
      };

      try {
        synth.speak(u);
      } catch {
        setIsSpeaking(false);
        showToast("朗读失败，建议换浏览器试试");
      }
    };

    setIsSpeaking(true);
    showToast("开始朗读");
    speakNext();
  };

  const stopReading = () => {
    if (!isSpeaking) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speechCancelledRef.current = true;
    speechQueueRef.current = [];
    setIsSpeaking(false);
    showToast("已停止朗读");
  };

  const saveCurrentStory = () => {
    if (!story) return;
    if (saving) return;
    if (isCurrentStorySaved) {
      showToast("已收藏，不重复添加");
      return;
    }

    const newItem: SavedStory = {
      id: crypto.randomUUID(),
      title: title || "今晚的小故事",
      story,
      storyTip,
      childName,
      char1,
      char2,
      relation,
      scene,
      theme,
      length,
      createdAt: new Date().toISOString(),
    };

    setSaving(true);
    setSavedStories((prev) => {
      showToast("已收藏");
      return [newItem, ...prev];
    });

    window.setTimeout(() => setSaving(false), 600);
  };

  const continueFromSavedStory = async (item: SavedStory) => {
    stopReading();
    setChildName(item.childName);
    setChar1(item.char1);
    setChar2(item.char2);
    setRelation(item.relation);
    setScene(item.scene);
    setTheme(item.theme);
    setLength(item.length);
    setError("");

    await requestStory(
      {
        childName: item.childName,
        char1: item.char1,
        char2: item.char2,
        relation: item.relation,
        scene: item.scene,
        theme: item.theme,
        length: item.length,
        previousStory: item.story,
        previousTitle: item.title,
        continueStory: true,
      },
      "下一集生成",
    );
  };

  const loadSavedStory = (item: SavedStory) => {
    stopReading();
    setChildName(item.childName);
    setChar1(item.char1);
    setChar2(item.char2);
    setRelation(item.relation);
    setScene(item.scene);
    setTheme(item.theme);
    setLength(item.length);
    setTitle(item.title);
    setStory(item.story);
    setStoryTip(item.storyTip || "");
    setError("");
    if (isMobile) {
      setActiveMobileTab("story");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSavedStory = (id: string) => {
    setSavedStories((prev) => prev.filter((item) => item.id !== id));
    setActiveFavorite((fav) => (fav?.id === id ? null : fav));
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-md px-3 pb-28 pt-4 sm:max-w-2xl sm:px-6 sm:pb-8">
        <div className="mb-4 rounded-[28px] bg-gradient-to-br from-orange-400 to-amber-300 px-5 py-6 text-white shadow-sm">
          <p className="text-xs opacity-90">AI睡前故事助手</p>
          <h1 className="mt-1 text-3xl font-bold">MoonStory</h1>
          <p className="mt-2 text-sm leading-6 text-white/90">
            帮家长快速定制今晚的故事，讲故事更轻松，孩子更容易听进去。
          </p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-orange-500">步骤1</p>
            <p className="mt-1 whitespace-nowrap text-xs leading-5 text-gray-600">填关键词</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-orange-500">步骤2</p>
            <p className="mt-1 whitespace-nowrap text-xs leading-5 text-gray-600">生成故事</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-orange-500">步骤3</p>
            <p className="mt-1 whitespace-nowrap text-xs leading-5 text-gray-600">喜欢就续集</p>
          </div>
        </div>

        {/* Mobile tabs (reduce scroll) */}
        <div className="sticky top-0 z-10 -mx-3 mb-4 bg-[#f7f7f7]/90 px-3 py-2 backdrop-blur sm:hidden">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveMobileTab("custom")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                activeMobileTab === "custom"
                  ? "bg-orange-400 text-white"
                  : "bg-white text-gray-600",
              ].join(" ")}
            >
              定制
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab("story")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                activeMobileTab === "story"
                  ? "bg-orange-400 text-white"
                  : "bg-white text-gray-600",
              ].join(" ")}
            >
              故事
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab("favorites")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                activeMobileTab === "favorites"
                  ? "bg-orange-400 text-white"
                  : "bg-white text-gray-600",
              ].join(" ")}
            >
              收藏
            </button>
          </div>
        </div>

        <section
          className={[
            "mb-4 rounded-[24px] bg-white p-4 shadow-sm",
            activeMobileTab !== "custom" ? "hidden sm:block" : "",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">定制今晚的故事</h2>
            <button
              onClick={fillRandomStoryInputs}
              className="rounded-full bg-orange-50 px-3.5 py-2 text-sm font-semibold text-orange-500"
            >
              🎲 随机
            </button>
          </div>

          <div className="space-y-3">
            <input
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="孩子名字（可选）"
              className="w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3.5 text-base outline-none focus:border-orange-300"
            />
            <input
              value={char1}
              onChange={(e) => setChar1(e.target.value)}
              placeholder="人物1（例如：豆豆小熊）"
              className="w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3.5 text-base outline-none focus:border-orange-300"
            />
            <input
              value={char2}
              onChange={(e) => setChar2(e.target.value)}
              placeholder="人物2（例如：星星萤火虫）"
              className="w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3.5 text-base outline-none focus:border-orange-300"
            />
            <input
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              placeholder="人物关系（例如：好朋友）"
              className="w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3.5 text-base outline-none focus:border-orange-300"
            />
            <input
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="故事场景（例如：森林小屋）"
              className="w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3.5 text-base outline-none focus:border-orange-300"
            />
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="故事主题（例如：不怕黑）"
              className="w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3.5 text-base outline-none focus:border-orange-300"
            />
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-[#fafafa] px-4 py-3.5 text-base outline-none focus:border-orange-300"
            >
              <option>短故事（3分钟）</option>
              <option>标准（5分钟）</option>
              <option>长故事（8分钟）</option>
            </select>
          </div>

          {error && <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-500">{error}</div>}

          <div className="mt-4 space-y-3">
            <button
              onClick={generateStory}
              disabled={!canGenerate}
              className="w-full rounded-2xl bg-orange-400 px-4 py-3.5 text-base font-medium text-white disabled:opacity-50"
            >
              {loading ? "生成中..." : "生成故事"}
            </button>

            <button
              onClick={generateNextStory}
              disabled={!story || loading}
              className="w-full rounded-2xl bg-purple-500 px-4 py-3.5 text-base font-medium text-white disabled:opacity-50"
            >
              📚 继续下一集
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={readStory}
                disabled={!canRead}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                🔊 朗读
              </button>
              <button
                onClick={stopReading}
                disabled={!canStop}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                停止
              </button>
              <button
                onClick={saveCurrentStory}
                disabled={!story || isCurrentStorySaved}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                {isCurrentStorySaved ? "已收藏" : "⭐ 收藏"}
              </button>
            </div>
          </div>
        </section>

        <section
          className={[
            "mb-4 rounded-[24px] bg-white p-4 shadow-sm",
            activeMobileTab !== "story" ? "hidden sm:block" : "",
          ].join(" ")}
        >
          {!story ? (
            <div className="rounded-[20px] bg-[#fff7ed] px-4 py-10 text-center">
              <div className="mb-3 text-4xl">🌙</div>
              <p className="text-base font-medium text-gray-700">今晚的故事还没开始</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                先输入几个关键词，MoonStory 会帮你准备一篇适合睡前讲给孩子听的故事。
              </p>
              <button
                type="button"
                onClick={() => setActiveMobileTab("custom")}
                className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-orange-600 shadow-sm sm:hidden"
              >
                去定制并生成 →
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-[20px] bg-[#fff7ed] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-orange-500">今晚的睡前故事</p>
                  <button
                    onClick={saveCurrentStory}
                    disabled={!story || isCurrentStorySaved}
                    className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-orange-600 shadow-sm disabled:opacity-50"
                  >
                    {isCurrentStorySaved ? "已收藏" : "⭐ 收藏"}
                  </button>
                </div>
                <h2 className="mb-4 text-2xl font-bold leading-tight text-orange-600">{title}</h2>
                <div className="text-[17px] leading-8 text-gray-700">
                  {storyParagraphs.map((p, idx) => (
                    <p key={idx} className="mb-3 last:mb-0">
                      {p}
                    </p>
                  ))}
                </div>
              </div>

              {storyTip && (
                <div className="mt-3 rounded-[20px] bg-orange-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-orange-500">讲故事小提示</p>
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-600">{storyTip}</p>
                </div>
              )}

              {/* Mobile: collapsible advice to reduce scroll */}
              <div className="mt-3 sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowAdviceOnMobile((v) => !v)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-800"
                >
                  家长使用建议 {showAdviceOnMobile ? "▲" : "▼"}
                </button>
                {showAdviceOnMobile && (
                  <div className="mt-2 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="rounded-2xl bg-[#fafafa] p-4">
                      <p className="text-sm font-semibold text-orange-500">讲之前</p>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        可以先问孩子：“今晚你想听森林里的故事，还是月亮下的故事？”
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fafafa] p-4">
                      <p className="text-sm font-semibold text-orange-500">讲的时候</p>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        读到对话时稍微放慢一点，孩子更容易沉浸进去，也更愿意接着听。
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fafafa] p-4">
                      <p className="text-sm font-semibold text-orange-500">讲完后</p>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        如果孩子很喜欢这组角色，第二天直接继续下一集，慢慢形成固定的睡前仪式。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-[20px] bg-purple-50 p-4">
                <p className="text-sm font-semibold text-purple-600">孩子喜欢这篇故事？</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  可以直接继续下一集，沿用同样角色，把一个故事讲成一个连续系列。
                </p>
                <button
                  onClick={generateNextStory}
                  disabled={loading}
                  className="mt-3 w-full rounded-2xl bg-purple-500 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  📚 继续下一集
                </button>
              </div>
            </>
          )}
        </section>

        {/* Desktop: advice stays as a full section */}
        <section className="mb-4 hidden rounded-[24px] bg-white p-4 shadow-sm sm:block">
          <h3 className="mb-3 text-lg font-semibold text-gray-800">家长使用建议</h3>
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#fafafa] p-4">
              <p className="text-sm font-semibold text-orange-500">讲之前</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                可以先问孩子：“今晚你想听森林里的故事，还是月亮下的故事？”
              </p>
            </div>
            <div className="rounded-2xl bg-[#fafafa] p-4">
              <p className="text-sm font-semibold text-orange-500">讲的时候</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                读到对话时稍微放慢一点，孩子更容易沉浸进去，也更愿意接着听。
              </p>
            </div>
            <div className="rounded-2xl bg-[#fafafa] p-4">
              <p className="text-sm font-semibold text-orange-500">讲完后</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                如果孩子很喜欢这组角色，第二天直接继续下一集，慢慢形成固定的睡前仪式。
              </p>
            </div>
          </div>
        </section>

        <section
          className={[
            "rounded-[24px] bg-white p-4 shadow-sm",
            activeMobileTab !== "favorites" ? "hidden sm:block" : "",
          ].join(" ")}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">我的收藏</h3>
            <span className="text-xs text-gray-400">{savedStories.length} 个故事</span>
          </div>

          {savedStories.length === 0 ? (
            <div className="rounded-2xl bg-[#fafafa] px-4 py-8 text-center text-sm text-gray-500">
              还没有收藏故事，先生成一个试试吧。
            </div>
          ) : (
            <div className="space-y-3">
              {savedStories.map((item) => (
                <div key={item.id} className="rounded-2xl bg-[#fafafa] p-4">
                  <h4 className="text-base font-semibold text-orange-600">{item.title}</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    主题：{item.theme} · {formatTime(item.createdAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{item.story}</p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setActiveFavorite(item)}
                      className="whitespace-nowrap rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-orange-500"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => continueFromSavedStory(item)}
                      disabled={loading}
                      className="whitespace-nowrap rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-purple-600 disabled:opacity-50"
                    >
                      继续下一集
                    </button>
                    <button
                      onClick={() => deleteSavedStory(item.id)}
                      className="whitespace-nowrap rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-red-500"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mobile: bottom action bar (single-hand friendly) */}
        {activeMobileTab === "story" && !activeFavorite && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur sm:hidden">
            <div className="mx-auto max-w-md">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={readStory}
                  disabled={!canRead}
                  className="whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-3 text-xs font-semibold text-gray-700 disabled:opacity-50"
                >
                  朗读
                </button>
                <button
                  type="button"
                  onClick={stopReading}
                  disabled={!canStop}
                  className="whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-3 text-xs font-semibold text-gray-700 disabled:opacity-50"
                >
                  停止
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!story) return;
                    showToast("正在生成下一集…");
                    void generateNextStory();
                  }}
                  disabled={!story || loading}
                  className="whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-3 text-xs font-semibold text-purple-700 disabled:opacity-50"
                >
                  继续生成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-3 sm:hidden">
            <div className="rounded-full bg-gray-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
              {toast.message}
            </div>
          </div>
        )}

        {/* Favorite drawer/modal */}
        {activeFavorite && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-3 pb-24 sm:items-center sm:pb-0">
            <div className="w-full max-w-md rounded-[24px] bg-white shadow-xl sm:max-w-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-400">收藏故事</p>
                  <h4 className="mt-1 truncate text-lg font-semibold text-orange-600">
                    {activeFavorite.title}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500">
                    主题：{activeFavorite.theme} · {formatTime(activeFavorite.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveFavorite(null)}
                  className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                >
                  关闭
                </button>
              </div>

              <div className="max-h-[65vh] overflow-auto px-4 py-4 sm:px-6">
                <div className="text-[15px] leading-7 text-gray-700">
                  {activeFavorite.story
                    .split(/\n+/g)
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((p, idx) => (
                      <p key={idx} className="mb-3 last:mb-0">
                        {p}
                      </p>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-gray-100 px-4 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    loadSavedStory(activeFavorite);
                    setActiveFavorite(null);
                    showToast("已切换到该故事");
                  }}
                  className="whitespace-nowrap rounded-2xl bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-600"
                >
                  设为当前
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast("正在生成下一集…");
                    void continueFromSavedStory(activeFavorite);
                    setActiveFavorite(null);
                  }}
                  disabled={loading}
                  className="whitespace-nowrap rounded-2xl bg-purple-50 px-3 py-3 text-sm font-semibold text-purple-700 disabled:opacity-50"
                >
                  继续下一集
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedStory(activeFavorite.id)}
                  className="whitespace-nowrap rounded-2xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-600"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}