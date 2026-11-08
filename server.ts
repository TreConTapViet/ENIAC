import { INPUT_LIMITS, MAX_OUTPUT_TOKENS, clip } from "./server/geminiLimits";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { studioApi } from "./server/studioApi.ts";
import { weatherApi } from "./server/weatherApi.ts";
import { calculateRecommendedSize } from "./shared/sizing.ts";
import { styleLabel } from "./shared/styles.ts";
import {
  composeFallbackOutfits,
  outfitKey,
  validateOutfitIds,
  type CandidateGarment,
} from "./shared/outfitEngine.ts";

/** Hồ sơ lưu id phong cách ("minimalist", "custom:…"): đổi ra tên dễ đọc cho Gemini */
const styleNames = (styles: unknown): string[] =>
  Array.isArray(styles) ? styles.filter((s) => typeof s === "string" && s).map((s) => styleLabel(s)) : [];

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// API của Studio ma-nơ-canh 3D chuyên sâu (pose, bảng màu, thời tiết, stylist, tách đồ)
app.use(studioApi);
app.use(weatherApi);

app.use(express.json({ limit: "10mb" }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY chưa được cấu hình trên máy chủ.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Số đo + size theo đúng bảng Nam/Nữ của client (shared/sizing.ts), để Aura và đầu trang nói cùng một size
function computeServerUserMetrics(userProfile: any) {
  const r = calculateRecommendedSize(userProfile ?? {});
  return {
    heightCm: r.heightCm,
    weightKg: r.weightKg,
    bustCm: r.bustCm,
    waistCm: r.waistCm,
    hipCm: r.hipCm,
    size: r.overallSize,
    gender: r.gender,
  };
}

function buildAuraSmartConsultationFallback(
  _message: string,
  userProfile: any,
  wardrobeItems: any[],
  weatherContext: any,
  occasionContext: string
): string {
  const { heightCm, weightKg, bustCm, waistCm, hipCm, size, gender } = computeServerUserMetrics(userProfile);
  const isMale = gender === "Nam";
  const chosen = styleNames(userProfile?.favoriteStyles);
  const styles = chosen.length > 0 ? chosen : ["Minimalist", "Smart Casual"];
  const primaryStyle = styles[0];
  const city = weatherContext?.city || "TP. Hồ Chí Minh";
  const temp = weatherContext?.temp ?? 28;
  const condition = weatherContext?.condition || "Nắng ấm dịu nhẹ";
  const occasion = occasionContext || "Dạo phố / Cafe";

  const items = Array.isArray(wardrobeItems) ? wardrobeItems : [];
  const tops = items.filter((i: any) => i.category === "Áo" || i.category === "Áo khoác");
  const bottoms = items.filter(
    (i: any) =>
      i.category === "Quần" ||
      (!isMale && (i.category === "Chân váy" || i.category === "Quần & Chân váy"))
  );
  const dresses = isMale ? [] : items.filter((i: any) => i.category === "Đầm & Váy liền");

  const pickedTop = tops[0]?.name || (isMale ? "Áo sơ mi Oxford trắng" : "Áo blouse trơn màu kem");
  const pickedBottom = bottoms[0]?.name || (isMale ? "Quần chinos màu be" : "Quần ống suông màu be");
  const pickedDress = dresses[0]?.name;

  const isPartyOrDate = occasion.toLowerCase().includes("tiệc") || occasion.toLowerCase().includes("hẹn hò");

  const outfitLines =
    isPartyOrDate && pickedDress
      ? `- **Đầm chủ đạo (Có sẵn trong tủ đồ)**: **${pickedDress}** (Size ${size})\n- **Áo khoác nhẹ**: Khoác hờ Cardigan mỏng hoặc Blazer đồng điệu khi di chuyển buổi tối`
      : `- **Áo (Có sẵn trong tủ đồ)**: **${pickedTop}** (Size ${size})\n- **${isMale ? "Quần" : "Chân váy / Quần"} (Có sẵn trong tủ đồ)**: **${pickedBottom}** (Size ${size})`;

  const shoes = isMale
    ? "Giày loafer da hoặc sneaker trắng tối giản, dễ đi cả ngày."
    : "Giày Mary Jane đế dày 4cm hoặc Loafer da bóng giúp tăng chiều cao tự nhiên mà vẫn êm chân.";
  const accessories = isMale
    ? "Đồng hồ dây da hoặc kim loại mảnh + thắt lưng da cùng tông giày."
    : "Túi kẹp nách phom cứng + Dây chuyền bạc mảnh tạo điểm nhấn ở phần cổ.";
  const fitReason = isMale
    ? `Áo vừa vai, quần đúng vòng eo ${waistCm}cm và sơ vin gọn giúp chia tỷ lệ thân trên – chân hài hoà.`
    : `Thiết kế chiết eo cao ở vòng 2 (${waistCm}cm) kết hợp phom chữ A / cạp cao giúp tạo hiệu ứng đôi chân dài hơn.`;

  return `Chào ${userProfile?.displayName || "bạn"}! **Aura** đã phân tích dữ liệu thực tế từ hồ sơ và tủ đồ của bạn:
- **Chỉ số cơ thể**: ${heightCm}cm · ${weightKg}kg · Số đo ${bustCm}-${waistCm}-${hipCm}cm (**Size ${size}**)
- **Bối cảnh thực tế**: ${city} (${temp}°C, ${condition}) · Dịp: **${occasion}**
- **Phong cách chủ đạo**: ${styles.join(", ")}

### Công thức phối đồ Aura đề xuất hôm nay:
${outfitLines}
- **Giày (Gợi ý bổ sung)**: ${shoes}
- **Phụ kiện (Gợi ý bổ sung 1-2 món theo phong cách ${primaryStyle})**: ${accessories}

### Lý do bộ trang phục này tôn dáng của bạn (${heightCm}cm, ${weightKg}kg, Size ${size}):
1. **Tối ưu tỷ lệ cơ thể**: ${fitReason}
2. **Thích ứng thời tiết ${temp}°C (${condition})**: Chất liệu thoáng khí, đứng phom giúp bạn luôn thoải mái và tự tin suốt buổi **${occasion.toLowerCase()}**.`;
}

// Endpoint 1: AI Aura Interactive Chat
app.post("/api/aura/chat", async (req, res) => {
  const { message: rawMessage, history: rawHistory, userProfile, wardrobeItems: rawWardrobe, weatherContext, occasionContext } = req.body;
  // Giới hạn đầu vào: cắt tin nhắn, chỉ giữ vài tin gần nhất và một số món tủ đồ (server/geminiLimits.ts)
  const message = clip(rawMessage, INPUT_LIMITS.chatMessageChars).trim();
  const history: { role: string; text: string }[] = (Array.isArray(rawHistory) ? rawHistory : [])
    .slice(-INPUT_LIMITS.chatHistoryMessages)
    .map((m: any) => ({ role: m?.role, text: clip(String(m?.text ?? ""), INPUT_LIMITS.chatHistoryMessageChars) }));
  const wardrobeItems = (Array.isArray(rawWardrobe) ? rawWardrobe : []).slice(0, INPUT_LIMITS.chatWardrobeItems);

  if (!message) {
    return res.status(400).json({ error: "Tin nhắn không hợp lệ." });
  }

  const metrics = computeServerUserMetrics(userProfile);

  try {
    const ai = getGeminiClient();

    const wardrobeSummary =
      Array.isArray(wardrobeItems) && wardrobeItems.length > 0
        ? wardrobeItems
            .map(
              (item: any, idx: number) =>
                `${idx + 1}. "${item.name}" (Thể loại: ${item.category}, Phong cách: ${item.styleTag}, Màu: ${item.color}, Thời tiết: ${item.season}, Dịp: ${item.occasion})`
            )
            .join("\n")
        : "Tủ đồ của người dùng đang trống; hãy gợi ý các món cơ bản dễ mua.";
    const isMale = metrics.gender === "Nam";
    const genderRule = isMale
      ? "- Người dùng là NAM: chỉ gợi ý trang phục nam (áo, quần, áo khoác, giày, phụ kiện nam). Không gợi ý váy, đầm, chân váy, corset hay phụ kiện nữ."
      : "- Người dùng là NỮ: gợi ý trang phục nữ hoặc unisex.";

    const systemInstruction = `Bạn là Aura — Stylist AI thông minh độc quyền của ứng dụng Smart Wardrobe. Nhiệm vụ của bạn là tư vấn phối đồ và đưa ra gợi ý trang phục dựa trên dữ liệu thực tế của người dùng:

1. CHỈ SỐ NGƯỜI DÙNG:
- Tên: ${userProfile?.displayName || "Bạn"} (${metrics.gender})
- Chiều cao, cân nặng, tỷ lệ cơ thể: ${metrics.heightCm}cm, ${metrics.weightKg}kg, Size ${metrics.size} (Vòng ngực-eo-hông: ${metrics.bustCm}-${metrics.waistCm}-${metrics.hipCm}cm).

2. BỐI CẢNH THỰC TẾ:
- Thời tiết hiện tại: ${
      weatherContext
        ? `${weatherContext.city || "TP. Hồ Chí Minh"} — ${weatherContext.temp}°C, ${weatherContext.condition} (Độ ẩm: ${weatherContext.humidity || 65}%, Gió: ${weatherContext.wind || "11 km/h"})`
        : "27°C, Nắng ấm dịu nhẹ"
    }
- Dịp sự kiện: ${occasionContext || "Dạo phố / Cafe"}

3. TỦ ĐỒ CÁ NHÂN & PHONG CÁCH YÊU THÍCH:
- Phong cách yêu thích: ${
      styleNames(userProfile?.favoriteStyles).join(", ") || "Minimalist, Smart Casual, Streetwear"
    }
- Danh sách món đồ đang có sẵn trong kho đồ của người dùng:
${wardrobeSummary}

4. NGUYÊN TẮC TƯ VẤN & PHONG CÁCH TRÒ CHUYỆN CỦA AURA:
- Chỉ gợi ý các món CÓ SẴN trong kho đồ ở trên (nêu chính xác tên món đồ) hoặc gợi ý bổ sung tối đa 1-2 món còn thiếu theo đúng phong cách người dùng yêu thích.
${genderRule}
- Phong cách trò chuyện: Tinh tế, am hiểu thời trang, lịch sự, trả lời bằng tiếng Việt rõ ràng.
- Luôn đưa ra công thức phối cụ thể theo đúng cấu trúc:
  • **${isMale ? "Áo" : "Áo / Đầm"}**: ... (kèm Size ${metrics.size})
  • **${isMale ? "Quần" : "Chân váy / Quần"}**: ... (kèm Size ${metrics.size})
  • **Giày**: ...
  • **Phụ kiện (1-2 món bổ sung)**: ...
  • **Lý do tôn dáng (${metrics.heightCm}cm, ${metrics.weightKg}kg, Size ${metrics.size}) & phù hợp thời tiết**: Giải thích cụ thể vì sao phom dáng, độ dài, cách sơ vin/cạp quần này tôn tỷ lệ cơ thể của người dùng và hợp với tiết trời ${weatherContext?.temp ?? 27}°C.`;

    const formattedContents = [
      ...history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: String(msg.text || "") }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    // Quá 20 giây (thường do hết hạn mức, SDK tự thử lại rất lâu) thì trả lời bằng bản dự phòng
    const response = await withTimeout(20_000, ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        maxOutputTokens: MAX_OUTPUT_TOKENS.auraChat,
      },
    }));

    return res.json({
      reply:
        response.text ||
        buildAuraSmartConsultationFallback(
          message,
          userProfile,
          wardrobeItems,
          weatherContext,
          occasionContext
        ),
    });
  } catch (error: any) {
    console.warn("Aura Chat API fallback triggered:", error?.message);
    return res.json({
      reply: buildAuraSmartConsultationFallback(
        message,
        userProfile,
        wardrobeItems,
        weatherContext,
        occasionContext
      ),
    });
  }
});

