import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const eulerSchema = {
  type: Type.OBJECT,
  properties: {
    x: { type: Type.NUMBER, description: 'Pitch rotation in degrees (Gập / Duỗi)' },
    y: { type: Type.NUMBER, description: 'Yaw rotation in degrees (Xoay trục)' },
    z: { type: Type.NUMBER, description: 'Roll rotation in degrees (Dang / Nghiêng)' },
  },
  required: ['x', 'y', 'z'],
};

const poseResponseSchema = {
  type: Type.OBJECT,
  properties: {
    poseTitle: {
      type: Type.STRING,
      description: 'Short Vietnamese title of the generated pose',
    },
    explanation: {
      type: Type.STRING,
      description: 'Concise Vietnamese explanation of the joint adjustments made',
    },
    isSeated: {
      type: Type.BOOLEAN,
      description: 'True if the pose involves sitting (e.g. ngồi ghế, ngồi bắt chéo chân)',
    },
    rotations: {
      type: Type.OBJECT,
      properties: {
        head: eulerSchema,
        neck: eulerSchema,
        chest: eulerSchema,
        spine: eulerSchema,
        pelvis: eulerSchema,
        leftShoulder: eulerSchema,
        leftElbow: eulerSchema,
        leftWrist: eulerSchema,
        rightShoulder: eulerSchema,
        rightElbow: eulerSchema,
        rightWrist: eulerSchema,
        leftHip: eulerSchema,
        leftKnee: eulerSchema,
        leftAnkle: eulerSchema,
        rightHip: eulerSchema,
        rightKnee: eulerSchema,
        rightAnkle: eulerSchema,
      },
      required: [
        'head',
        'neck',
        'chest',
        'spine',
        'pelvis',
        'leftShoulder',
        'leftElbow',
        'leftWrist',
        'rightShoulder',
        'rightElbow',
        'rightWrist',
        'leftHip',
        'leftKnee',
        'leftAnkle',
        'rightHip',
        'rightKnee',
        'rightAnkle',
      ],
    },
  },
  required: ['poseTitle', 'explanation', 'isSeated', 'rotations'],
};

const SYSTEM_INSTRUCTION = `Bạn là hệ thống điều khiển khung xương 3D (17 khớp Euler X, Y, Z tính bằng độ trong không gian Root) cho người mẫu thời trang 3D (ReadyPlayerMe / Mixamo rig).
Quy ước hệ trục từng khớp xương từ tư thế đứng tự nhiên (0, 0, 0):
- head (Đầu): x âm = ngước lên, x dương = cúi xuống (-35..35); y dương = nhìn sang trái của người mẫu, y âm = nhìn sang phải (-60..60); z = nghiêng đầu (-25..25).
- neck (Cổ): x (-20..20), y (-35..35), z (-15..15).
- chest (Ngực trên): x âm = ưỡn ngực thẳng, x dương = gập người về trước (-25..30); y = xoay vai (-40..40); z = nghiêng ngực (-20..20).
- spine (Eo): x (-25..35), y (-35..35), z (-20..20).
- pelvis (Hông): x (-20..20), y (-45..45), z (-15..15).
- leftShoulder (Vai Trái): x âm = đưa tay trái về trước (-90..45), y (-30..30), z dương = dang/giơ tay trái sang ngang và lên cao (-15..120). Khi chống hông trái: { x: 8, y: 0, z: 26 }. Khi giơ cao tay trái ăn mừng: { x: -20, y: 10, z: 112 }. Khi khoanh tay trước ngực: { x: -28, y: 8, z: -8 }.
- leftElbow (Khuỷu Tay Trái): LƯU Ý trong hệ trục Euler XYZ của khớp khuỷu tay, trục Z điều khiển gập cẳng tay ngang qua ngực (-85..0) và trục Y điều khiển đẩy cẳng tay ra phía trước ngực. Khi chống hông trái: { x: -24, y: 0, z: -56 }. Khi khoanh tay trước ngực chuẩn giải phẫu 100%: leftShoulder { x: -28, y: 8, z: -8 }, leftElbow { x: -12, y: 18, z: -82 }, leftWrist { x: -6, y: -10, z: 14 }.
- rightShoulder (Vai Phải): x âm = đưa tay phải về trước (-90..45), y (-30..30), z âm = dang/giơ tay phải sang ngang và lên cao (-120..15). Khi chống hông phải: { x: 8, y: 0, z: -26 }. Khi giơ cao tay phải ăn mừng: { x: -20, y: -10, z: -112 }. Khi khoanh tay trước ngực: { x: -24, y: -8, z: 8 }.
- rightElbow (Khuỷu Tay Phải): Khi chống hông phải: { x: -24, y: 0, z: 56 }. Khi khoanh tay trước ngực chuẩn giải phẫu 100%: rightShoulder { x: -24, y: -8, z: 8 }, rightElbow { x: -6, y: -14, z: 80 }, rightWrist { x: -6, y: 10, z: -14 }. Khi vẫy tay chào: rightShoulder { x: -24, y: -12, z: -42 }, rightElbow { x: -72, y: 0, z: -12 }.
- leftWrist, rightWrist: x (-40..40), y (-25..25), z (-30..30).
- leftHip, rightHip (Đùi/Hông): x âm = nâng đùi lên phía trước (ngồi ghế x = -80 đến -98), x dương = đưa chân ra sau (-105..40); y = xoay đùi (-25..25); z = dạng/khép chân (khi ngồi bắt chéo chân trái qua chân phải: leftHip { x: -98, y: -8, z: -12 }, leftKnee { x: 92, y: 0, z: 10 }, rightHip { x: -80, y: 4, z: -4 }, rightKnee { x: 84, y: 0, z: 0 }).
- leftKnee, rightKnee (Đầu Gối): x dương = gập đầu gối về phía sau (đứng thẳng x = 0, ngồi ghế x = 84 đến 92, khoảng 0..130).
- leftAnkle, rightAnkle (Cổ Chân): x (-35..35), y (-20..20), z (-15..15).
Hãy tạo thông số 17 khớp tự nhiên, cân đối, đúng giải phẫu học theo mô tả của người dùng.`;

