import crypto from "crypto";

type Bucket = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 req/min per client
const buckets = new Map<string, Bucket>();

const secretId = process.env.TENCENTCLOUD_SECRET_ID || "";
const secretKey = process.env.TENCENTCLOUD_SECRET_KEY || "";
const region = process.env.TENCENTCLOUD_REGION || "ap-guangzhou";
const voiceType = Number(process.env.TENCENTCLOUD_TTS_VOICE_TYPE || 101001);
const rawCodec = (process.env.TENCENTCLOUD_TTS_CODEC || "mp3").toLowerCase();
const codec = rawCodec === "wav" || rawCodec === "pcm" || rawCodec === "mp3" ? rawCodec : "mp3";
const speed = Number(process.env.TENCENTCLOUD_TTS_SPEED || 0);
const volume = Number(process.env.TENCENTCLOUD_TTS_VOLUME || 0);
const projectId = Number(process.env.TENCENTCLOUD_TTS_PROJECT_ID || 0);

const TENCENT_HOST = "tts.tencentcloudapi.com";
const TENCENT_SERVICE = "tts";
const TENCENT_ACTION = "TextToVoice";
const TENCENT_VERSION = "2019-08-23";

function getClientKey(req: Request): string {
  const header =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-vercel-forwarded-for") ||
    "";
  const ip = header.split(",")[0]?.trim();
  const ua = req.headers.get("user-agent") || "";
  return `${ip || "unknown"}|${ua.slice(0, 40)}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) return true;

  bucket.count += 1;
  return false;
}

export async function POST(req: Request) {
  try {
    if (!secretId || !secretKey) {
      return Response.json({ error: "腾讯云 TTS 凭证未配置。" }, { status: 500 });
    }

    const key = getClientKey(req);
    if (isRateLimited(key)) {
      return Response.json({ error: "请求过于频繁，请稍后再试。" }, { status: 429 });
    }

    const body = (await req.json()) as {
      text?: string;
      title?: string;
      speed?: number;
      voiceType?: number;
    };

    const text = (body.text || "").trim();
    const title = (body.title || "").trim();
    const merged = `${title ? `${title}。` : ""}${text}`.trim();

    if (!merged) {
      return Response.json({ error: "请提供要朗读的文本。" }, { status: 400 });
    }

    if (merged.length > 300) {
      return Response.json({ error: "单次文本过长，请分段朗读（<=300字）。" }, { status: 400 });
    }

    const selectedVoiceType = Number(body.voiceType || voiceType);
    const selectedSpeed = Number.isFinite(body.speed as number)
      ? Math.max(-2, Math.min(6, Number(body.speed)))
      : speed;

    const payload = {
      Text: merged,
      SessionId: crypto.randomUUID(),
      Volume: volume,
      Speed: selectedSpeed,
      VoiceType: selectedVoiceType,
      PrimaryLanguage: 1,
      Codec: codec,
      SampleRate: 16000,
      ProjectId: projectId,
    };

    const bodyString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

    const hashedRequestPayload = crypto.createHash("sha256").update(bodyString).digest("hex");
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${TENCENT_HOST}\n`;
    const signedHeaders = "content-type;host";
    const canonicalRequest = [
      "POST",
      "/",
      "",
      canonicalHeaders,
      signedHeaders,
      hashedRequestPayload,
    ].join("\n");

    const credentialScope = `${date}/${TENCENT_SERVICE}/tc3_request`;
    const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
    const stringToSign = [
      "TC3-HMAC-SHA256",
      String(timestamp),
      credentialScope,
      hashedCanonicalRequest,
    ].join("\n");

    const hmac = (key: Buffer | string, msg: string) =>
      crypto.createHmac("sha256", key).update(msg).digest();
    const secretDate = hmac(`TC3${secretKey}`, date);
    const secretService = hmac(secretDate, TENCENT_SERVICE);
    const secretSigning = hmac(secretService, "tc3_request");
    const signature = crypto
      .createHmac("sha256", secretSigning)
      .update(stringToSign)
      .digest("hex");

    const authorization =
      `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(`https://${TENCENT_HOST}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: TENCENT_HOST,
        "X-TC-Action": TENCENT_ACTION,
        "X-TC-Version": TENCENT_VERSION,
        "X-TC-Region": region,
        "X-TC-Timestamp": String(timestamp),
      },
      body: bodyString,
    });

    const data = (await response.json()) as {
      Response?: {
        Audio?: string;
        Error?: { Code?: string; Message?: string };
        RequestId?: string;
      };
    };

    if (!response.ok || data?.Response?.Error || !data?.Response?.Audio) {
      const msg = data?.Response?.Error?.Message || "腾讯云 TTS 调用失败。";
      return Response.json({ error: msg }, { status: 500 });
    }

    const audioBuffer = Buffer.from(data.Response.Audio, "base64");

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": codec === "wav" ? "audio/wav" : "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[tts-api] error:", error);
    return Response.json(
      { error: "语音生成失败，请稍后重试。" },
      { status: 500 },
    );
  }
}

