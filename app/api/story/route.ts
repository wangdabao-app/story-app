import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function POST(req: Request) {
  try {
    const { char1, char2, relation, scene, theme } = await req.json();

    if (!char1 || !char2 || !relation || !scene || !theme) {
      return NextResponse.json(
        { error: "请先把人物、关系、场景和主题都填写完整。" },
        { status: 400 }
      );
    }

    const prompt = `
请为3-6岁儿童创作一个中文睡前故事。

输入设定：
- 人物1：${char1}
- 人物2：${char2}
- 人物关系：${relation}
- 故事场景：${scene}
- 故事主题：${theme}

输出要求：
1. 先给一个简短温柔的故事标题。
2. 再写故事正文。
3. 故事总长度控制在700-900字。
4. 风格像绘本旁白，温暖、柔和、有画面感。
5. 必须包含3-5句简短自然对话。
6. 结构清晰：
   - 开头：介绍角色和场景
   - 中间：出现一个轻微的小问题
   - 发展：角色一起解决问题
   - 结尾：安静、温柔、适合入睡
7. 用词适合3-6岁儿童，句子不要太长。
8. 不要恐怖、暴力、惩罚、成人内容、复杂说教。
9. 结尾必须有明显助眠感。
10. 严格返回 JSON，不要加 markdown，不要加解释，格式如下：
{
  "title": "故事标题",
  "story": "故事正文"
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

    let parsed: { title?: string; story?: string } = {};

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "模型返回格式不正确，请再试一次。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: parsed.title || "今晚的小故事",
      story: parsed.story || "",
    });
  } catch (error) {
    console.error("生成故事失败：", error);
    return NextResponse.json(
      { error: "故事生成失败，请稍后再试。" },
      { status: 500 }
    );
  }
}