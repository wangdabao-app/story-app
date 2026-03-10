"use client";

import { useEffect, useMemo, useState } from "react";

type SavedStory = {
  id: string;
  title: string;
  story: string;
  childName: string;
  char1: string;
  char2: string;
  relation: string;
  scene: string;
  theme: string;
  length: string;
  createdAt: string;
};

const randomCharacters1 = ["豆豆小熊", "团团小兔", "圆圆小猫", "乐乐小狐狸", "阿星小恐龙", "小云朵"];
const randomCharacters2 = ["星星萤火虫", "月牙小鹿", "泡泡小鸭", "软软小熊", "小海豚", "小松果"];
const randomRelations = ["好朋友", "兄妹", "姐弟", "同学", "邻居", "小伙伴"];
const randomScenes = ["森林小屋", "云朵村", "月亮船", "海边小屋", "星星花园", "彩虹山坡"];
const randomThemes = ["不怕黑", "勇敢", "分享", "交朋友", "自信", "诚实"];

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
    localStorage.setItem("moonstory-saved-stories", JSON.stringify(savedStories));
  }, [savedStories]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const canGenerate = useMemo(() => {
    return char1 && char2 && relation && scene && theme && !loading;
  }, [char1, char2, relation, scene, theme, loading]);

  const fillRandomStoryInputs = () => {
    setChar1(pickOne(randomCharacters1));
    setChar2(pickOne(randomCharacters2));
    setRelation(pickOne(randomRelations));
    setScene(pickOne(randomScenes));
    setTheme(pickOne(randomThemes));
    setLength(pickOne(["短故事（3分钟）", "标准（5分钟）", "长故事（8分钟）"]));
    setError("");
  };

  const generateStory = async () => {
    setError("");
    setStoryTip("");

    if (!char1 || !char2 || !relation || !scene || !theme) {
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
        body: JSON.stringify({
          childName,
          char1,
          char2,
          relation,
          scene,
          theme,
          length,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "故事生成失败，请稍后再试。");
        return;
      }

      setTitle(data.title || "今晚的小故事");
      setStory(data.story || "");
      setStoryTip(data.storyTip || "");
    } catch {
      setError("网络开小差了，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  const readStory = () => {
    if (!story || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(`${title}。${story}`);
    utterance.lang = "zh-CN";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const stopReading = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const saveCurrentStory = () => {
    if (!story) return;

    const newItem: SavedStory = {
      id: crypto.randomUUID(),
      title: title || "今晚的小故事",
      story,
      childName,
      char1,
      char2,
      relation,
      scene,
      theme,
      length,
      createdAt: new Date().toISOString(),
    };

    setSavedStories((prev) => [newItem, ...prev]);
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
    setError("");
    setStoryTip("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSavedStory = (id: string) => {
    setSavedStories((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm text-orange-500">专为家长设计的睡前故事工具</p>
          <h1 className="text-4xl font-bold tracking-tight text-orange-600">MoonStory</h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            AI睡前故事助手 · 帮家长轻松定制今晚的故事，让讲故事变得简单。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-3xl border border-orange-100 bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">定制今晚的故事</h2>

            <div className="space-y-3">
              <input
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="孩子名字（可选）"
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400"
              />

              <input
                value={char1}
                onChange={(e) => setChar1(e.target.value)}
                placeholder="人物1（例如：豆豆小熊）"
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400"
              />

              <input
                value={char2}
                onChange={(e) => setChar2(e.target.value)}
                placeholder="人物2（例如：星星萤火虫）"
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400"
              />

              <input
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="人物关系（例如：好朋友）"
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400"
              />

              <input
                value={scene}
                onChange={(e) => setScene(e.target.value)}
                placeholder="故事场景（例如：森林小屋）"
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400"
              />

              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="故事主题（例如：不怕黑）"
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400"
              />

              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400"
              >
                <option>短故事（3分钟）</option>
                <option>标准（5分钟）</option>
                <option>长故事（8分钟）</option>
              </select>
            </div>

            {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>}

            <div className="mt-5 grid gap-3">
              <button
                onClick={generateStory}
                disabled={!canGenerate}
                className="rounded-2xl bg-orange-400 px-4 py-3 font-medium text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "生成中..." : "生成今晚的故事"}
              </button>

              <button
                onClick={fillRandomStoryInputs}
                className="rounded-2xl border border-orange-200 bg-white px-4 py-3 font-medium text-orange-500 transition hover:bg-orange-50"
              >
                🎲 随机生成一个故事
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={readStory}
                  disabled={!story || isSpeaking}
                  className="rounded-2xl border border-orange-200 bg-white px-4 py-3 font-medium text-orange-500 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  🔊 朗读故事
                </button>

                <button
                  onClick={stopReading}
                  disabled={!isSpeaking}
                  className="rounded-2xl border border-orange-200 bg-white px-4 py-3 font-medium text-orange-500 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  停止朗读
                </button>
              </div>

              <button
                onClick={saveCurrentStory}
                disabled={!story}
                className="rounded-2xl border border-orange-200 bg-white px-4 py-3 font-medium text-orange-500 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ⭐ 收藏这个故事
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-orange-600">建议输入示例</p>
              <p className="mt-2">孩子名字：小米</p>
              <p>人物1：豆豆小熊</p>
              <p>人物2：星星萤火虫</p>
              <p>关系：好朋友</p>
              <p>场景：森林小屋</p>
              <p>主题：不怕黑</p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-orange-100 bg-white p-8 shadow-sm">
              {!story ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[24px] bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center text-gray-500">
                  <div>
                    <div className="mb-4 text-5xl">🌙</div>
                    <p className="text-lg font-medium text-gray-700">今晚的故事还没开始</p>
                    <p className="mt-2 text-sm text-gray-500">
                      输入几个关键词，MoonStory 会帮你准备一篇适合睡前讲给孩子听的温柔故事。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] bg-gradient-to-br from-amber-50 to-yellow-50 p-6">
                  <p className="mb-2 text-sm text-orange-500">今晚的睡前故事</p>
                  <h2 className="mb-5 text-3xl font-bold text-orange-600">{title}</h2>
                  <div className="whitespace-pre-line text-[18px] leading-9 text-gray-700">{story}</div>

                  {storyTip && (
                    <div className="mt-6 rounded-2xl bg-white/70 p-4">
                      <p className="mb-2 text-sm font-semibold text-orange-500">讲故事小提示</p>
                      <p className="whitespace-pre-line text-sm leading-7 text-gray-600">{storyTip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">我的收藏</h3>
                <span className="text-sm text-gray-400">{savedStories.length} 个故事</span>
              </div>

              {savedStories.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-gray-500">
                  还没有收藏故事，先生成一个试试吧。
                </div>
              ) : (
                <div className="space-y-3">
                  {savedStories.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-lg font-semibold text-orange-600">{item.title}</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            主题：{item.theme} · {formatTime(item.createdAt)}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{item.story}</p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => loadSavedStory(item)}
                            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-orange-500 shadow-sm transition hover:bg-orange-100"
                          >
                            查看
                          </button>
                          <button
                            onClick={() => deleteSavedStory(item.id)}
                            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-red-500 shadow-sm transition hover:bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}