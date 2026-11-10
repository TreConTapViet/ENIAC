import type { MannequinProportions } from '@/lib/bodyAnalysis';

interface Props {
  proportions: MannequinProportions;
  gender: 'male' | 'female';
  clothingImage?: string | null;
  clothingCategory?: 'top' | 'bottom' | 'dress' | 'outerwear' | 'other';
  className?: string;
}

// A large chibi-style mannequin: big round head, cute face, small body.
// Body widths are driven by the user's real measurements so each person
// gets a unique silhouette. Clothing is overlaid depending on category.
export default function Mannequin({
  proportions,
  gender,
  clothingImage,
  clothingCategory = 'other',
  className,
}: Props) {
  const cx = 160;
  const headR = 52;
  const headCY = 60;
  const neckY = headCY + headR - 4;
  const shoulderY = neckY + 16;
  const bustY = shoulderY + 40;
  const waistY = shoulderY + 80;
  const hipY = shoulderY + 120;
  const feetY = 400;

  const shoulderHalf = 44 * proportions.shoulderWidth;
  const bustHalf = 38 * proportions.chestWidth;
  const waistHalf = 28 * proportions.waistWidth;
  const hipHalf = 42 * proportions.hipWidth;
  const build = proportions.buildScale;

  const skin = '#fce0d0';
  const skinShade = '#f0c8b0';
  const stroke = '#d9a880';
  const hairColor = gender === 'female' ? '#5a3a2a' : '#3a2a4a';

  return (
    <svg viewBox="0 0 320 430" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="cheekGradM" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#f0a8a8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f0a8a8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx={cx} cy={feetY + 6} rx={50} ry={6} fill="rgba(0,0,0,0.12)" />

      {/* ===== LEGS ===== */}
      <ChibiLegs cx={cx} hipY={hipY} hipHalf={hipHalf} feetY={feetY} build={build} />

      {/* ===== TORSO ===== */}
      <path
        d={torsoPath(cx, shoulderY, shoulderHalf, bustHalf, waistHalf, hipHalf, bustY, waistY, hipY)}
        fill={skin}
        stroke={stroke}
        strokeWidth={1}
      />

      {/* bust for female */}
      {gender === 'female' && (
        <>
          <ellipse cx={cx - bustHalf * 0.4} cy={bustY} rx={bustHalf * 0.3} ry={8} fill={skinShade} opacity={0.3} />
          <ellipse cx={cx + bustHalf * 0.4} cy={bustY} rx={bustHalf * 0.3} ry={8} fill={skinShade} opacity={0.3} />
        </>
      )}

      {/* ===== ARMS ===== */}
      <ChibiArm cx={cx} shoulderY={shoulderY} shoulderHalf={shoulderHalf} side="left" skin={skin} stroke={stroke} scale={build} />
      <ChibiArm cx={cx} shoulderY={shoulderY} shoulderHalf={shoulderHalf} side="right" skin={skin} stroke={stroke} scale={build} />

      {/* ===== NECK ===== */}
      <rect x={cx - 9} y={neckY - 4} width={18} height={20} rx={6} fill={skin} stroke={stroke} strokeWidth={0.8} />

      {/* ===== HAIR BACK ===== */}
      {gender === 'female' ? (
        <path
          d={`M${cx - headR + 2} ${headCY} Q${cx - headR - 6} ${headCY - headR + 4} ${cx} ${headCY - headR + 2} Q${cx + headR + 6} ${headCY - headR + 4} ${cx + headR - 2} ${headCY} L${cx + headR - 6} ${headCY + headR - 8} Q${cx + headR - 14} ${headCY + headR - 2} ${cx + headR - 22} ${headCY + headR - 6} L${cx - headR + 22} ${headCY + headR - 6} Q${cx - headR + 14} ${headCY + headR - 2} ${cx - headR + 6} ${headCY + headR - 8} Z`}
          fill={hairColor}
        />
      ) : (
        <path
          d={`M${cx - headR + 2} ${headCY} Q${cx - headR - 4} ${headCY - headR + 6} ${cx} ${headCY - headR + 4} Q${cx + headR + 4} ${headCY - headR + 6} ${cx + headR - 2} ${headCY} L${cx + headR - 4} ${headCY + 10} Q${cx + headR - 12} ${headCY + 14} ${cx + headR - 18} ${headCY + 12} L${cx - headR + 18} ${headCY + 12} Q${cx - headR + 12} ${headCY + 14} ${cx - headR + 4} ${headCY + 10} Z`}
          fill={hairColor}
        />
      )}

      {/* ===== HEAD — big round ===== */}
      <circle cx={cx} cy={headCY} r={headR} fill={skin} stroke={stroke} strokeWidth={0.8} />

      {/* ears */}
      <circle cx={cx - headR + 4} cy={headCY + 4} r={5} fill={skinShade} stroke={stroke} strokeWidth={0.5} />
      <circle cx={cx + headR - 4} cy={headCY + 4} r={5} fill={skinShade} stroke={stroke} strokeWidth={0.5} />

      {/* cheeks */}
      <circle cx={cx - 18} cy={headCY + 12} rx={9} ry={7} fill="url(#cheekGradM)" />
      <circle cx={cx + 18} cy={headCY + 12} rx={9} ry={7} fill="url(#cheekGradM)" />

      {/* eyes — big sparkly */}
      <ellipse cx={cx - 16} cy={headCY + 2} rx={7} ry={8} fill="#fff" stroke="#cbb" strokeWidth={0.5} />
      <ellipse cx={cx + 16} cy={headCY + 2} rx={7} ry={8} fill="#fff" stroke="#cbb" strokeWidth={0.5} />
      <circle cx={cx - 15} cy={headCY + 3} r={5} fill="#3a2418" />
      <circle cx={cx + 17} cy={headCY + 3} r={5} fill="#3a2418" />
      <circle cx={cx - 13} cy={headCY + 0.5} r={2} fill="#fff" />
      <circle cx={cx + 19} cy={headCY + 0.5} r={2} fill="#fff" />

      {/* eyebrows */}
      <path d={`M${cx - 22} ${headCY - 10} Q${cx - 16} ${headCY - 13} ${cx - 10} ${headCY - 10}`} fill="none" stroke={hairColor} strokeWidth={2} strokeLinecap="round" />
      <path d={`M${cx + 10} ${headCY - 10} Q${cx + 16} ${headCY - 13} ${cx + 22} ${headCY - 10}`} fill="none" stroke={hairColor} strokeWidth={2} strokeLinecap="round" />

      {/* nose — tiny */}
      <circle cx={cx} cy={headCY + 14} r={1.5} fill={stroke} opacity={0.5} />

      {/* mouth — cute smile */}
      <path d={`M${cx - 10} ${headCY + 24} Q${cx} ${headCY + 31} ${cx + 10} ${headCY + 24}`} fill="none" stroke="#c06050" strokeWidth={2.5} strokeLinecap="round" />

      {/* ===== HAIR FRONT ===== */}
      {gender === 'female' ? (
        <>
          <path d={`M${cx - headR + 4} ${headCY - 4} Q${cx - headR - 2} ${headCY - headR + 8} ${cx} ${headCY - headR + 4} Q${cx + headR + 2} ${headCY - headR + 8} ${cx + headR - 4} ${headCY - 4} Q${cx + headR - 14} ${headCY - 12} ${cx + headR - 24} ${headCY - 8} Q${cx} ${headCY - headR + 16} ${cx - headR + 24} ${headCY - 8} Q${cx - headR + 14} ${headCY - 12} ${cx - headR + 4} ${headCY - 4} Z`} fill={hairColor} />
          {/* side locks */}
          <path d={`M${cx - headR + 4} ${headCY} Q${cx - headR - 2} ${headCY + 20} ${cx - headR + 8} ${headCY + headR - 8} L${cx - headR + 16} ${headCY + headR - 8} Q${cx - headR + 10} ${headCY + 20} ${cx - headR + 12} ${headCY} Z`} fill={hairColor} />
          <path d={`M${cx + headR - 4} ${headCY} Q${cx + headR + 2} ${headCY + 20} ${cx + headR - 8} ${headCY + headR - 8} L${cx + headR - 16} ${headCY + headR - 8} Q${cx + headR - 10} ${headCY + 20} ${cx + headR - 12} ${headCY} Z`} fill={hairColor} />
          {/* hair clip */}
          <path d={`M${cx - 24} ${headCY - headR + 14} L${cx - 30} ${headCY - headR + 10} L${cx - 30} ${headCY - headR + 18} Z`} fill="#f06292" />
          <path d={`M${cx - 24} ${headCY - headR + 14} L${cx - 18} ${headCY - headR + 10} L${cx - 18} ${headCY - headR + 18} Z`} fill="#f06292" />
          <circle cx={cx - 24} cy={headCY - headR + 14} r="3" fill="#ec407a" />
        </>
      ) : (
        <path d={`M${cx - headR + 4} ${headCY - 4} Q${cx - headR} ${headCY - headR + 10} ${cx} ${headCY - headR + 6} Q${cx + headR} ${headCY - headR + 10} ${cx + headR - 4} ${headCY - 4} Q${cx + 10} ${headCY - headR + 14} ${cx} ${headCY - headR + 12} Q${cx - 10} ${headCY - headR + 14} ${cx - headR + 4} ${headCY - 4} Z`} fill={hairColor} />
      )}

      {/* ===== CLOTHING OVERLAY ===== */}
      {clothingImage && (
        <ClothingOverlay
          cx={cx}
          shoulderY={shoulderY}
          hipY={hipY}
          feetY={feetY}
          shoulderHalf={shoulderHalf}
          category={clothingCategory}
          image={clothingImage}
        />
      )}
    </svg>
  );
}