app.post('/api/pose-ai', async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) {
      res.status(400).json({ error: 'Vui lòng nhập mô tả tư thế.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY_NOT_CONFIGURED',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Mô tả tư thế người mẫu 3D: "${prompt}". Hãy trả về JSON thông số góc xoay 17 khớp xương.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: poseResponseSchema,
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối Gemini API';
    res.status(500).json({ error: msg });
  }
});

const colorPaletteItemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    scheme: {
      type: Type.STRING,
      description: 'complementary | analogous | triadic | split_complementary | monochromatic',
    },
    schemeLabel: {
      type: Type.STRING,
      description: 'Vietnamese name of the color theory harmony',
    },
    paletteName: {
      type: Type.STRING,
      description: 'Creative Vietnamese fashion palette title',
    },
    theoryExplanation: {
      type: Type.STRING,
      description: 'Concise Vietnamese explanation of why this color harmony works on the outfit',
    },
    topColorHex: { type: Type.STRING, description: '6-digit HEX color e.g. #F3EFE6' },
    outerwearColorHex: { type: Type.STRING, description: '6-digit HEX color e.g. #1E293B' },
    bottomColorHex: { type: Type.STRING, description: '6-digit HEX color e.g. #2B4C7E' },
    footwearColorHex: { type: Type.STRING, description: '6-digit HEX color e.g. #F8FAFC' },
    accessoryColorHex: { type: Type.STRING, description: '6-digit HEX color e.g. #78350F' },
    accessoryMetalHex: { type: Type.STRING, description: '6-digit HEX color e.g. #D4AF37' },
    swatches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          name: { type: Type.STRING },
          hex: { type: Type.STRING },
        },
        required: ['role', 'name', 'hex'],
      },
    },
  },
  required: [
    'id',
    'scheme',
    'schemeLabel',
    'paletteName',
    'theoryExplanation',
    'topColorHex',
    'outerwearColorHex',
    'bottomColorHex',
    'footwearColorHex',
    'accessoryColorHex',
    'accessoryMetalHex',
    'swatches',
  ],
};

const colorPaletteResponseSchema = {
  type: Type.OBJECT,
  properties: {
    palettes: {
      type: Type.ARRAY,
      items: colorPaletteItemSchema,
    },
  },
  required: ['palettes'],
};

