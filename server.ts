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

// Endpoint 1: AI Aura Interactive Chat
app.post("/api/aura/chat", async (req, res) => {
  try {
    const { message, history = [], userProfile, wardrobeItems = [], weatherContext, occasionContext } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Tin nhắn không hợp lệ." });
    }

    const ai = getGeminiClient();

    const wardrobeSummary =
      Array.isArray(wardrobeItems) && wardrobeItems.length > 0
        ? wardrobeItems
            .map(
              (item: any, idx: number) =>
                `${idx + 1}. "${item.name}" (Danh mục: ${item.category}, Phong cách: ${item.styleTag}, Màu: ${item.color}, Thời tiết: ${item.season}, Dịp: ${item.occasion})`
            )
            .join("\n")
        : "Người dùng chưa thêm món đồ riêng nào vào tủ, hãy gợi ý dựa trên các item cơ bản phù hợp phong cách của họ.";

    const systemInstruction = `Bạn là "Aura", chuyên gia tư vấn phối đồ cá nhân thông minh của ứng dụng Smart Wardrobe.
Phong cách giao tiếp của bạn: Thân thiện, tinh tế, am hiểu thời trang đương đại, trả lời tự nhiên bằng tiếng Việt như một stylist thực thụ (tương tự ChatGPT/Gemini nhưng chuyên sâu về phong cách cá nhân, thời tiết và hoàn cảnh).

THÔNG TIN NGƯỜI DÙNG HIỆN TẠI:
- Tên: ${userProfile?.displayName || "Bạn"}
- Giới tính: ${userProfile?.gender || "Chưa rõ"}
- Phong cách thời trang yêu thích: ${
      Array.isArray(userProfile?.favoriteStyles) && userProfile.favoriteStyles.length > 0
        ? userProfile.favoriteStyles.join(", ")
        : "Đa dạng"
    }

THÔNG TIN THỜI TIẾT & DỊP HIỆN TẠI:
- Thành phố / Thời tiết hôm nay: ${
      weatherContext
        ? `${weatherContext.city || "Hà Nội/TP.HCM"} - ${weatherContext.temp}°C, ${weatherContext.condition} (Độ ẩm: ${weatherContext.humidity || 68}%, Gió: ${weatherContext.wind || "12 km/h"})`
        : "26°C, Trời nắng nhẹ, mát mẻ"
    }
- Dịp trong ngày đang quan tâm: ${occasionContext || "Dạo phố / Đi làm hàng ngày"}

DANH SÁCH TRANG PHỤC TRONG TỦ ĐỒ CỦA NGƯỜI DÙNG:
${wardrobeSummary}

NGUYÊN TẮC TƯ VẤN CỦA AURA:
1. Nếu người dùng hỏi về thời tiết hôm nay ("Thời tiết hôm nay thế nào?", "Hôm nay trời nóng hay lạnh?"), hãy cung cấp chi tiết nhiệt độ, tình trạng thời tiết hiện tại và lập tức liên hệ đến chất liệu vải, màu sắc và cách phối layer phù hợp.
2. Khi người dùng hỏi cách phối đồ hoặc gợi ý trang phục cho một dịp cụ thể (đi làm, hẹn hò, cafe, tiệc tối, du lịch...), hãy ưu tiên kết hợp các món đồ CÓ SẴN trong tủ đồ của họ ở trên (nêu rõ tên món đồ), đồng thời gợi ý thêm 1-2 phụ kiện điểm nhấn phù hợp với giới tính (${userProfile?.gender || "của họ"}) và phong cách (${(userProfile?.favoriteStyles || []).join(", ")}).
3. Trình bày câu trả lời rõ ràng, chia bố cục dễ đọc (Áo, Quần/Chân váy, Giày & Phụ kiện, Lý do phối đồ).`;

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
      reply: response.text || "Aura đã sẵn sàng tư vấn phối đồ cho bạn hôm nay!",
    });
  } catch (error: any) {
    console.error("Aura Chat API Error:", error);
    return res.status(500).json({
      error: error?.message || "Không thể kết nối với AI Aura lúc này.",
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Wardrobe server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