function torsoPath(
  cx: number,
  shoulderY: number,
  shoulderHalf: number,
  bustHalf: number,
  waistHalf: number,
  hipHalf: number,
  bustY: number,
  waistY: number,
  hipY: number
) {
  return [
    `M${cx - shoulderHalf} ${shoulderY}`,
    `C${cx - shoulderHalf * 0.9} ${shoulderY + 16}, ${cx - bustHalf} ${bustY - 10}, ${cx - bustHalf} ${bustY}`,
    `C${cx - bustHalf * 0.8} ${bustY + 14}, ${cx - waistHalf} ${waistY - 8}, ${cx - waistHalf} ${waistY}`,
    `C${cx - waistHalf} ${waistY + 12}, ${cx - hipHalf} ${hipY - 16}, ${cx - hipHalf} ${hipY}`,
    `L${cx + hipHalf} ${hipY}`,
    `C${cx + hipHalf} ${hipY - 16}, ${cx + waistHalf} ${waistY + 12}, ${cx + waistHalf} ${waistY}`,
    `C${cx + waistHalf} ${waistY - 8}, ${cx + bustHalf * 0.8} ${bustY + 14}, ${cx + bustHalf} ${bustY}`,
    `C${cx + bustHalf} ${bustY - 10}, ${cx + shoulderHalf * 0.9} ${shoulderY + 16}, ${cx + shoulderHalf} ${shoulderY}`,
    `Q${cx} ${shoulderY - 6} ${cx - shoulderHalf} ${shoulderY}`,
    'Z',
  ].join(' ');
}