app.post('/api/color-palette', async (req, res) => {
  try {
    const primaryColorHex = String(req.body?.primaryColorHex || '#1E293B').trim();
    const anchorCategory = String(req.body?.anchorCategory || 'top').trim();
    const fabric = String(req.body?.fabric || 'cotton').trim();
    const genderProfile = String(req.body?.genderProfile || 'female').trim();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY_NOT_CONFIGURED',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Người mẫu (${genderProfile}) đang mặc trang phục chính (${anchorCategory}) có màu chủ đạo ${primaryColorHex} trên chất liệu ${fabric}. Hãy tạo 5 bảng phối màu thời trang cao cấp theo lý thuyết bánh xe màu sắc:
1. complementary (Tương phản bổ túc 180°)
2. analogous (Tương đồng liền kề ±30°)
3. triadic (Tam giác cân 120°)
4. split_complementary (Bổ túc tách đôi 150°/210°)
5. monochromatic (Đơn sắc chuyển sắc độ Ton-sur-Ton)
Giữ nguyên màu chủ đạo ${primaryColorHex} cho món đồ chính (${anchorCategory}) và gợi ý mã màu HEX tinh tế, sang trọng, thực tế cho các lớp còn lại (topColorHex, outerwearColorHex, bottomColorHex, footwearColorHex, accessoryColorHex, accessoryMetalHex).`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: colorPaletteResponseSchema,
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối Gemini API';
    res.status(500).json({ error: msg });
  }
});

const aiStylistItemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: {
      type: Type.STRING,
      description: 'Vietnamese editorial title of the full outfit lookbook',
    },
    trendName: {
      type: Type.STRING,
      description: 'Vietnamese fashion trend name',
    },
    seasonTag: {
      type: Type.STRING,
      description: 'e.g. FW26 / SS27 Runway Trend',
    },
    styleCompatibilityScore: {
      type: Type.NUMBER,
      description: 'Compatibility score 88-99 based on user saved style history',
    },
    savedStyleMatchReason: {
      type: Type.STRING,
      description: 'Vietnamese explanation of how this full outfit matches the user saved outfit history and body shape',
    },
    trendAnalysis: {
      type: Type.STRING,
      description: 'Vietnamese explanation of why this silhouette, fabric, and color palette are trending now',
    },
    imagePrompt: {
      type: Type.STRING,
      description: 'Detailed fashion editorial lookbook description of the outfit, fabrics, lighting, and silhouette',
    },
    recommendedPose: {
      type: Type.STRING,
      description: 'lookbook_pose | catwalk_walk | editorial_crossed | natural_idle',
    },
    topStyleId: {
      type: Type.STRING,
      description: 'silk_blouse_bow | baby_tee | off_shoulder_knit | corset_top | silk_camisole | puff_blouse | female_turtleneck | oxford_shirt | crewneck_tee | polo_shirt | turtleneck_knit',
    },
    topColorHex: { type: Type.STRING, description: '6-digit HEX color' },
    topFabric: {
      type: Type.STRING,
      description: 'cotton | linen | silk | fleece | denim | leather',
    },
    outerwearStyleId: {
      type: Type.STRING,
      description: 'none | tailored_blazer | bomber_jacket | biker_leather | trench_coat | gilet_vest | denim_jacket',
    },
    outerwearColorHex: { type: Type.STRING, description: '6-digit HEX color' },
    outerwearFabric: {
      type: Type.STRING,
      description: 'fleece | linen | leather | denim | cotton | silk',
    },
    bottomStyleId: {
      type: Type.STRING,
      description: 'tailored_trousers | pleated_maxi_skirt | aline_skirt | pencil_skirt | slim_jeans | female_cargo_pants | male_dress_trousers | male_denim_jeans | cargo_pants | male_chino_khaki',
    },
    bottomColorHex: { type: Type.STRING, description: '6-digit HEX color' },
    bottomFabric: {
      type: Type.STRING,
      description: 'fleece | denim | linen | silk | cotton | leather',
    },
    footwearStyleId: {
      type: Type.STRING,
      description: 'minimal_sneakers | chunky_dad_sneakers | high_top_sneakers | chelsea_boots | knee_high_boots | penny_loafers | oxford_dress_shoes | pointed_heels | strappy_stiletto_heels | platform_mary_jane',
    },
    footwearColorHex: { type: Type.STRING, description: '6-digit HEX color' },
    watchStyleId: {
      type: Type.STRING,
      description: 'none | luxury_chronograph | minimal_dress_watch | smart_watch_ultra | vintage_gold_tank',
    },
    handbagStyleId: {
      type: Type.STRING,
      description: 'none | paris_saddle_bag | mini_top_handle | quilted_chain_flap | structured_tote | crossbody_messenger',
    },
    sunglassesStyleId: {
      type: Type.STRING,
      description: 'none | classic_aviator | retro_cat_eye | oversized_square | cyber_shield_sport | vintage_round_metal',
    },
    accessoryColorHex: { type: Type.STRING, description: '6-digit HEX color' },
    accessoryMetalHex: { type: Type.STRING, description: '6-digit HEX color' },
  },
  required: [
    'id',
    'title',
    'trendName',
    'seasonTag',
    'styleCompatibilityScore',
    'savedStyleMatchReason',
    'trendAnalysis',
    'imagePrompt',
    'recommendedPose',
    'topStyleId',
    'topColorHex',
    'topFabric',
    'outerwearStyleId',
    'outerwearColorHex',
    'outerwearFabric',
    'bottomStyleId',
    'bottomColorHex',
    'bottomFabric',
    'footwearStyleId',
    'footwearColorHex',
    'watchStyleId',
    'handbagStyleId',
    'sunglassesStyleId',
    'accessoryColorHex',
    'accessoryMetalHex',
  ],
};

const aiStylistResponseSchema = {
  type: Type.OBJECT,
  properties: {
    userStyleProfileSummary: {
      type: Type.STRING,
      description: 'Vietnamese summary of the user saved fashion preferences, colors, and silhouette DNA',
    },
    recommendations: {
      type: Type.ARRAY,
      items: aiStylistItemSchema,
    },
  },
  required: ['userStyleProfileSummary', 'recommendations'],
};

async function fetchLiveWeatherWithGoogleSearch(
  ai = new GoogleGenAI({ apiKey: 'init' }),
  locationQuery = '',
  latitude = Number.NaN,
  longitude = Number.NaN
) {
  const hasCoords =
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    typeof longitude === 'number' &&
    !Number.isNaN(longitude);

  const targetPlace = hasCoords
    ? `${locationQuery ? `${locationQuery} ` : ''}(tọa độ GPS ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
    : locationQuery || 'Hà Nội, Việt Nam';

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Hãy dùng Google Search tra cứu thời tiết hiện tại và dự báo hôm nay tại: ${targetPlace}.
Sau khi tra cứu xong, hãy trả về DUY NHẤT một khối JSON hợp lệ (không kèm giải thích ngoài JSON) theo cấu trúc sau:
{
  "locationName": "Tên thành phố/khu vực chuẩn xác (ví dụ: Hà Nội, Việt Nam hoặc TP. Hồ Chí Minh)",
  "temperatureC": 20,
  "feelsLikeC": 19,
  "conditionText": "Mô tả thời tiết bằng tiếng Việt (ví dụ: Mưa rào nhẹ, Trời lạnh có sương mù, Nắng ấm...)",
  "humidityPercent": 82,
  "windSpeedKmh": 16,
  "isRainy": true,
  "isCold": true,
  "stylistWeatherAdvice": "Lời khuyên phối đồ 1-2 câu bằng tiếng Việt dựa trên thời tiết thực tế này (nếu mưa hoặc lạnh <= 22 độ C thì khuyên mặc áo khoác Trench Coat, Blazer, Bomber, áo cổ lọ, chất liệu dạ/len/da giữ ấm và bốt)."
}
Lưu ý:
- Đặt "isRainy": true nếu đang mưa, mưa phùn, mưa rào, dông hoặc khả năng mưa cao.
- Đặt "isCold": true nếu nhiệt độ <= 22°C hoặc trời rét/se lạnh/gió mùa.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const rawText = (response.text ?? '').trim();
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  let parsed = JSON.parse('{}');
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = JSON.parse('{}');
    }
  }

  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const searchSources = [{ title: '', uri: '' }].slice(0, 0);
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    const title = chunk.web?.title || 'Google Search Weather';
    if (uri && !searchSources.some((s) => s.uri === uri)) {
      searchSources.push({ title, uri });
    }
  }

  const temperatureC = Number.isFinite(Number(parsed.temperatureC))
    ? Math.round(Number(parsed.temperatureC))
    : 21;
  const feelsLikeC = Number.isFinite(Number(parsed.feelsLikeC))
    ? Math.round(Number(parsed.feelsLikeC))
    : temperatureC;
  const conditionText = String(
    parsed.conditionText || 'Thời tiết thực tế tại khu vực'
  ).trim();
  const condLower = conditionText.toLowerCase();
  const isRainy =
    Boolean(parsed.isRainy) ||
    condLower.includes('mưa') ||
    condLower.includes('rain') ||
    condLower.includes('dông') ||
    condLower.includes('phùn');
  const isCold =
    Boolean(parsed.isCold) ||
    temperatureC <= 22 ||
    condLower.includes('lạnh') ||
    condLower.includes('rét') ||
    condLower.includes('se lạnh');

  const humidityPercent = Number.isFinite(Number(parsed.humidityPercent))
    ? Math.min(100, Math.max(20, Math.round(Number(parsed.humidityPercent))))
    : isRainy
      ? 86
      : 68;
  const windSpeedKmh = Number.isFinite(Number(parsed.windSpeedKmh))
    ? Math.min(90, Math.max(2, Math.round(Number(parsed.windSpeedKmh))))
    : 14;

  let weatherCategory = 'mild';
  if (isRainy && isCold) weatherCategory = 'rainy_cold';
  else if (isRainy) weatherCategory = 'rainy';
  else if (temperatureC <= 18) weatherCategory = 'cold';
  else if (isCold || temperatureC <= 23) weatherCategory = 'cool';
  else if (temperatureC >= 31) weatherCategory = 'hot';

  const recommendedWeatherMode = isRainy
    ? 'rain'
    : windSpeedKmh >= 20 || isCold
      ? 'wind'
      : 'clear';

  const defaultAdvice =
    isRainy && isCold
      ? `Thời tiết ${temperatureC}°C kèm mưa ẩm: Ưu tiên phối áo khoác Trench Coat hoặc Áo da Biker chắn gió nước, kết hợp áo cổ lọ dệt kim giữ ấm và Chelsea Boots.`
      : isRainy
        ? `Trời đang có mưa (${temperatureC}°C): Ưu tiên áo khoác Trench Coat hoặc Bomber cản mưa nhẹ, quần gọn gàng và giày bốt/sneaker chống bám nước.`
        : isCold
          ? `Trời lạnh/mát (${temperatureC}°C): Ưu tiên layering với áo khoác Blazer, Trench Coat hoặc Bomber cùng chất liệu nỉ/len/da giữ ấm cơ thể.`
          : `Thời tiết ${temperatureC}°C (${conditionText}): Thuận lợi cho các bản phối thoáng nhẹ, lụa satin, linen hoặc cotton cao cấp.`;

  return {
    locationName: String(
      parsed.locationName || locationQuery || 'Vị trí hiện tại'
    ).trim(),
    temperatureC,
    feelsLikeC,
    conditionText,
    humidityPercent,
    windSpeedKmh,
    isRainy,
    isCold,
    weatherCategory,
    stylistWeatherAdvice: String(
      parsed.stylistWeatherAdvice || defaultAdvice
    ).trim(),
    recommendedWeatherMode,
    searchSources,
    updatedAt: new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

app.post('/api/weather-forecast', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY_NOT_CONFIGURED',
      });
      return;
    }

    const locationQuery = String(req.body?.locationQuery || '').trim();
    const latitude =
      req.body?.latitude !== undefined ? Number(req.body.latitude) : undefined;
    const longitude =
      req.body?.longitude !== undefined
        ? Number(req.body.longitude)
        : undefined;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const forecast = await fetchLiveWeatherWithGoogleSearch(
      ai,
      locationQuery,
      latitude,
      longitude
    );
    res.json(forecast);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Lỗi tra cứu thời tiết Google Search';
    res.status(500).json({ error: msg });
  }
});