// Endpoint 2: Structured Outfit Recommendations by Weather & Occasion
function withTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Quá ${ms / 1000} giây`)), ms)),
  ]);
}

// Endpoint 2: gợi ý bộ đồ ghép từ CÁC MÓN CÓ THẬT.
// Client gửi danh sách món ứng viên (id + mô tả, tối đa 40) và khoá các bộ đang hiển thị.
// Gemini chỉ được chọn id trong danh sách (schema enum); server kiểm tra lại id, vị trí mặc, bộ trùng,
// rồi bù bằng bộ tự ghép (shared/outfitEngine.ts) nếu AI trả thiếu hoặc không có key.
app.post("/api/aura/recommend-outfits", async (req, res) => {
  const { gender, styles = [], weather, occasion, candidates = [], exclude = [], count: rawCount } = req.body ?? {};
  const count = Math.min(Math.max(Number(rawCount) || 3, 1), 6);
  const pool: CandidateGarment[] = (Array.isArray(candidates) ? candidates : [])
    .filter((c: any) => c && typeof c.id === "string" && typeof c.name === "string" && typeof c.category === "string")
    .slice(0, 40)
    .map((c: any) => ({
      id: c.id.slice(0, 128),
      name: String(c.name).slice(0, 100),
      category: c.category,
      color: String(c.color ?? "").slice(0, 50),
      styleTag: c.styleTag ? String(c.styleTag).slice(0, 60) : undefined,
      season: c.season,
      occasion: c.occasion,
    }));
  if (pool.length === 0) return res.status(400).json({ error: "Thiếu danh sách món đồ để phối." });

  const byId = new Map(pool.map((g) => [g.id, g]));
  const seen = new Set<string>((Array.isArray(exclude) ? exclude : []).filter((k: unknown) => typeof k === "string"));
  const isMale = gender === "Nam";
  const styleText = (Array.isArray(styles) ? styles : []).map((s: unknown) => styleLabel(String(s))).join(", ");
  const occasionText = typeof occasion === "string" && occasion ? occasion : "Dạo phố / Cafe";
  const weatherText = weather
    ? `${weather.city ?? ""} ${weather.temp ?? ""}°C, ${weather.condition ?? ""} (${weather.seasonMatch ?? ""})`
    : "27°C, nắng nhẹ";

  type Picked = { garmentIds: string[]; title: string; weatherNote: string; auraAdvice: string; colorPalette: string[] };
  const accepted: Picked[] = [];
  const accept = (ids: unknown, extra: Partial<Picked>) => {
    const valid = validateOutfitIds(ids, byId);
    if (!valid) return;
    const key = outfitKey(valid);
    if (seen.has(key)) return;
    seen.add(key);
    accepted.push({
      garmentIds: valid,
      title: (extra.title || valid.map((id) => byId.get(id)!.name).join(" & ")).slice(0, 120),
      weatherNote: (extra.weatherNote || `${weather?.seasonMatch ?? "Mọi thời tiết"} · ${occasionText}`).slice(0, 120),
      auraAdvice: (extra.auraAdvice || "Bộ phối cân đối màu sắc và hợp thời tiết hôm nay.").slice(0, 800),
      colorPalette: Array.isArray(extra.colorPalette) ? extra.colorPalette.slice(0, 3) : [],
    });
  };

  let source: "ai" | "engine" | "mixed" = "engine";
  try {
    const ai = getGeminiClient();
    const list = pool
      .map((g) => `- ${g.id}: ${g.name} (${g.category}, màu ${g.color}${g.styleTag ? `, ${g.styleTag}` : ""}${g.season ? `, ${g.season}` : ""})`)
      .join("\n");
    // Gemini hết hạn mức thì SDK tự thử lại rất lâu: quá 15 giây thì dùng bộ tự ghép
    const response = await withTimeout(15_000, ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Ghép ${count} bộ trang phục KHÁC NHAU cho người dùng ${isMale ? "NAM" : "NỮ"}.
- Phong cách yêu thích: ${styleText || "Tối giản, Thanh lịch"}
- Thời tiết: ${weatherText}
- Dịp: ${occasionText}
Chỉ được dùng các món sau (ghi đúng id):
${list}
Mỗi bộ gồm 1 áo + 1 quần${isMale ? "" : " (hoặc 1 đầm)"}, có thể thêm 1 áo khoác. Không lặp lại cùng một tổ hợp.`,
      config: {
        systemInstruction:
          "Bạn là AI Aura, stylist của Smart Wardrobe. Trả về JSON đúng schema, viết tiếng Việt, chỉ dùng id có trong danh sách.",
        responseMimeType: "application/json",
        maxOutputTokens: MAX_OUTPUT_TOKENS.recommendOutfits,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              garmentIds: { type: Type.ARRAY, items: { type: Type.STRING, enum: pool.map((g) => g.id) } },
              title: { type: Type.STRING },
              weatherNote: { type: Type.STRING },
              auraAdvice: { type: Type.STRING },
              colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["garmentIds", "title", "auraAdvice"],
          },
        },
      },
    }));
    const parsed = JSON.parse((response.text ?? "[]").trim());
    if (Array.isArray(parsed)) parsed.forEach((o: any) => accept(o?.garmentIds, o ?? {}));
    if (accepted.length > 0) source = "ai";
  } catch (error: any) {
    console.warn("Aura recommend: dùng bộ tự ghép vì Gemini lỗi:", error?.message ?? error);
  }

  if (accepted.length < count) {
    const before = accepted.length;
    for (const o of composeFallbackOutfits(pool, {
      count: count - accepted.length,
      exclude: seen,
      season: weather?.seasonMatch,
      occasion: occasionText,
    })) {
      accept(o.garmentIds, { title: o.title });
    }
    if (accepted.length > before && source === "ai") source = "mixed";
  }

  return res.json({ outfits: accepted.slice(0, count), source });
});

