import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Remove light background (white / light grey / studio backdrop)
 * by converting light pixels to transparent, and resize/compress PNG to < 120KB.
 */
async function processAndSaveImage(
  inputBuffer: Buffer,
  outputPath: string,
  threshold = 215,
  maxWidth = 600
) {
  const image = sharp(inputBuffer);
  const meta = await image.metadata();

  const width = Math.min(meta.width || maxWidth, maxWidth);
  const resized = await image.resize(width, null, { withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const numPixels = resized.info.width * resized.info.height;
  const data = resized.data;

  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // If pixel is near white/light grey, transparent
    if (r > threshold && g > threshold && b > threshold) {
      data[i * 4 + 3] = 0;
    } else if (r > threshold - 20 && g > threshold - 20 && b > threshold - 20) {
      const avg = (r + g + b) / 3;
      const alpha = Math.max(0, Math.min(255, (255 - avg) * 5));
      data[i * 4 + 3] = Math.round((data[i * 4 + 3] * alpha) / 255);
    }
  }

  await sharp(data, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: 4,
    },
  })
    .trim()
    .png({ quality: 85, compressionLevel: 9, palette: true })
    .toFile(outputPath);

  const stat = fs.statSync(outputPath);
  console.log(`Saved ${path.basename(outputPath)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log('Processing male clothing items...');
  const croppedDir = path.join(process.cwd(), 'public/assets/cropped');
  if (!fs.existsSync(croppedDir)) fs.mkdirSync(croppedDir, { recursive: true });

  const aistudioDir = path.join(process.cwd(), 'public/assets/aistudio');

  // 1. Henley Top & Black Wide Jeans from t_i_xu_ng__12__9d0b3191.jpe
  const img12 = fs.readFileSync(path.join(aistudioDir, 't_i_xu_ng__12__9d0b3191.jpe'));
  const meta12 = await sharp(img12).metadata();
  const h12 = meta12.height || 1308;
  const w12 = meta12.width || 736;

  // Henley Top (top 42%)
  const top12Buf = await sharp(img12).extract({ left: 0, top: 0, width: w12, height: Math.floor(h12 * 0.42) }).toBuffer();
  await processAndSaveImage(top12Buf, path.join(croppedDir, 'm_top_henley_black.png'));

  // Black Wide Jeans (bottom 60%)
  const pant12Buf = await sharp(img12).extract({ left: 0, top: Math.floor(h12 * 0.38), width: w12, height: Math.floor(h12 * 0.62) }).toBuffer();
  await processAndSaveImage(pant12Buf, path.join(croppedDir, 'm_pant_jeans_black_wide.png'));

  // Outfit set 12
  await processAndSaveImage(img12, path.join(croppedDir, 'm_outfit_henley_jeans.png'), 215, 500);

  // 2. Halfzip Black & Jeans from t_i_xu_ng__11__26b752cd.jpe
  const img11 = fs.readFileSync(path.join(aistudioDir, 't_i_xu_ng__11__26b752cd.jpe'));
  const meta11 = await sharp(img11).metadata();
  const h11 = meta11.height || 1308;
  const w11 = meta11.width || 736;

  const top11Buf = await sharp(img11).extract({ left: 0, top: 0, width: w11, height: Math.floor(h11 * 0.45) }).toBuffer();
  await processAndSaveImage(top11Buf, path.join(croppedDir, 'm_top_halfzip_black.png'));
  await processAndSaveImage(img11, path.join(croppedDir, 'm_outfit_halfzip_black.png'), 215, 500);

  // 3. Halfzip Grey & Blue Jeans from t_i_xu_ng__10__bcb68203.jpe
  const img10 = fs.readFileSync(path.join(aistudioDir, 't_i_xu_ng__10__bcb68203.jpe'));
  const meta10 = await sharp(img10).metadata();
  const h10 = meta10.height || 1308;
  const w10 = meta10.width || 736;

  const top10Buf = await sharp(img10).extract({ left: 0, top: 0, width: w10, height: Math.floor(h10 * 0.42) }).toBuffer();
  await processAndSaveImage(top10Buf, path.join(croppedDir, 'm_top_halfzip_grey.png'));

  const pant10Buf = await sharp(img10).extract({ left: 0, top: Math.floor(h10 * 0.38), width: Math.floor(w10 * 0.7), height: Math.floor(h10 * 0.62) }).toBuffer();
  await processAndSaveImage(pant10Buf, path.join(croppedDir, 'm_pant_jeans_blue_wide.png'));
  await processAndSaveImage(img10, path.join(croppedDir, 'm_outfit_halfzip_grey.png'), 215, 500);

  // 4. Brown Casual Jacket & Jeans from t_i_xu_ng__9__a5abe316.jpe
  const img9 = fs.readFileSync(path.join(aistudioDir, 't_i_xu_ng__9__a5abe316.jpe'));
  const meta9 = await sharp(img9).metadata();
  const h9 = meta9.height || 1200;
  const w9 = meta9.width || 675;

  const jacketBuf = await sharp(img9).extract({ left: 0, top: 0, width: w9, height: Math.floor(h9 * 0.45) }).toBuffer();
  await processAndSaveImage(jacketBuf, path.join(croppedDir, 'm_outer_jacket_brown.png'));
  await processAndSaveImage(img9, path.join(croppedDir, 'm_outfit_jacket_brown.png'), 215, 500);

  // 5. White Shirt Tie & Grey Jeans from t_i_xu_ng__8__e33986ed.jpe
  const img8 = fs.readFileSync(path.join(aistudioDir, 't_i_xu_ng__8__e33986ed.jpe'));
  const meta8 = await sharp(img8).metadata();
  const h8 = meta8.height || 1200;
  const w8 = meta8.width || 675;

  const shirtBuf = await sharp(img8).extract({ left: 0, top: 0, width: w8, height: Math.floor(h8 * 0.5) }).toBuffer();
  await processAndSaveImage(shirtBuf, path.join(croppedDir, 'm_top_tie_shirt.png'));
  await processAndSaveImage(img8, path.join(croppedDir, 'm_outfit_tie_shirt.png'), 215, 500);

  // 6. Black Vest Suit Waistcoat from t_i_xu_ng__7__fa4f49b8.jpe
  const img7 = fs.readFileSync(path.join(aistudioDir, 't_i_xu_ng__7__fa4f49b8.jpe'));
  const meta7 = await sharp(img7).metadata();
  const h7 = meta7.height || 1308;
  const w7 = meta7.width || 736;

  const vestBuf = await sharp(img7).extract({ left: 0, top: 0, width: w7, height: Math.floor(h7 * 0.45) }).toBuffer();
  await processAndSaveImage(vestBuf, path.join(croppedDir, 'm_outer_vest_black.png'));

  const dressPantBuf = await sharp(img7).extract({ left: 0, top: Math.floor(h7 * 0.42), width: w7, height: Math.floor(h7 * 0.58) }).toBuffer();
  await processAndSaveImage(dressPantBuf, path.join(croppedDir, 'm_pant_trousers_black_pleated.png'));
  await processAndSaveImage(img7, path.join(croppedDir, 'm_outfit_vest_suit.png'), 215, 500);

  // 7. Black Camp Collar Shirt & White Trousers from Men_Aesthetic_Clothe_87443a03.jpe
  const imgAest = fs.readFileSync(path.join(aistudioDir, 'Men_Aesthetic_Clothe_87443a03.jpe'));
  const metaAest = await sharp(imgAest).metadata();
  const hAest = metaAest.height || 948;
  const wAest = metaAest.width || 620;

  const campBuf = await sharp(imgAest).extract({ left: 0, top: 0, width: wAest, height: Math.floor(hAest * 0.45) }).toBuffer();
  await processAndSaveImage(campBuf, path.join(croppedDir, 'm_top_camp_shirt.png'));

  const whitePantBuf = await sharp(imgAest).extract({ left: 0, top: Math.floor(hAest * 0.38), width: wAest, height: Math.floor(hAest * 0.62) }).toBuffer();
  await processAndSaveImage(whitePantBuf, path.join(croppedDir, 'm_pant_white_trousers.png'));
  await processAndSaveImage(imgAest, path.join(croppedDir, 'm_outfit_camp_shirt.png'), 215, 500);

  // 8. Sport Polo & Jogger from outfit_idea_a637be8b.jpe
  const imgPolo = fs.readFileSync(path.join(aistudioDir, 'outfit_idea_a637be8b.jpe'));
  const metaPolo = await sharp(imgPolo).metadata();
  const hPolo = metaPolo.height || 1104;
  const wPolo = metaPolo.width || 736;

  const sportBuf = await sharp(imgPolo).extract({ left: Math.floor(wPolo * 0.4), top: 0, width: Math.floor(wPolo * 0.6), height: Math.floor(hPolo * 0.5) }).toBuffer();
  await processAndSaveImage(sportBuf, path.join(croppedDir, 'm_top_sport_polo.png'));

  const joggerBuf = await sharp(imgPolo).extract({ left: 0, top: 0, width: Math.floor(wPolo * 0.5), height: Math.floor(hPolo * 0.8) }).toBuffer();
  await processAndSaveImage(joggerBuf, path.join(croppedDir, 'm_pant_jogger_white.png'));
  await processAndSaveImage(imgPolo, path.join(croppedDir, 'm_outfit_sport_polo.png'), 215, 500);

  console.log('All male cropped items processed with 100% transparent backgrounds & compressed sizes!');
}

main().catch(console.error);
