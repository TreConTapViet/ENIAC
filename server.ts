import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { studioApi } from "./server/studioApi.ts";

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

function computeServerUserMetrics(userProfile: any) {
  const isMale = userProfile?.gender === "Nam";
  const heightCm = Number(userProfile?.heightCm) || (isMale ? 172 : 162);
  const weightKg = Number(userProfile?.weightKg) || (isMale ? 65 : 50);
  const bustCm = Number(userProfile?.bustCm) || (isMale ? 94 : 84);
  const waistCm = Number(userProfile?.waistCm) || (isMale ? 76 : 64);
  const hipCm = Number(userProfile?.hipCm) || (isMale ? 94 : 90);

  let size = "S";
  if (bustCm <= 80 && weightKg <= 45) size = "XS";
  else if (bustCm <= 86 && weightKg <= 52) size = "S";
  else if (bustCm <= 91 && weightKg <= 59) size = "M";
  else if (bustCm <= 97 && weightKg <= 68) size = "L";
  else size = "XL";

  return { heightCm, weightKg, bustCm, waistCm, hipCm, size };
}

function buildAuraSmartConsultationFallback(
  message: string,
  userProfile: any,
  wardrobeItems: any[],
  weatherContext: any,
  occasionContext: string
): string {
  const { heightCm, weightKg, bustCm, waistCm, hipCm, size } = computeServerUserMetrics(userProfile);
  const styles =
    Array.isArray(userProfile?.favoriteStyles) && userProfile.favoriteStyles.length > 0
      ? userProfile.favoriteStyles
      : ["Dark Coquette", "Preppy Goth", "Minimalist"];
  const primaryStyle = styles[0];
  const city = weatherContext?.city || "TP. Hồ Chí Minh";
  const temp = weatherContext?.temp ?? 28;
  const condition = weatherContext?.condition || "Nắng ấm dịu nhẹ";
  const occasion = occasionContext || "Dạo phố / Cafe";

  const tops = wardrobeItems.filter((i: any) => i.category === "Áo" || i.category === "Áo khoác");
  const bottoms = wardrobeItems.filter(
    (i: any) => i.category === "Quần" || i.category === "Chân váy" || i.category === "Quần & Chân váy"
  );
  const dresses = wardrobeItems.filter((i: any) => i.category === "Đầm & Váy liền");

  const pickedTop = tops[0]?.name || "Áo Corset Nâu Espresso Tay Bồng Cổ Vuông";
  const pickedBottom = bottoms[0]?.name || "Chân Váy Ngắn Denim Xếp Ly Xanh Đậm";
  const pickedDress = dresses[0]?.name;

  const isPartyOrDate = occasion.toLowerCase().includes("tiệc") || occasion.toLowerCase().includes("hẹn hò");

  return `Chào ${userProfile?.displayName || "bạn"}! **Aura** đã phân tích dữ liệu thực tế từ hồ sơ và tủ đồ của bạn:
- **Chỉ số cơ thể**: ${heightCm}cm · ${weightKg}kg · Số đo ${bustCm}-${waistCm}-${hipCm}cm (**Size ${size}**)
- **Bối cảnh thực tế**: ${city} (${temp}°C, ${condition}) · Dịp: **${occasion}**
- **Phong cách chủ đạo**: ${styles.join(", ")}

### Công thức phối đồ Aura đề xuất hôm nay:
${
  isPartyOrDate && pickedDress
    ? `- **Đầm chủ đạo (Có sẵn trong tủ đồ)**: **${pickedDress}** (Size ${size})\n- **Áo khoác nhẹ**: Khoác hờ Cardigan mỏng hoặc Blazer đồng điệu khi di chuyển buổi tối`
    : `- **Áo (Có sẵn trong tủ đồ)**: **${pickedTop}** (Size ${size})\n- **Chân váy / Quần (Có sẵn trong tủ đồ)**: **${pickedBottom}** (Size ${size})`
}
- **Giày (Gợi ý bổ sung)**: Giày Mary Jane đế dày 4cm hoặc Loafer da bóng giúp tăng chiều cao tự nhiên mà vẫn êm chân.
- **Phụ kiện (Gợi ý bổ sung 1-2 món theo phong cách ${primaryStyle})**: Túi kẹp nách phom cứng + Dây chuyền bạc mảnh / Nơ ruy băng cài tóc tạo điểm nhấn thị giác ở phần cổ và xương quai xanh.

### Lý do bộ trang phục này tôn dáng của bạn (${heightCm}cm, ${weightKg}kg, Size ${size}):
1. **Tối ưu tỷ lệ lưng - chân**: Thiết kế chiết eo cao ở vòng 2 (${waistCm}cm) kết hợp phom chữ A / cạp cao giúp tạo hiệu ứng đôi chân dài hơn thực tế từ 4–5cm.
2. **Thích ứng thời tiết ${temp}°C (${condition})**: Chất liệu thoáng khí, đứng phom giúp bạn luôn thoải mái và tự tin suốt buổi **${occasion.toLowerCase()}**.`;
}