// Endpoint 3: Create & Edit Fashion Images with AI
app.post("/api/aura/generate-image", async (req, res) => {
  try {
    const { prompt: rawPrompt, base64Image, mimeType = "image/jpeg", aspectRatio = "1:1" } = req.body;
    const prompt = clip(rawPrompt, INPUT_LIMITS.imagePromptChars).trim();
    if (!prompt) {
      return res.status(400).json({ error: "Vui lòng nhập mô tả hình ảnh trang phục." });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];

    if (typeof base64Image === "string" && base64Image.length > INPUT_LIMITS.imageBase64Chars) {
      return res.status(413).json({ error: "Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn 3 MB." });
    }
    if (base64Image && typeof base64Image === "string") {
      const cleanBase64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType,
        },
      });
    }

    parts.push({
      text: `Studio fashion editorial photography: ${prompt}`,
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "1:1",
          },
        },
      });
    } catch (_fallbackErr) {
      response = await ai.models.generateContent({
        model: "gemini-nano-banana-2.1",
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || "1:1",
            imageSize: "1K",
          },
        },
      });
    }

    let generatedImageUrl: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? "image/png";
        generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({ error: "AI chưa tạo được hình ảnh. Vui lòng thử câu lệnh chi tiết hơn." });
    }

    return res.json({ imageUrl: generatedImageUrl });
  } catch (error: any) {
    console.error("Aura Image Generation Error:", error);
    return res.status(500).json({
      error: error?.message || "Không thể tạo hình ảnh lúc này.",
    });
  }
});

async function startServer() {
  // Luôn phục vụ /public (gồm /models/*.glb) trước khi trả trang SPA, để file GLB không bị thay bằng HTML
  const publicPath = path.resolve(__dirname, "public");
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  listenWithFallback(PORT);
}

// Cổng bận (thường do một `npm run dev` khác còn chạy) thì thử cổng kế tiếp thay vì dừng hẳn
function listenWithFallback(port: number, attemptsLeft = 10) {
  const server = app.listen(port, "0.0.0.0", () => {
    if (port !== PORT) {
      console.log(`Cổng ${PORT} đang bận, chuyển sang cổng ${port}.`);
    }
    console.log(`Smart Wardrobe đang chạy. Mở trình duyệt tại: http://localhost:${port}`);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      listenWithFallback(port + 1, attemptsLeft - 1);
      return;
    }
    console.error(`Không mở được server ở cổng ${port}:`, err.message);
    process.exit(1);
  });
}

startServer();
