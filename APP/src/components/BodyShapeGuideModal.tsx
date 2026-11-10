import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Shirt,
  Ruler,
  HelpCircle,
} from 'lucide-react';
import type { BodyType } from '@/lib/bodyAnalysis';

export interface BodyShapeGuideInfo {
  id: BodyType;
  name: string;
  englishName: string;
  genderTag: 'Nữ' | 'Nam' | 'Nam & Nữ';
  tagline: string;
  ratioSummary: string;
  characteristics: string[];
  corePrinciple: string;
  bestChoices: {
    tops: string[];
    bottoms: string[];
    dressesOrSuits: string[];
    accessories: string[];
  };
  avoidChoices: string[];
  proTips: string[];
}

export const BODY_SHAPE_GUIDE_DATA: Record<BodyType, BodyShapeGuideInfo> = {
  hourglass: {
    id: 'hourglass',
    name: 'Đồng Hồ Cát',
    englishName: 'Hourglass Shape',
    genderTag: 'Nữ',
    tagline: 'Vòng ngực và hông cân đối, thắt eo nhỏ rõ nét tạo đường cong S-line quyến rũ.',
    ratioSummary: 'Ngực ≈ Hông (chênh lệch < 5%) · Eo nhỏ hơn Ngực/Hông từ 22–28%',
    characteristics: [
      'Bờ vai và vòng hông có độ rộng tương đương, hài hòa tự nhiên.',
      'Vòng eo thon gọn, thắt rõ rệt tạo tỷ lệ vàng cổ điển.',
      'Đường cong cơ thể mềm mại từ ngực xuống eo và hông.',
    ],
    corePrinciple:
      'Tôn vinh điểm thắt eo tự nhiên và giữ sự cân bằng sẵn có giữa phần thân trên và thân dưới, tránh các phom dáng thùng thình che mất đường cong.',
    bestChoices: {
      tops: [
        'Áo cổ chữ V, cổ tim (Sweetheart), cổ vuông hoặc trễ vai Bardot giúp tôn xương quai xanh.',
        'Áo peplum, áo corset hoặc sơ mi chiết eo vừa vặn ôm nhẹ theo lồng ngực.',
      ],
      bottoms: [
        'Chân váy bút chì (Pencil Skirt) cạp cao hoặc chân váy chữ A mềm rủ.',
        'Quần tây ống suông cạp cao (High-waisted Tailored Trousers) hoặc quần jeans ống đứng.',
      ],
      dressesOrSuits: [
        'Đầm ôm Bodycon Midi, đầm quấn (Wrap Dress) hoặc đầm dạ hội đuôi cá / Slip Dress lụa cắt xéo.',
        'Đầm chữ A công chúa có đai nhấn ngay vòng eo nhỏ nhất.',
      ],
      accessories: [
        'Thắt lưng bản nhỏ đến vừa đặt đúng vị trí eo tự nhiên.',
        'Túi xách đeo vai hoặc cầm tay kích thước vừa phải ngang hông.',
      ],
    },
    avoidChoices: [
      'Áo hoặc đầm phom suông rộng thùng thình (Boxy/Oversized quá mức) làm mất điểm thắt eo.',
      'Quần cạp trễ kết hợp áo quá dài gây cảm giác lưng dài, chân ngắn.',
      'Chi tiết bèo nhún quá dày ở cả ngực lẫn hông cùng lúc.',
    ],
    proTips: [
      'Chất liệu lụa satin, dệt kim ôm nhẹ (ribbed knit) hoặc vải có độ co giãn tốt sẽ ôm trọn đường cong mà không tạo nếp gấp thừa.',
      'Luôn ưu tiên quy tắc sơ vin (tuck-in) hoặc chọn áo dáng lửng vừa chạm cạp quần cao.',
    ],
  },
  pear: {
    id: 'pear',
    name: 'Quả Lê',
    englishName: 'Pear / Triangle Shape',
    genderTag: 'Nữ',
    tagline: 'Phần vai và ngực nhỏ nhắn, eo thon gọn, phần hông và đùi đầy đặn quyến rũ.',
    ratioSummary: 'Hông lớn hơn Ngực > 5% · Eo thon gọn rõ nét so với vòng hông',
    characteristics: [
      'Khung vai và vòng ngực thanh mảnh, nhỏ hơn so với vòng hông.',
      'Vòng eo thon đẹp, tạo độลาด mềm mại xuống hông.',
      'Trọng tâm cơ thể tập trung ở phần hông và đùi trên.',
    ],
    corePrinciple:
      'Thu hút ánh nhìn lên phần thân trên (vai, cổ, ngực) bằng điểm nhấn cấu trúc hoặc màu sắc sáng, đồng thời làm mềm và kéo dài phần hông - chân bằng phom chữ A hoặc ống suông tối màu.',
    bestChoices: {
      tops: [
        'Áo trễ vai (Off-shoulder), áo tay phồng (Puff Blouse), cổ thuyền hoặc cổ vuông giúp mở rộng bờ vai.',
        'Áo sơ mi cổ nơ lụa (Silk Bow Blouse) hoặc áo cardigan sáng màu / họa tiết nổi bật.',
      ],
      bottoms: [
        'Chân váy chữ A (A-line Skirt) hoặc chân váy xếp ly dáng dài (Pleated Maxi Skirt) lướt nhẹ qua hông.',
        'Quần ống rộng (Wide-leg Tailored Trousers) cạp cao màu trung tính hoặc trầm (đen, navy, шоколад).',
      ],
      dressesOrSuits: [
        'Đầm công chúa chữ A (A-line Princess Dress) hoặc đầm trễ vai Couture xòe nhẹ từ eo.',
        'Đầm dạ hội xếp ly (Pleated Gala Gown) nhấn ngực và rủ tự nhiên xuống mắt cá chân.',
      ],
      accessories: [
        'Khuyên tai bản nổi bật, dây chuyền ngắn hoặc kính mát gọng mèo thu hút sự chú ý lên khuôn mặt.',
        'Giày cao gót mũi nhọn hoặc sandal quai mảnh giúp kéo dài đôi chân.',
      ],
    },
    avoidChoices: [
      'Quần túi hộp (Cargo) có túi to ngay phần đùi ngoài hoặc quần skinny quá bó màu sáng.',
      'Chân váy quá bó sát hông kèm họa tiết ngang bản lớn ở phần dưới.',
      'Áo quá ôm tối màu kết hợp quần trắng/sáng màu làm lệch tỷ lệ trên - dưới.',
    ],
    proTips: [
      'Áp dụng công thức phối màu: Sáng/Nổi bật ở thân trên + Trầm/Đơn sắc ở thân dưới để cân bằng thị giác 100% như dáng đồng hồ cát.',
      'Áo khoác Blazer độn vai nhẹ dài qua hông hoặc lửng ngang eo đều cực kỳ tôn dáng Quả Lê.',
    ],
  },
  'inverted-triangle': {
    id: 'inverted-triangle',
    name: 'Tam Giác Ngược',
    englishName: 'Inverted Triangle Shape',
    genderTag: 'Nữ',
    tagline: 'Bờ vai rộng hoặc vòng ngực đầy đặn năng động, phần eo và hông gọn gàng thanh thoát.',
    ratioSummary: 'Ngực / Vai lớn hơn Hông > 5% · Đôi chân thon dài nổi bật',
    characteristics: [
      'Khung vai ngang khỏe khoắn hoặc vòng ngực lớn hơn rõ rệt so với vòng hông.',
      'Phần hông tương đối thẳng và gọn, đôi chân thường thon dài.',
      'Tạo ấn tượng hiện đại, năng động và rất hợp phong cách High-Fashion.',
    ],
    corePrinciple:
      'Làm mềm đường nét bờ vai bằng cổ áo chữ V hoặc cổ yếm dọc, đồng thời tạo thêm độ phồng và đường cong cho phần hông bằng chân váy xòe, xếp ly hoặc quần ống rộng.',
    bestChoices: {
      tops: [
        'Áo cổ chữ V sâu vừa phải, áo cổ yếm (Halter) hoặc áo hai dây lụa (Silk Camisole) giúp thu gọn chiều ngang vai.',
        'Áo Peplum chiết eo xòe nhẹ ở phần hông tạo hiệu ứng đường cong.',
      ],
      bottoms: [
        'Chân váy chữ A xòe, chân váy xếp ly Maxi hoặc quần túi hộp (Cargo Pants) tạo độ đầy đặn cho hông.',
        'Quần ống rộng xếp ly trước hoặc quần shorts denim cạp cao khoe đôi chân thon.',
      ],
      dressesOrSuits: [
        'Đầm lụa hai dây (Silk Slip Dress) hoặc đầm chữ A xòe nhẹ ở phần tà dưới.',
        'Đầm Corset cúp ngực kết hợp tùng váy chữ A tạo tỷ lệ cân xứng.',
      ],
      accessories: [
        'Túi xách đeo chéo hoặc cầm tay ngang tầm hông để tăng điểm nhấn cho phần dưới.',
        'Tránh khăn choàng quá dày ở cổ; ưu tiên dây chuyền dáng dài chữ Y.',
      ],
    },
    avoidChoices: [
      'Áo độn vai quá dày, áo tay bồng lớn hoặc cổ thuyền ngang rộng.',
      'Hoa văn to bản hoặc kẻ ngang tập trung ở vùng vai và ngực.',
      'Quần legging siêu bó kết hợp áo khoác vai rộng làm phần dưới trông quá nhỏ.',
    ],
    proTips: [
      'Đảo ngược quy tắc màu sắc: Chọn áo màu trung tính/trầm dịu và chân váy/quần màu sáng hoặc có họa tiết, xếp ly để cân bằng khung xương.',
      'Những thiết kế bất đối xứng (one-shoulder) hoặc dây mảnh chéo vai giúp bờ vai trông thanh thoát tức thì.',
    ],
  },
  rectangle: {
    id: 'rectangle',
    name: 'Chữ Nhật (Cân Đối)',
    englishName: 'Rectangle / Athletic Shape',
    genderTag: 'Nữ',
    tagline: 'Số đo vai, ngực, eo và hông thẳng hàng cân đối, mang vẻ đẹp thanh lịch chuẩn người mẫu.',
    ratioSummary: 'Ngực ≈ Hông · Độ chênh lệch giữa Eo và Ngực/Hông < 22%',
    characteristics: [
      'Tỷ lệ ngực, eo và hông khá đồng đều, ít độ thắt gắt ở vòng hai.',
      'Khung xương thanh mảnh hoặc săn chắc kiểu người mẫu (Modelesque / Athletic).',
      'Dễ dàng biến hóa đa dạng phong cách từ tối giản đến cấu trúc 3D.',
    ],
    corePrinciple:
      'Tạo hiệu ứng thị giác vòng eo thon gọn hơn bằng chi tiết chiết eo, cut-out hoặc thắt lưng, đồng thời tăng độ phồng nhẹ ở ngực và hông để kiến tạo đường cong S-line.',
    bestChoices: {
      tops: [
        'Áo Peplum nhấn eo, áo Corset định hình, hoặc áo tay phồng (Puff Blouse) cổ vuông.',
        'Áo Baby Tee dáng lửng hoặc áo trễ vai dệt kim tạo điểm nhấn ngang ngực.',
      ],
      bottoms: [
        'Chân váy chữ A xếp tầng/gợn sóng, chân váy xếp ly hoặc quần Cargo có túi hộp.',
        'Quần tây ống rộng xếp ly cạp cao kết hợp thắt lưng da.',
      ],
      dressesOrSuits: [
        'Đầm Corset Bustier hoặc đầm công chúa chữ A chiết eo cao.',
        'Đầm dạ hội xếp ly có đai eo tương phản màu sắc.',
      ],
      accessories: [
        'Thắt lưng bản vừa hoặc corset belt là vũ khí bí mật giúp phân tách tỷ lệ 1/3 - 2/3.',
        'Túi xách phom mềm hoặc túi yên ngựa (Saddle Bag) tạo đường cong bên hông.',
      ],
    },
    avoidChoices: [
      'Đầm suông thẳng đuột từ vai xuống gối không có bất kỳ điểm nhấn eo nào.',
      'Bộ đồ quá vuông vức (Boxy) cả trên lẫn dưới khiến cơ thể trông cứng nhắc.',
    ],
    proTips: [
      'Phối đồ nhiều lớp (Layering) như áo Cardigan lửng khoác ngoài đầm Slip Dress hoặc áo khoác Trench Coat thắt đai sẽ tạo chiều sâu 3D cực kỳ cuốn hút.',
      'Sử dụng họa tiết kẻ sọc chéo hoặc phối hai mảng màu khác nhau giữa áo và váy để tự động tạo điểm thắt eo.',
    ],
  },
  ectomorph: {
    id: 'ectomorph',
    name: 'Mảnh Khảnh (Ectomorph)',
    englishName: 'Slender / Ectomorph Build',
    genderTag: 'Nam',
    tagline: 'Khung xương thanh mảnh, vai và lồng ngực gọn, chiều cao nổi bật.',
    ratioSummary: 'BMI < 19.5 · Khung xương thon dài, ít mỡ thừa',
    characteristics: [
      'Cơ thể thon gọn, tay chân dài thanh thoát.',
      'Khung vai và ngực vừa phải, mang nét thư sinh, lãng tử Hàn Quốc.',
      'Rất hợp với kỹ thuật phối đồ nhiều lớp (Layering) và chất liệu đứng phom.',
    ],
    corePrinciple:
      'Tăng độ dày và bề ngang cho khung vai - ngực bằng chất liệu có cấu trúc (Oxford, Denim, Len dệt kim, Dạ) và kỹ thuật phối nhiều lớp (Layering).',
    bestChoices: {
      tops: [
        'Áo sơ mi Oxford dày dặn, áo Polo dệt kim (Knit Polo) hoặc áo len cổ lọ phối cùng Blazer.',
        'Áo Hoodie Streetwear hoặc Sweater có độ phồng tự nhiên.',
      ],
      bottoms: [
        'Quần tây ống đứng (Tailored Dress Trousers), quần Chinos hoặc quần Jeans ống suông vừa (Regular Fit).',
        'Quần Cargo túi hộp giúp phần chân trông đầy đặn, khỏe khoắn hơn.',
      ],
      dressesOrSuits: [
        'Áo khoác Blazer hai hàng khuy, Bomber Jacket hoặc Trench Coat có đệm vai nhẹ.',
        'Combo Sơ mi + Áo len / Áo khoác ngoài tạo hiệu ứng khung ngực vạm vỡ.',
      ],
      accessories: [
        'Đồng hồ mặt vừa (38–40mm), kính mát Aviator hoặc Wayfarer.',
        'Giày Sneaker đế dày vừa phải hoặc Chelsea Boots cổ cao.',
      ],
    },
    avoidChoices: [
      'Áo ba lỗ hoặc áo thun siêu bó sát (Skinny fit) chất liệu quá mỏng.',
      'Quần skinny jeans bó chặt làm lộ đôi chân quá gầy.',
      'Kẻ sọc dọc quá mảnh từ đầu đến chân.',
    ],
    proTips: [
      'Ưu tiên gam màu sáng (trắng kem, be, xanh pastel, xám sáng) và họa tiết kẻ ngang / caro (Plaid Check) để mở rộng khung cơ thể.',
      'Luôn chọn phom Regular Fit thay vì Slim Fit quá bó.',
    ],
  },
  mesomorph: {
    id: 'mesomorph',
    name: 'Cân Đối / Thể Thao (Mesomorph)',
    englishName: 'Athletic / Mesomorph Build',
    genderTag: 'Nam',
    tagline: 'Vai rộng, ngực nở, eo gọn tạo tỷ lệ chữ V nam tính chuẩn mực.',
    ratioSummary: 'BMI 19.5 – 24.5 · Khung vai chữ V cân đối, săn chắc',
    characteristics: [
      'Tỷ lệ vai rộng hơn eo rõ rệt, cơ ngực và cánh tay săn chắc.',
      'Khung cơ thể cân đối, mặc đẹp hầu hết các phom dáng từ Suit lịch lãm đến Streetwear.',
      'Dáng đứng thẳng, toát lên vẻ năng động và lịch thiệp.',
    ],
    corePrinciple:
      'Tôn lên tỷ lệ chữ V tự nhiên bằng các thiết kế vừa vặn (Tailored / Slim-Regular Fit) mà không cần quá bó sát hay quá rộng.',
    bestChoices: {
      tops: [
        'Áo Polo dệt kim, sơ mi Oxford mở cúc cổ hoặc áo thun cổ tròn vừa vặn.',
        'Áo len cổ lọ (Turtleneck Knit) tôn trọn phần ngực và vai.',
      ],
      bottoms: [
        'Quần âu ống đứng có ly trước, quần Chinos xắn gấu hoặc quần Shorts Tailored.',
        'Quần Jogger thể thao hoặc Jeans phom đứng.',
      ],
      dressesOrSuits: [
        'Áo khoác Blazer may đo, áo khoác da Biker hoặc Bomber Jacket.',
        'Áo मăng-tô (Trench Coat) khoác ngoài sơ mi / cổ lọ.',
      ],
      accessories: [
        'Đồng hồ Chronograph thể thao hoặc Dress Watch dây kim loại.',
        'Giày Oxford da, Loafer hoặc Sneaker trắng tối giản.',
      ],
    },
    avoidChoices: [
      'Trang phục quá rộng thùng thình che khuất hoàn toàn phom vai chữ V.',
      'Áo quá chật ở phần nách và bắp tay gây cảm giác bức bối.',
    ],
    proTips: [
      'Sự tối giản (Minimalism) và chất liệu cao cấp (Lụa pha, Cotton Pima, Len Merino) là chìa khóa giúp dáng Mesomorph tỏa sáng nhất.',
      'Kết hợp đồng hồ cổ tay và kính mát cùng tông kim loại với khóa thắt lưng/giày.',
    ],
  },
  endomorph: {
    id: 'endomorph',
    name: 'Đầy Đặn / Vững Chãi (Endomorph)',
    englishName: 'Solid / Endomorph Build',
    genderTag: 'Nam',
    tagline: 'Khung người bề thế, vững chãi và mạnh mẽ.',
    ratioSummary: 'BMI > 24.5 · Khung ngực, vai và eo đầy đặn',
    characteristics: [
      'Khung xương lớn, phần ngực, vai và vòng hai đầy đặn.',
      'Tạo cảm giác chững chạc, quyền lực và đáng tin cậy.',
      'Phù hợp với các đường cắt dọc sắc nét và chất liệu rủ đứng phom.',
    ],
    corePrinciple:
      'Tạo các đường dẫn thị giác theo chiều dọc (Vertical Lines) bằng áo khoác mở khuy, cổ chữ V/mở cúc và tông màu trầm đồng nhất để kéo dài cơ thể và làm gọn vòng hai.',
    bestChoices: {
      tops: [
        'Áo sơ mi tối màu hoặc kẻ sọc dọc nhỏ, áo Polo cổ chữ V không cài khuy trên cùng.',
        'Áo thun/len phom Regular vừa vặn, độ dài vừa qua thắt lưng.',
      ],
      bottoms: [
        'Quần tây ống suông thẳng (Straight Tailored Trousers) cạp vừa đặt đúng hông.',
        'Quần Chinos hoặc Jeans tối màu (Indigo đậm, Than chì, Đen) không mài rách.',
      ],
      dressesOrSuits: [
        'Áo khoác Blazer một hàng khuy hoặc Trench Coat mặc mở khuy tạo hai đường thẳng dọc thu gọn vòng bụng.',
        'Áo khoác Bomber tối giản ít chi tiết túi phồng ở bụng.',
      ],
      accessories: [
        'Đồng hồ mặt 42mm mạnh mẽ, kính mát gọng vuông (Oversized Square) cân đối khuôn mặt.',
        'Giày Дерби/Oxford hoặc Chelsea Boots có đế vững chãi.',
      ],
    },
    avoidChoices: [
      'Áo kẻ ngang bản to, vải bóng (satin quá bóng) hoặc len vặn thừng quá dày ở vùng bụng.',
      'Quần quá bó ở bắp chân hoặc quần tụt dưới bụng.',
    ],
    proTips: [
      'Phối đồ Monochromatic (cùng tông màu trầm như Navy, Charcoal, Đen, Nâu Espresso) từ áo xuống quần giúp cơ thể trông cao và thon gọn hơn ngay lập tức.',
      'Một chiếc Blazer hoặc áo khoác mỏng mặc không cài nút sẽ cắt đôi chiều ngang cơ thể cực kỳ hiệu quả.',
    ],
  },
};