function ChibiLegs({
  cx,
  hipY,
  hipHalf,
  feetY,
  build,
}: {
  cx: number;
  hipY: number;
  hipHalf: number;
  feetY: number;
  build: number;
}) {
  const gap = 6;
  const thighW = 14 * build;
  const calfW = 11 * build;
  const ankleY = feetY - 10;
  const kneeY = hipY + (ankleY - hipY) * 0.45;

  return (
    <>
      <path
        d={`M${cx - gap} ${hipY} Q${cx - thighW - 1} ${kneeY - 8} ${cx - thighW * 0.6} ${kneeY} Q${cx - calfW} ${kneeY + 16} ${cx - calfW * 0.7} ${ankleY} L${cx - 3} ${ankleY} L${cx - 3} ${hipY} Z`}
        fill="#fce0d0"
        stroke="#d9a880"
        strokeWidth={0.8}
      />
      <path
        d={`M${cx + gap} ${hipY} Q${cx + thighW + 1} ${kneeY - 8} ${cx + thighW * 0.6} ${kneeY} Q${cx + calfW} ${kneeY + 16} ${cx + calfW * 0.7} ${ankleY} L${cx + 3} ${ankleY} L${cx + 3} ${hipY} Z`}
        fill="#fce0d0"
        stroke="#d9a880"
        strokeWidth={0.8}
      />
      {/* feet */}
      <ellipse cx={cx - calfW * 0.5} cy={feetY - 4} rx={10} ry={5} fill="#d9a880" opacity={0.7} />
      <ellipse cx={cx + calfW * 0.5} cy={feetY - 4} rx={10} ry={5} fill="#d9a880" opacity={0.7} />
    </>
  );
}

