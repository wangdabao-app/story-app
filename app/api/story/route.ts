import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

function safeParseJson(raw: string) {
  if (!raw) return null;

  let text = raw.trim();

  // 去掉 markdown 代码块
  text = text.replace(/^```json\s*/i, "");
  text = text.replace(/^```\s*/i, "");
  text = text.replace(/\s*```$/i, "");

  // 如果前后有多余文字，尝试截取第一个完整 JSON 对象
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const {
      childName,
      char1,
      char2,
      relation,
      scene,
      theme,
      length,
      previousStory,
      previousTitle,
      continueStory,
    } = await req.json();

    if (!char1 || !char2 || !relation || !scene || !theme) {
      return NextResponse.json(
        { error: "请先把人物、关系、场景和主题都填写完整。" },
        { status: 400 }
      );
    }

    let lengthRule = "故事总长度控制在700-900字。";
    if (length === "短故事（3分钟）") {
      lengthRule = "故事总长度控制在400-600字。";
    } else if (length === "长故事（8分钟）") {
      lengthRule = "故事总长度控制在900-1200字。";
    }

    const prompt = `
你是一位擅长亲子陪伴场景的儿童睡前故事作者。

你的读者不是孩子本人，而是“家长”。
请生成一篇适合家长在睡前讲给 3-6 岁孩子听的中文故事。

已知设定：
- 孩子名字：${childName || "未提供"}
- 人物1：${char1}
- 人物2：${char2}
- 人物关系：${relation}
- 故事场景：${scene}
- 故事主题：${theme}
- 故事长度：${length || "标准（5分钟）"}

${continueStory && previousStory ? `
这是一个连续故事任务。
上一集的标题是：${previousTitle || "上一集"}
上一集的内容如下：
${previousStory}

请你在保留相同角色、关系、整体氛围的前提下，写“下一集”。
下一集必须自然承接上一集，不能像重新生成一个完全无关的新故事。
剧情要有一点新的小变化、新的小问题，但整体氛围仍然温暖、适合睡前。
` : `
这不是连续故事，请直接生成第一篇完整故事。
`}

写作要求：
1. 先输出一个简短、温柔、像绘本名字一样的标题。
2. 再写故事正文。
3. ${lengthRule}
4. 风格像“家长讲述稿”，家长拿到后可以直接读给孩子听。
5. 语言要温暖、简单、柔和，有画面感。
6. 必须包含 3-5 句简短自然的对话。
7. 结构必须清晰：
   - 开头：介绍角色和场景
   - 中间：出现一个轻微的小问题
   - 发展：角色一起解决问题
   - 结尾：安静、温柔、适合入睡
8. 不要恐怖、暴力、惩罚、成人内容，不要复杂说教。
9. 如果提供了孩子名字，请自然地、轻柔地融入故事，但不要太生硬。
10. 结尾要有明显助眠感。
11. 另外再给一段“讲故事小提示”，是给家长的，比如可以停顿哪里、可以问孩子什么问题。
12. 如果是连续故事，标题要明显像“下一集”，但不要直接写“第2集”也可以，用自然的方式延续。
13. 只返回 JSON，不要加 markdown，不要加解释，不要加前言后语。

返回格式必须严格是：
{
  "title": "故事标题",
  "story": "故事正文",
  "storyTip": "给家长的讲故事小提示"
}
`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1.0,
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = safeParseJson(content);

    if (!parsed) {
      return NextResponse.json(
        { error: "模型返回格式不正确，请再试一次。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: parsed.title || "今晚的小故事",
      story: parsed.story || "",
      storyTip: parsed.storyTip || "",
    });
  } catch (error) {
    console.error("生成故事失败：", error);
    return NextResponse.json(
      { error: "故事生成失败，请稍后再试。" },
      { status: 500 }
    );
  }
}