export function mapStudioShapeNameToBodyType(
  shapeName: string,
  gender: 'male' | 'female' = 'female'
): BodyType {
  const lower = shapeName.toLowerCase();
  if (lower.includes('đồng hồ cát') || lower.includes('hourglass')) {
    return 'hourglass';
  }
  if (lower.includes('quả lê') || lower.includes('pear')) {
    return 'pear';
  }
  if (lower.includes('tam giác ngược') || lower.includes('inverted')) {
    return gender === 'male' ? 'mesomorph' : 'inverted-triangle';
  }
  if (lower.includes('ectomorph') || lower.includes('mảnh khảnh')) {
    return 'ectomorph';
  }
  if (lower.includes('mesomorph') || lower.includes('thể thao')) {
    return 'mesomorph';
  }
  if (lower.includes('endomorph') || lower.includes('đầy đặn')) {
    return 'endomorph';
  }
  return gender === 'male' ? 'mesomorph' : 'rectangle';
}

interface BodyShapeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBodyType: BodyType;
  userGender?: 'male' | 'female';
  userMeasurements?: {
    heightCm?: number;
    weightKg?: number;
    waistCm?: number | null;
    hipCm?: number | null;
    bustCm?: number | null;
    bmi?: number;
  };
}

export const BodyShapeGuideModal: React.FC<BodyShapeGuideModalProps> = ({
  isOpen,
  onClose,
  userBodyType,
  userGender = 'female',
  userMeasurements,
}) => {
  const [selectedType, setSelectedType] = useState<BodyType>(userBodyType);

  useEffect(() => {
    if (isOpen) {
      setSelectedType(userBodyType);
    }
  }, [isOpen, userBodyType]);

  if (!isOpen) return null;

  const femaleTypes: BodyType[] = [
    'hourglass',
    'pear',
    'inverted-triangle',
    'rectangle',
  ];
  const maleTypes: BodyType[] = ['ectomorph', 'mesomorph', 'endomorph'];
  const orderedTypes: BodyType[] =
    userGender === 'male'
      ? [...maleTypes, ...femaleTypes]
      : [...femaleTypes, ...maleTypes];

  const activeInfo =
    BODY_SHAPE_GUIDE_DATA[selectedType] || BODY_SHAPE_GUIDE_DATA.hourglass;
  const isUserCurrentShape = selectedType === userBodyType;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-rose-100 bg-gradient-to-r from-rose-50 via-white to-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Cẩm Nang Dáng Người &amp; Bí Quyết Phối Đồ
                </h2>
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                  Body Shape Guide
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Phân tích chuyên sâu tỷ lệ cơ thể và gợi ý phom dáng trang phục tối ưu nhất cho bạn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
            aria-label="Đóng cẩm nang dáng người"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shape Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-5 py-2.5 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Chọn dáng:
          </span>
          {orderedTypes.map((typeKey) => {
            const info = BODY_SHAPE_GUIDE_DATA[typeKey];
            const isSelected = selectedType === typeKey;
            const isMine = userBodyType === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setSelectedType(typeKey)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-xs'
                    : isMine
                    ? 'border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-600'
                }`}
              >
                <span>{info.name}</span>
                {isMine && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                      isSelected
                        ? 'bg-white text-rose-600'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    Dáng của bạn
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Top Hero Card: Visual Silhouette + Overview */}
          <div className="grid gap-5 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 p-4 sm:p-5 md:grid-cols-[200px_1fr]">
            {/* Visual Silhouette Diagram */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white p-4 shadow-2xs">
              <BodyShapeSvgDiagram bodyType={selectedType} />
              <span className="mt-2 text-[11px] font-bold text-slate-700">
                {activeInfo.englishName}
              </span>
              <span className="mt-0.5 text-[10px] text-slate-400">
                Nhóm: {activeInfo.genderTag}
              </span>
            </div>

            {/* Summary & User Measurements */}
            <div className="flex flex-col justify-between space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    Dáng {activeInfo.name}
                  </h3>
                  {isUserCurrentShape && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      Kết quả phân tích của bạn
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  {activeInfo.tagline}
                </p>

                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/90 border border-rose-200/80 px-3 py-1.5 text-xs font-semibold text-rose-700">
                  <Ruler className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span>Tỷ lệ đặc trưng: {activeInfo.ratioSummary}</span>
                </div>
              </div>

              {isUserCurrentShape && userMeasurements && (
                <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Số đo hiện tại của bạn
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {userMeasurements.heightCm && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                        Cao: {userMeasurements.heightCm} cm
                      </span>
                    )}
                    {userMeasurements.weightKg && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                        Nặng: {userMeasurements.weightKg} kg
                      </span>
                    )}
                    {userMeasurements.bmi && (
                      <span className="rounded-lg bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
                        BMI: {userMeasurements.bmi}
                      </span>
                    )}
                    {userMeasurements.bustCm && (
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                        Ngực: {userMeasurements.bustCm} cm
                      </span>
                    )}
                    {userMeasurements.waistCm && (
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                        Eo: {userMeasurements.waistCm} cm
                      </span>
                    )}
                    {userMeasurements.hipCm && (
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                        Hông: {userMeasurements.hipCm} cm
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Characteristics */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-700">
                  Đặc điểm nhận diện:
                </div>
                <ul className="grid gap-1.5 sm:grid-cols-1">
                  {activeInfo.characteristics.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Core Principle Banner */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Nguyên tắc vàng khi phối đồ cho dáng {activeInfo.name}</span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-slate-800 leading-relaxed">
              {activeInfo.corePrinciple}
            </p>
          </div>

          {/* Best Silhouettes Grid */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Trang phục tôn dáng nên chọn (Best Silhouettes)</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <GuideCategoryCard
                title="Áo & Kiểu Cổ Áo (Tops & Necklines)"
                items={activeInfo.bestChoices.tops}
                accent="emerald"
              />
              <GuideCategoryCard
                title="Quần & Chân Váy (Bottoms & Skirts)"
                items={activeInfo.bestChoices.bottoms}
                accent="emerald"
              />
              <GuideCategoryCard
                title={
                  activeInfo.genderTag === 'Nam'
                    ? 'Áo Khoác & Suit (Outerwear & Tailoring)'
                    : 'Đầm Liền & Váy Dạ Hội (Dresses)'
                }
                items={activeInfo.bestChoices.dressesOrSuits}
                accent="emerald"
              />
              <GuideCategoryCard
                title="Phụ Kiện & Giày (Accessories & Footwear)"
                items={activeInfo.bestChoices.accessories}
                accent="emerald"
              />
            </div>
          </div>

          {/* Avoid + Pro Tips */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span>Kiểu trang phục nên hạn chế</span>
              </div>
              <ul className="mt-2.5 space-y-2">
                {activeInfo.avoidChoices.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed"
                  >
                    <span className="mt-0.5 font-bold text-rose-500">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span>Mẹo phối đồ từ Stylist chuyên nghiệp</span>
              </div>
              <ul className="mt-2.5 space-y-2">
                {activeInfo.proTips.map((tip, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed"
                  >
                    <span className="mt-0.5 font-bold text-amber-600">★</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shirt className="h-4 w-4 text-rose-500" />
            <span>
              Mẹo: Bạn có thể thử trực tiếp các kiểu đầm, chân váy và áo trên Ma-nơ-canh 3D.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

function GuideCategoryCard({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: 'emerald' | 'rose';
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
      <div className="text-xs font-bold text-slate-800 mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"
          >
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                accent === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BodyShapeSvgDiagram({ bodyType }: { bodyType: BodyType }) {
  // Custom anatomical proportion diagram for each body shape
  const getContourPath = () => {
    switch (bodyType) {
      case 'hourglass':
        return {
          path: 'M 32 30 Q 60 26 88 30 C 92 48 74 58 73 72 C 72 86 94 98 92 122 L 28 122 C 26 98 48 86 47 72 C 46 58 28 48 32 30 Z',
          shoulderW: 56,
          waistW: 26,
          hipW: 62,
        };
      case 'pear':
        return {
          path: 'M 40 30 Q 60 27 80 30 C 82 46 72 58 72 72 C 72 86 96 100 94 122 L 26 122 C 24 100 48 86 48 72 C 48 58 38 46 40 30 Z',
          shoulderW: 40,
          waistW: 26,
          hipW: 66,
        };
      case 'inverted-triangle':
        return {
          path: 'M 26 30 Q 60 25 94 30 C 94 48 76 60 75 74 C 74 88 82 102 80 122 L 40 122 C 38 102 46 88 45 74 C 44 60 26 48 26 30 Z',
          shoulderW: 68,
          waistW: 30,
          hipW: 42,
        };
      case 'rectangle':
        return {
          path: 'M 36 30 Q 60 27 84 30 C 85 48 79 60 79 74 C 79 88 85 102 84 122 L 36 122 C 35 102 41 88 41 74 C 41 60 35 48 36 30 Z',
          shoulderW: 48,
          waistW: 38,
          hipW: 48,
        };
      case 'ectomorph':
        return {
          path: 'M 38 28 Q 60 25 82 28 L 78 74 L 80 122 L 40 122 L 42 74 Z',
          shoulderW: 44,
          waistW: 36,
          hipW: 40,
        };
      case 'mesomorph':
        return {
          path: 'M 26 28 Q 60 24 94 28 L 76 76 L 80 122 L 40 122 L 44 76 Z',
          shoulderW: 68,
          waistW: 32,
          hipW: 42,
        };
      case 'endomorph':
      default:
        return {
          path: 'M 32 28 Q 60 25 88 28 C 94 52 94 82 88 122 L 32 122 C 26 82 26 52 32 28 Z',
          shoulderW: 56,
          waistW: 60,
          hipW: 56,
        };
    }
  };

  const { path, shoulderW, waistW, hipW } = getContourPath();

  return (
    <svg width="110" height="136" viewBox="0 0 120 140" className="overflow-visible">
      <defs>
        <linearGradient id="bodyShapeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#fda4af" stopOpacity="0.30" />
        </linearGradient>
      </defs>
      {/* Head */}
      <circle cx="60" cy="14" r="9" fill="#fda4af" stroke="#e11d48" strokeWidth="1.5" />
      {/* Torso & Hip Silhouette */}
      <path
        d={path}
        fill="url(#bodyShapeGrad)"
        stroke="#e11d48"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Shoulder Guide Line */}
      <line
        x1={60 - shoulderW / 2}
        y1="34"
        x2={60 + shoulderW / 2}
        y2="34"
        stroke="#0f172a"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      {/* Waist Guide Line */}
      <line
        x1={60 - waistW / 2}
        y1="72"
        x2={60 + waistW / 2}
        y2="72"
        stroke="#e11d48"
        strokeWidth="2"
      />
      {/* Hip Guide Line */}
      <line
        x1={60 - hipW / 2}
        y1="104"
        x2={60 + hipW / 2}
        y2="104"
        stroke="#0f172a"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
    </svg>
  );
}

export default BodyShapeGuideModal;