function ChibiArm({
  cx,
  shoulderY,
  shoulderHalf,
  side,
  skin,
  stroke,
  scale,
}: {
  cx: number;
  shoulderY: number;
  shoulderHalf: number;
  side: 'left' | 'right';
  skin: string;
  stroke: string;
  scale: number;
}) {
  const dir = side === 'left' ? -1 : 1;
  const sx = cx + dir * shoulderHalf * 0.9;
  const elbowX = cx + dir * shoulderHalf * 1.1;
  const elbowY = shoulderY + 60 * scale;
  const handX = cx + dir * shoulderHalf * 0.95;
  const handY = shoulderY + 110 * scale;

  const armPath = `M${sx} ${shoulderY} Q${cx + dir * shoulderHalf * 1.15} ${shoulderY + 28} ${elbowX} ${elbowY} Q${cx + dir * shoulderHalf * 1.0} ${elbowY + 28} ${handX} ${handY}`;

  return (
    <>
      <path d={armPath} fill="none" stroke={skin} strokeWidth={12 * scale} strokeLinecap="round" />
      <path d={armPath} fill="none" stroke={stroke} strokeWidth={0.5} strokeLinecap="round" opacity={0.3} />
      <circle cx={handX} cy={handY} r={6 * scale} fill={skin} stroke={stroke} strokeWidth={0.5} />
    </>
  );
}

function ClothingOverlay({
  cx,
  shoulderY,
  hipY,
  feetY,
  shoulderHalf,
  category,
  image,
}: {
  cx: number;
  shoulderY: number;
  hipY: number;
  feetY: number;
  shoulderHalf: number;
  category: 'top' | 'bottom' | 'dress' | 'outerwear' | 'other';
  image: string;
}) {
  const w = shoulderHalf * 2.6;
  const x = cx - w / 2;

  if (category === 'dress') {
    return (
      <image href={image} x={x} y={shoulderY - 4} width={w} height={feetY - shoulderY} preserveAspectRatio="xMidYMid meet" opacity={0.95} />
    );
  }
  if (category === 'bottom') {
    return (
      <image href={image} x={x} y={hipY - 6} width={w} height={feetY - hipY + 8} preserveAspectRatio="xMidYMid meet" opacity={0.95} />
    );
  }
  return (
    <image href={image} x={x} y={shoulderY - 4} width={w} height={hipY - shoulderY + 12} preserveAspectRatio="xMidYMid meet" opacity={0.95} />
  );
}
