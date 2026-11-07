/** Món mẫu trong tủ đồ có id starter_{uid}_{key}; chỉ sống trên máy, không đồng bộ lên mây */
export const STARTER_ID_PREFIX = 'starter_';
export const isStarterId = (id: string) => id.startsWith(STARTER_ID_PREFIX);