app.post('/api/ai-stylist', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY_NOT_CONFIGURED',
      });
      return;
    }

    const trendId = String(req.body?.trendId || 'quiet_luxury').trim();
    const trendLabel = String(
      req.body?.trendLabel || 'Quiet Luxury & Old Money'
    ).trim();
    const customPrompt = String(req.body?.customPrompt || '').trim();
    const genderProfile = String(req.body?.genderProfile || 'female').trim();
    const bodyShapeName = String(req.body?.bodyShapeName || 'Cân đối').trim();
    const heightCm = Number(req.body?.heightCm || 170);
    const weightKg = Number(req.body?.weightKg || 56);
    const savedOutfitsSummary = String(
      req.body?.savedOutfitsSummary ||
        'Ưa chuộng phong cách thanh lịch, phom dáng vừa vặn'
    ).trim();

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let weatherForecast = req.body?.weatherForecast || null;
    const locationQuery = String(req.body?.locationQuery || '').trim();
    const latitude =
      req.body?.latitude !== undefined ? Number(req.body.latitude) : undefined;
    const longitude =
      req.body?.longitude !== undefined
        ? Number(req.body.longitude)
        : undefined;

    if (!weatherForecast && (locationQuery || latitude !== undefined)) {
      try {
        weatherForecast = await fetchLiveWeatherWithGoogleSearch(
          ai,
          locationQuery,
          latitude,
          longitude
        );
      } catch {
        weatherForecast = null;
      }
    }

    const weatherDirective = weatherForecast
      ? `
- DỰ BÁO THỜI TIẾT THỰC TẾ TẠI VỊ TRÍ NGƯỜI DÙNG (qua Google Search):
  + Khu vực: ${weatherForecast.locationName}
  + Nhiệt độ: ${weatherForecast.temperatureC}°C (cảm giác như ${weatherForecast.feelsLikeC}°C), Tình trạng: ${weatherForecast.conditionText}, Độ ẩm: ${weatherForecast.humidityPercent}%, Gió: ${weatherForecast.windSpeedKmh} km/h.
  + Trạng thái: ${weatherForecast.isRainy ? 'ĐANG MƯA / ẨM ƯỚT' : 'Không mưa'}, ${weatherForecast.isCold ? 'TRỜI LẠNH / SE LẠNH' : 'Thời tiết ấm/mát'}.
  + YÊU CẦU BẮT BUỘC THEO THỜI TIẾT: ${
    weatherForecast.isRainy || weatherForecast.isCold
      ? `Vì thời tiết tại ${weatherForecast.locationName} đang ${weatherForecast.isRainy && weatherForecast.isCold ? 'MƯA VÀ LẠNH' : weatherForecast.isRainy ? 'CÓ MƯA' : 'LẠNH'} (${weatherForecast.temperatureC}°C), BẮT BUỘC cả 3 bộ trang phục gợi ý PHẢI ƯU TIÊN ÁO KHOÁC GIỮ ẤM / CHẮN MƯA GIÓ (outerwearStyleId phải chọn trong: trench_coat, tailored_blazer, biker_leather, bomber_jacket, denim_jacket; TUYỆT ĐỐI KHÔNG chọn 'none'), kết hợp áo trong giữ ấm (như female_turtleneck, off_shoulder_knit, crop_cardigan, silk_blouse_bow cho nữ; hoặc turtleneck_knit, hoodie_street, oxford_shirt cho nam), chất liệu vải ấm áp/chắn gió (fleece, leather, denim, cotton dày) và giày kín/bốt (chelsea_boots, knee_high_boots, chunky_dad_sneakers, high_top_sneakers, penny_loafers, oxford_dress_shoes). Trong phần trendAnalysis và savedStyleMatchReason hãy nêu rõ bộ đồ giúp giữ ấm / chống mưa phù hợp với thời tiết ${weatherForecast.temperatureC}°C (${weatherForecast.conditionText}) tại ${weatherForecast.locationName} như thế nào!`
      : `Phối trang phục phù hợp tối ưu với thời tiết thực tế ${weatherForecast.temperatureC}°C (${weatherForecast.conditionText}) tại ${weatherForecast.locationName}, đồng thời nêu rõ sự phù hợp thời tiết trong trendAnalysis.`
  }`
      : '';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Bạn là Giám đốc Sáng tạo & AI Fashion Stylist cao cấp.
