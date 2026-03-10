"use client";

import { useEffect, useMemo, useState } from "react";

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
          previousStory: "",
          previousTitle: "",
          continueStory: false,
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("网络开小差了，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  const generateNextStory = async () => {
    setError("");

    if (!story) {
      setError("请先生成一个故事，再继续下一集。");
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
          previousStory: story,
          previousTitle: title,
          continueStory: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "下一集生成失败，请稍后再试。");
        return;
      }

      setTitle(data.title || "新的故事");
      setStory(data.story || "");
      setStoryTip(data.storyTip || "");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    setStoryTip(item.storyTip || "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSavedStory = (id: string) => {
    setSavedStories((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-md px-3 pb-8 pt-4 sm:max-w-2xl sm:px-6">
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
            <p className="mt-1 text-xs leading-5 text-gray-600">填几个关键词</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-orange-500">步骤2</p>
            <p className="mt-1 text-xs leading-5 text-gray-600">生成故事稿</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-orange-500">步骤3</p>
            <p className="mt-1 text-xs leading-5 text-gray-600">喜欢就继续下一集</p>
          </div>
        </div>

        <section className="mb-4 rounded-[24px] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">定制今晚的故事</h2>
            <button
              onClick={fillRandomStoryInputs}
              className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-500"
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
              {loading ? "生成中..." : "生成今晚的故事"}
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
                disabled={!story || isSpeaking}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                🔊 朗读
              </button>
              <button
                onClick={stopReading}
                disabled={!isSpeaking}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                停止
              </button>
              <button
                onClick={saveCurrentStory}
                disabled={!story}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                ⭐ 收藏
              </button>
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-[24px] bg-white p-4 shadow-sm">
          {!story ? (
            <div className="rounded-[20px] bg-[#fff7ed] px-4 py-10 text-center">
              <div className="mb-3 text-4xl">🌙</div>
              <p className="text-base font-medium text-gray-700">今晚的故事还没开始</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                先输入几个关键词，MoonStory 会帮你准备一篇适合睡前讲给孩子听的故事。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-[20px] bg-[#fff7ed] p-4">
                <p className="mb-2 text-xs font-medium text-orange-500">今晚的睡前故事</p>
                <h2 className="mb-4 text-2xl font-bold leading-tight text-orange-600">{title}</h2>
                <div className="whitespace-pre-line text-[17px] leading-8 text-gray-700">{story}</div>
              </div>

              {storyTip && (
                <div className="mt-3 rounded-[20px] bg-orange-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-orange-500">讲故事小提示</p>
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-600">{storyTip}</p>
                </div>
              )}

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
                  📚 继续这个故事
                </button>
              </div>
            </>
          )}
        </section>

        <section className="mb-4 rounded-[24px] bg-white p-4 shadow-sm">
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

        <section className="rounded-[24px] bg-white p-4 shadow-sm">
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

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => loadSavedStory(item)}
                      className="rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-orange-500"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => deleteSavedStory(item.id)}
                      className="rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-red-500"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}