// Endpoint 1: AI Aura Interactive Chat
app.post("/api/aura/chat", async (req, res) => {
  const { message, history = [], userProfile, wardrobeItems = [], weatherContext, occasionContext } = req.body;

  if (!message || typeof message !== "string") {
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
        : "Người dùng đang sử dụng bộ tủ đồ tiêu chuẩn (Áo Corset Nâu Espresso, Áo Cổ Yếm, Chân Váy Xếp Ly Denim, Chân Váy Đen Đính Nơ, Đầm Ren Coquette, Quần Baggy Jeans Đính Nơ...).";

    const systemInstruction = `Bạn là Aura — Stylist AI thông minh độc quyền của ứng dụng Smart Wardrobe. Nhiệm vụ của bạn là tư vấn phối đồ và đưa ra gợi ý trang phục dựa trên dữ liệu thực tế của người dùng:

1. CHỈ SỐ NGƯỜI DÙNG:
- Tên: ${userProfile?.displayName || "Bạn"} (${userProfile?.gender || "Nữ"})
- Chiều cao, cân nặng, tỷ lệ cơ thể: ${metrics.heightCm}cm, ${metrics.weightKg}kg, Size ${metrics.size} (Số đo 3 vòng: ${metrics.bustCm}-${metrics.waistCm}-${metrics.hipCm}cm).

2. BỐI CẢNH THỰC TẾ:
- Thời tiết hiện tại: ${
      weatherContext
        ? `${weatherContext.city || "TP. Hồ Chí Minh"} — ${weatherContext.temp}°C, ${weatherContext.condition} (Độ ẩm: ${weatherContext.humidity || 65}%, Gió: ${weatherContext.wind || "11 km/h"})`
        : "27°C, Nắng ấm dịu nhẹ"
    }
- Dịp sự kiện: ${occasionContext || "Dạo phố / Cafe"}

3. TỦ ĐỒ CÁ NHÂN & PHONG CÁCH YÊU THÍCH:
- Phong cách yêu thích: ${
      Array.isArray(userProfile?.favoriteStyles) && userProfile.favoriteStyles.length > 0
        ? userProfile.favoriteStyles.join(", ")
        : "Dark Coquette, Preppy Goth, Minimalist, Y2K"
    }
- Danh sách món đồ đang có sẵn trong kho đồ của người dùng:
${wardrobeSummary}

4. NGUYÊN TẮC TƯ VẤN & PHONG CÁCH TRÒ CHUYỆN CỦA AURA:
- Chỉ gợi ý các món CÓ SẴN trong kho đồ ở trên (nêu chính xác tên món đồ) hoặc gợi ý bổ sung tối đa 1-2 món còn thiếu theo đúng phong cách người dùng yêu thích (như Dark Coquette, Preppy Goth, Minimalist, Y2K, Streetwear...).
- Phong cách trò chuyện: Tinh tế, am hiểu thời trang, lịch sự, trả lời bằng tiếng Việt rõ ràng.
- Luôn đưa ra công thức phối cụ thể theo đúng cấu trúc:
  • **Áo / Đầm**: ... (kèm Size ${metrics.size})
  • **Chân váy / Quần**: ... (kèm Size ${metrics.size})
  • **Giày**: ...
  • **Phụ kiện (1-2 món bổ sung)**: ...
  • **Lý do tôn dáng (${metrics.heightCm}cm, ${metrics.weightKg}kg, Size ${metrics.size}) & phù hợp thời tiết**: Giải thích cụ thể vì sao phom dáng, độ dài, cạp cao/chiết eo này tôn tỷ lệ cơ thể của người dùng và hợp với tiết trời ${weatherContext?.temp ?? 27}°C.`;

    const formattedContents = [
      ...history.slice(-8).map((msg: { role: string; text: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: String(msg.text || "") }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
      },
    });

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
app.post("/api/aura/recommend-outfits", async (req, res) => {
  try {
    const { userProfile, wardrobeItems = [], weatherContext, occasion } = req.body;
    const ai = getGeminiClient();

    const wardrobeList =
      Array.isArray(wardrobeItems) && wardrobeItems.length > 0
        ? wardrobeItems
            .map(
              (i: any) =>
                `- ${i.name} (${i.category} | Phong cách: ${i.styleTag} | Màu: ${i.color} | Thời tiết: ${i.season})`
            )
            .join("\n")
        : "Chưa có trang phục riêng";

    const prompt = `Hãy tạo 3 bộ phối đồ (outfits) hoàn chỉnh cho người dùng:
- Tên: ${userProfile?.displayName || "Người dùng"}
- Giới tính: ${userProfile?.gender || "Nữ"}
- Phong cách yêu thích: ${(userProfile?.favoriteStyles || ["Tối giản (Minimalist)", "Thanh lịch (Smart Casual)"]).join(", ")}
- Thời tiết hiện tại: ${weatherContext?.city || "TP. Hồ Chí Minh"}, ${weatherContext?.temp ?? 27}°C, ${weatherContext?.condition || "Nắng nhẹ"}
- Dịp cụ thể: ${occasion || "Đi làm / Đi học"}

Tủ đồ hiện có của người dùng:
${wardrobeList}

Hãy ưu tiên ghép các món đồ có trong tủ đồ của người dùng và bổ sung phụ kiện hài hòa.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "Bạn là AI Aura - chuyên gia định hình phong cách cá nhân. Hãy trả về danh sách 3 gợi ý phối đồ chi tiết bằng tiếng Việt dưới dạng JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Tên bộ trang phục ấn tượng (ví dụ: Thanh Lịch Nắng Sớm)",
              },
              occasion: {
                type: Type.STRING,
                description: "Dịp phù hợp",
              },
              weatherNote: {
                type: Type.STRING,
                description: "Ghi chú thích ứng thời tiết (ví dụ: Thoáng mát cho tiết trời 27°C)",
              },
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Danh sách 3-4 món đồ cụ thể cấu thành bộ trang phục",
              },
              colorPalette: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 mã màu HEX chủ đạo của bộ đồ (ví dụ: #F5F5DC, #1E293B, #92400E)",
              },
              auraAdvice: {
                type: Type.STRING,
                description: "Lời khuyên phối đồ chi tiết từ AI Aura giải thích vì sao bộ này hợp với phong cách và thời tiết",
              },
            },
            required: ["title", "occasion", "weatherNote", "items", "colorPalette", "auraAdvice"],
          },
        },
      },
    });

    const jsonText = (response.text ?? "[]").trim();
    const outfits = JSON.parse(jsonText);
    return res.json({ outfits });
  } catch (error: any) {
    console.error("Aura Recommend API Error:", error);
    return res.status(500).json({
      error: error?.message || "Không thể tạo gợi ý phối đồ lúc này.",
    });
  }
});

// Endpoint 3: Create & Edit Fashion Images with AI
app.post("/api/aura/generate-image", async (req, res) => {
  try {
    const { prompt, base64Image, mimeType = "image/jpeg", aspectRatio = "1:1" } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Vui lòng nhập mô tả hình ảnh trang phục." });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];

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
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