Thông tin người mẫu:
- Giới tính: ${genderProfile === 'male' ? 'Nam' : 'Nữ'}, Chiều cao: ${heightCm}cm, Cân nặng: ${weightKg}kg, Dáng người: ${bodyShapeName}.
- Phong cách & Lịch sử phối đồ đã lưu của người dùng: ${savedOutfitsSummary}.
- Xu hướng thời trang chủ đạo yêu cầu: ${trendLabel} (${trendId}).${weatherDirective}
${customPrompt ? `- Yêu cầu cá nhân hóa thêm từ người dùng: "${customPrompt}".` : ''}

Hãy thiết kế 3 bộ trang phục trọn bộ (Full Lookbook: Áo trong + Áo khoác ngoài + Quần/Váy + Giày + Đồng hồ + Túi xách + Kính mát) kết hợp hài hòa giữa xu hướng thời trang hiện tại (${trendLabel}), dự báo thời tiết thực tế và DNA phong cách đã lưu của người dùng. Trả về đúng mã HEX 6 ký tự và đúng các styleId 3D được liệt kê trong schema.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: aiStylistResponseSchema,
      },
    });

    const jsonText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(jsonText);
    res.json({
      ...parsed,
      weatherForecast,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối Gemini API';
    res.status(500).json({ error: msg });
  }
});

const extractedGarmentItemSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: 'top | dress | outerwear | bottom | footwear | hair | hat | sunglasses | watch | handbag | prop',
    },
    vietnameseName: {
      type: Type.STRING,
      description: 'Vietnamese descriptive name of the item with style, material, and color e.g. Áo Blazer Dạ Tweed Trắng Kem, Quần Jean Ống Suông Xanh Cổ Điển, Túi Xách Da Chần Bông Quai Xích Đen, Kính Mát Mắt Mèo Đen, Đồng Hồ Dây Da Nâu Vỏ Vàng',
    },
    styleId: {
      type: Type.STRING,
      description:
        'Matching 3D styleId: For top: silk_blouse_bow | baby_tee | off_shoulder_knit | corset_top | silk_camisole | puff_blouse | halter_crop | crop_cardigan | female_turtleneck | peplum_waist_top | oxford_shirt | crewneck_tee | polo_shirt | henley_shirt | hoodie_street | turtleneck_knit | compression_athletic | fitted_tank. For dress: silk_slip_evening_dress | aline_princess_dress | bodycon_midi_dress | pleated_gala_gown | off_shoulder_couture_dress | corset_bustier_dress. For outerwear: tailored_blazer | trench_coat | biker_leather | denim_jacket | bomber_jacket | gilet_vest. For bottom: aline_skirt | pleated_maxi_skirt | pencil_skirt | female_denim_shorts | female_cargo_pants | slim_jeans | tailored_trousers | male_dress_trousers | male_denim_jeans | cargo_pants | tailored_shorts | male_chino_khaki | male_jogger_sport. For footwear: minimal_sneakers | chunky_dad_sneakers | high_top_sneakers | chelsea_boots | knee_high_boots | penny_loafers | oxford_dress_shoes | pointed_heels | strappy_stiletto_heels | platform_mary_jane | heel_sandals | derby_shoes. For hair: female_cut_side_ponytail | female_cut_long_side_straight | female_cut_long_wavy_bangs | female_cut_long_curtain_wave | female_cut_medium_c_curl | female_cut_side_low_bun | long_wavy | long_straight | curly_voluminous | korean_hime_layer | butterfly_wolf_cut | shoulder_bob | clavicle_lob | high_ponytail | updo_bun | low_chignon | pixie_short | twin_braids | male_vec_side_swept_pomp | male_vec_textured_pompadour | male_vec_spiky_quiff | male_vec_side_comb_layer | male_vec_textured_crop | male_vec_classic_pompadour | male_vec_comma_part | male_vec_long_diagonal_fringe | male_vec_wavy_center_back | male_sil_r1c1_square_part | male_sil_r1c2_jagged_fringe | male_sil_r1c3_flat_crest | male_sil_r2c1_round_bowl | male_sil_r2c2_wavy_widow | male_sil_r2c3_classic_side | male_sil_r3c1_crew_dome | male_sil_r3c2_side_sweep_bang | male_sil_r3c3_french_crop | male_sil_r4c1_faux_hawk | male_sil_r4c2_dandy_fringe | male_sil_r4c3_shaggy_layer | male_sil_r5c1_messy_fringe | male_sil_r5c2_curtain_part | male_sil_r5c3_winged_back | male_sil_r6c1_swept_quiff | male_sil_r6c2_asym_wave | male_sil_r6c3_soft_two_block | male_sil_r7c1_side_strands | male_sil_r7c2_ivy_league | male_sil_r7c3_spiky_sweep | male_sil_r8c1_silver_classic | male_sil_r8c2_round_shag | male_sil_r8c3_short_spiky_crew. For hat: baseball_cap | bucket_hat | beret_paris | wide_brim_sunhat. For sunglasses: classic_aviator | retro_cat_eye | oversized_square | sport_shield | vintage_round_metal. For watch: luxury_chronograph | minimal_dress_watch | smart_watch_ultra | vintage_gold_tank | rose_gold_bangle. For handbag: paris_saddle_bag | structured_tote_bag | quilted_chain_flap | mini_top_handle | crossbody_messenger. For prop: luxury_umbrella | transparent_dome_umbrella | basketball_pro | soccer_ball_fifa | art_toy_bear | plush_bunny_toy',
    },
    colorHex: {
      type: Type.STRING,
      description: 'Primary 6-digit HEX color of this specific item (for watch: strap color; for sunglasses: frame color; for handbag: leather body color) e.g. #1E293B',
    },
    secondaryColorHex: {
      type: Type.STRING,
      description: 'Secondary/trim/hardware 6-digit HEX color of this item (for watch: case/dial metal color; for sunglasses: lens color; for handbag: lock/chain hardware color; for hat: ribbon/trim color) e.g. #D4AF37',
    },
    backgroundHex: {
      type: Type.STRING,
      description: 'Dominant 6-digit HEX color of the surrounding studio/room background immediately outside the item boundary e.g. #F5F5F4',
    },
    skinToneHex: {
      type: Type.STRING,
      description: '6-digit HEX color of the human model skin if visible near neck/arms/legs, or #E6B89C if no skin is visible',
    },
    hairColorHex: {
      type: Type.STRING,
      description: '6-digit HEX color of the human model hair if visible near head/shoulders, or #1E1B18 if no hair is visible',
    },
    isComplexFabric: {
      type: Type.BOOLEAN,
      description: 'True if the item has intricate surface texture, ribbed knit, lace, tweed, plaid, stripes, or complex woven edges that require anti-aliased edge matting',
    },
    fabric: {
      type: Type.STRING,
      description: 'cotton | silk | denim | leather | fleece | linen',
    },
    weavePattern: {
      type: Type.STRING,
      description: 'solid | ribbed_knit | denim_twill | striped | plaid_check | leather_grain | silk_satin',
    },
    fitEase: {
      type: Type.STRING,
      description: 'slim | regular | oversized',
    },
    sleeveLength: {
      type: Type.STRING,
      description:
        'For top, dress, or outerwear: sleeveless (2 dây, ba lỗ, cúp ngực, yếm, gile) | short (tay ngắn, baby tee, áo thun cộc tay, polo tay ngắn) | long (tay dài qua khuỷu tay hoặc tới cổ tay: sơ mi tay dài, áo thun tay dài, áo len/sweater, hoodie, cardigan, áo cổ lọ, blazer). Leave empty for non-upper-body items.',
    },
    sunglassesWearPosition: {
      type: Type.STRING,
      description: 'For sunglasses: eyes (worn on face/eyes) | head_crown (pushed up on top of head/hair). Empty or eyes for other items.',
    },
    handbagCarryMode: {
      type: Type.STRING,
      description: 'For handbag: crook_of_arm | shoulder_bag | hand_held. Empty or auto for other items.',
    },
    ymin: {
      type: Type.NUMBER,
      description: 'Normalized top bounding box coordinate (0 to 1000) of this item in the image',
    },
    xmin: {
      type: Type.NUMBER,
      description: 'Normalized left bounding box coordinate (0 to 1000) of this item in the image',
    },
    ymax: {
      type: Type.NUMBER,
      description: 'Normalized bottom bounding box coordinate (0 to 1000) of this item in the image',
    },
    xmax: {
      type: Type.NUMBER,
      description: 'Normalized right bounding box coordinate (0 to 1000) of this item in the image',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Detection and 3D style matching confidence from 86 to 98',
    },
  },
  required: [
    'category',
    'vietnameseName',
    'styleId',
    'colorHex',
    'secondaryColorHex',
    'backgroundHex',
    'skinToneHex',
    'hairColorHex',
    'isComplexFabric',
    'fabric',
    'weavePattern',
    'fitEase',
    'sleeveLength',
    'ymin',
    'xmin',
    'ymax',
    'xmax',
    'confidence',
  ],
};

const extractGarmentsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    isModelWearingMultipleItems: {
      type: Type.BOOLEAN,
      description: 'True if the photo shows a person/model wearing an outfit or multiple items',
    },
    summaryText: {
      type: Type.STRING,
      description: 'Short Vietnamese summary of all garments, hairstyles, shoes, hats, watches, handbags, sunglasses, and accessories detected and separated from the photo',
    },
    items: {
      type: Type.ARRAY,
      items: extractedGarmentItemSchema,
    },
  },
  required: ['isModelWearingMultipleItems', 'summaryText', 'items'],
};

app.post('/api/extract-garments', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY_NOT_CONFIGURED',
      });
      return;
    }

    const imageBase64 = String(req.body?.imageBase64 || '').trim();
    const rawMime = String(req.body?.mimeType || 'image/jpeg').trim();
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : rawMime;
    const genderProfile = String(req.body?.genderProfile || 'female').trim();
    const preferredCategory = String(req.body?.preferredCategory || '').trim();

    if (!imageBase64) {
      res.status(400).json({ error: 'Thiếu dữ liệu ảnh trang phục.' });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const promptText = `Bạn là hệ thống AI Thị Giác Máy Tính (Full-Body Fashion, Hair, Footwear & Accessory Segmentation & Matting) chuyên phân tích và bóc tách TẤT CẢ MỌI THỨ người mẫu đang mặc và mang trên người từ bức ảnh để tái tạo đồng bộ 85% - 95% lên ma-nơ-canh 3D.
Giới tính ma-nơ-canh mục tiêu: ${genderProfile === 'male' ? 'Nam (male)' : 'Nữ (female)'}.
${preferredCategory ? `Người dùng ưu tiên phân loại vào mục: ${preferredCategory} (nếu ảnh chỉ chụp 1 món đồ lẻ; nếu ảnh là người mẫu mặc nhiều món thì vẫn bóc tách ĐẦY ĐỦ tất cả các món trên người mẫu).` : ''}
Hãy quan sát kỹ toàn bộ bức ảnh (từ đỉnh đầu, mắt, tai, cổ, vai, ngực, cánh tay, cổ tay, bàn tay, hông, chân đến bàn chân) và bóc tách ĐẦY ĐỦ TẤT CẢ CÁC HẠNG MỤC xuất hiện trong ảnh (TUYỆT ĐỐI KHÔNG BỎ SÓT PHỤ KIỆN):
1. TRANG PHỤC CHÍNH ('dress' HOẶC 'top' + 'bottom', VÀ 'outerwear'):
   - Nếu người trong ảnh mặc ĐẦM LIỀN THÂN / VÁY LIỀN 1 MẢNH (từ phần ngực/vai nối liền mạch qua eo xuống chân váy): BẮT BUỘC phân loại là 1 mục 'dress' duy nhất (styleId: silk_slip_evening_dress | aline_princess_dress | bodycon_midi_dress | pleated_gala_gown | off_shoulder_couture_dress | corset_bustier_dress). KHÔNG tách nhầm đầm liền thành 'top' và 'bottom'.
   - Nếu người trong ảnh mặc ÁO RỜI kết hợp QUẦN hoặc CHÂN VÁY RỜI: BẮT BUỘC trả về đầy đủ cả mục 'top' VÀ mục 'bottom' riêng biệt.
   - QUY TẮC ÁO TAY DÀI ('sleeveLength' = 'long') — TUYỆT ĐỐI KHÔNG BIẾN ÁO TAY DÀI THÀNH TAY NGẮN:
     + Quan sát kỹ chiều dài ống tay áo: nếu ống tay áo dài qua khuỷu tay hoặc phủ tới cổ tay (sơ mi tay dài, áo thun tay dài, áo len/sweater, hoodie, cardigan, áo cổ lọ, áo trễ vai tay dài): BẮT BUỘC đặt \`sleeveLength: "long"\`, đặt tên tiếng Việt có ghi rõ kiểu áo tay dài, bao trọn cả 2 ống tay dài trong khung \`[ymin, xmin, ymax, xmax]\`, và BẮT BUỘC chọn \`styleId\` tay dài tương ứng:
       * Nữ: \`female_turtleneck\` (áo thun/len ôm tay dài hoặc cổ lọ), \`silk_blouse_bow\` (áo sơ mi / blouse tay dài), \`crop_cardigan\` (áo cardigan / len cài nút tay dài), \`off_shoulder_knit\` (áo trễ vai tay dài). TUYỆT ĐỐI KHÔNG chọn \`baby_tee\` hay \`puff_blouse\` cho áo tay dài!
       * Nam: \`turtleneck_knit\` (áo thun dài tay / áo len / cổ lọ dài tay), \`oxford_shirt\` (áo sơ mi dài tay), \`hoodie_street\` (áo hoodie / sweater nỉ dài tay), \`henley_shirt\` (áo henley dài tay). TUYỆT ĐỐI KHÔNG chọn \`crewneck_tee\` hay \`polo_shirt\` cho áo tay dài!
   - Nếu người mẫu có khoác thêm áo ngoài (blazer, trench coat, áo da, denim, bomber, gile) bên ngoài áo trong/đầm: BẮT BUỘC tách riêng thêm mục 'outerwear' (styleId: tailored_blazer | trench_coat | biker_leather | denim_jacket | bomber_jacket | gilet_vest).
2. PHỤ KIỆN & ĐẠO CỤ ('hat', 'sunglasses', 'watch', 'handbag', 'prop') — QUAN TRỌNG NHẤT:
   - Quét kỹ vùng ĐẦU & TÓC:
     + Nếu có mũ/nón: tách mục 'hat' (styleId: baseball_cap | bucket_hat | beret_paris | wide_brim_sunhat).
     + Nếu có kính mát/kính thời trang đeo trên mắt HOẶC cài trên đỉnh đầu/tóc: BẮT BUỘC tách mục 'sunglasses' (styleId: classic_aviator | retro_cat_eye | oversized_square | sport_shield | vintage_round_metal). Đặt sunglassesWearPosition = 'head_crown' nếu kính cài trên đầu/tóc, hoặc 'eyes' nếu đeo ở mắt. colorHex = màu gọng kính, secondaryColorHex = màu tròng kính.
   - Quét kỹ vùng CỔ TAY & BÀN TAY & VAI:
     + Nếu trên cổ tay trái hoặc phải có đồng hồ / vòng tay: BẮT BUỘC tách mục 'watch' (styleId: luxury_chronograph | minimal_dress_watch | smart_watch_ultra | vintage_gold_tank | rose_gold_bangle). colorHex = màu dây đồng hồ, secondaryColorHex = màu vỏ/mặt kim loại.
     + Nếu có túi xách cầm tay, vắt khuỷu tay, đeo vai hoặc đeo chéo: BẮT BUỘC tách mục 'handbag' (styleId: paris_saddle_bag | structured_tote_bag | quilted_chain_flap | mini_top_handle | crossbody_messenger). Đặt handbagCarryMode = 'crook_of_arm' | 'shoulder_bag' | 'hand_held'. colorHex = màu da túi, secondaryColorHex = màu khóa/dây xích kim loại.
     + Nếu có cầm ô/dù, bóng thể thao, thú bông, ly hoặc đạo cụ: tách mục 'prop' (styleId: luxury_umbrella | transparent_dome_umbrella | basketball_pro | soccer_ball_fifa | art_toy_bear | plush_bunny_toy).
3. KIỂU TÓC & MÀU TÓC ('hair'):
   - Nếu nhìn thấy đầu và tóc của người mẫu: BẮT BUỘC tách 1 mục 'hair' với colorHex là mã màu HEX thật của mái tóc và styleId 3D khớp nhất.
4. GIÀY DÉP / BỐT / CAO GÓT ('footwear'):
   - Nếu thấy giày, sneaker, bốt hoặc giày cao gót ở phần chân: tách 1 mục 'footwear' (styleId: minimal_sneakers | chunky_dad_sneakers | high_top_sneakers | chelsea_boots | knee_high_boots | penny_loafers | oxford_dress_shoes | pointed_heels | strappy_stiletto_heels | platform_mary_jane).
5. LỌC BỎ NỀN & DA NGƯỜI MẪU TRONG KHUNG BAO (ymin, xmin, ymax, xmax trên thang 0..1000):
   - Tọa độ (ymin, xmin, ymax, xmax) PHẢI ôm sát đúng từng món đồ/phụ kiện riêng biệt để thuật toán tách nền cắt riêng chính xác từng món.
   - Lấy mã màu HEX chuẩn xác (colorHex, secondaryColorHex) từ trung tâm của từng món đồ, cùng với backgroundHex, skinToneHex và hairColorHex.`;

    const modelCandidates = [
      'gemini-2.5-flash',
      'gemini-3-flash-preview',
      'gemini-flash-latest',
    ];
    let response = null;
    let lastError: unknown = null;
    for (const modelName of modelCandidates) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: extractGarmentsResponseSchema,
            temperature: 0.1,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        if (response && response.text) break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!response) {
      throw lastError || new Error('Không thể kết nối mô hình phân tích ảnh Gemini.');
    }

    const jsonText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi kết nối Gemini API';
    res.status(500).json({ error: msg });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const publicPath = path.resolve(__dirname, 'public');
  const distPath = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.join(distPath, 'index.html');

  // Always serve /public assets (including /models/*.glb) directly before any SPA HTML fallback
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  const isDev =
    process.env.npm_lifecycle_event === 'dev' ||
    process.env.NODE_ENV !== 'production';

  const hasStaticDist = fs.existsSync(distIndexHtml);

  if (!isDev && hasStaticDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      if (fs.existsSync(distIndexHtml)) {
        res.sendFile(distIndexHtml, (err) => {
          if (err && !res.headersSent) {
            res.status(500).send('Không thể tải giao diện.');
          }
        });
      } else {
        res.status(503).send('Đang xây dựng giao diện...');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Wardrobe server listening on http://0.0.0.0:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

startServer();
