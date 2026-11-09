/**
 * Tủ đồ dùng chung với web: đọc/ghi collection wardrobeItems (lọc userId) theo thời gian thực.
 * Món thêm ở đây hiện ngay trong Tủ đồ của web và ngược lại. Chỉ hiển thị khi đã đồng bộ được.
 */
import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Plus, Shirt, Trash2, X } from 'lucide-react';
import { addWardrobeItem, deleteWardrobeItem, subscribeWardrobe } from '@/lib/firebase';
import { compressImageToDataUrl } from '@/lib/imageCompress';
import type { AppCategory, SyncedWardrobeItem } from '@/lib/webMapping';
import type { Occasion } from '@/lib/occasions';

const CATEGORY_OPTIONS: { value: AppCategory; label: string }[] = [
  { value: 'top', label: 'Áo' },
  { value: 'bottom', label: 'Quần / Chân váy' },
  { value: 'dress', label: 'Đầm & Váy liền' },
  { value: 'outerwear', label: 'Áo khoác' },
  { value: 'other', label: 'Phụ kiện' },
];

interface Props {
  uid: string;
  occasion: Occasion;
  favoriteStyles: unknown;
}

export default function SyncedWardrobePanel({ uid, occasion, favoriteStyles }: Props) {
  const [items, setItems] = useState<SyncedWardrobeItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<AppCategory>('top');
  const [color, setColor] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    const unsub = subscribeWardrobe(
      uid,
      (next) => {
        setItems(next);
        setLoadError(null);
      },
      () => setLoadError('Không tải được tủ đồ từ web. Kiểm tra mạng rồi tải lại trang.')
    );
    return () => unsub?.();
  }, [uid]);

  function resetForm() {
    setLabel('');
    setCategory('top');
    setColor('');
    setImageUrl(null);
    setFormError(null);
  }

  async function handlePickImage(file: File | undefined) {
    if (!file) return;
    setFormError(null);
    try {
      setImageUrl(await compressImageToDataUrl(file));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không đọc được ảnh.');
    }
  }

  async function handleAdd() {
    if (busy) return;
    if (!label.trim()) return setFormError('Nhập tên món đồ.');
    if (!imageUrl) return setFormError('Chọn ảnh món đồ.');
    setBusy(true);
    setFormError(null);
    try {
      await addWardrobeItem({ label, category, color, imageUrl, occasion, favoriteStyles });
      resetForm();
      setShowForm(false);
    } catch {
      setFormError('Không lưu được món đồ. Kiểm tra mạng rồi thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: SyncedWardrobeItem) {
    if (deletingId) return;
    if (!window.confirm(`Xoá "${item.label}" khỏi tủ đồ? Món này cũng biến mất trên web.`)) return;
    setDeletingId(item.id);
    try {
      await deleteWardrobeItem(item.id);
    } catch {
      setLoadError('Không xoá được món đồ. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-rose-100 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-rose-600">
          <Shirt className="h-5 w-5 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold">Tủ đồ đồng bộ với web</h2>
          {items && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {items.length} món
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            resetForm();
          }}
          className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-rose-500 cursor-pointer"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Đóng' : 'Thêm món đồ'}
        </button>
      </div>
      <p className="mt-1 text-xs sm:text-sm text-stone-500">
        Thêm hoặc xoá ở đây thì Tủ đồ trên web cũng đổi theo ngay, và ngược lại.
      </p>

      {showForm && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:grid-cols-[140px_1fr]">
          <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-stone-300 bg-white text-xs text-stone-500 hover:border-rose-300">
            {imageUrl ? (
              <img src={imageUrl} alt="Ảnh món đồ" className="h-full w-full object-contain" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span>Chọn ảnh</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handlePickImage(e.target.files?.[0])}
            />
          </label>
          <div className="grid gap-2.5">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              placeholder="Tên món đồ (vd: Áo sơ mi trắng)"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-base sm:text-sm outline-none focus:border-rose-400"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AppCategory)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-base sm:text-sm outline-none focus:border-rose-400"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                maxLength={50}
                placeholder="Màu (vd: Trắng)"
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-base sm:text-sm outline-none focus:border-rose-400"
              />
            </div>
            {formError && <p className="text-xs text-rose-600">{formError}</p>}
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 cursor-pointer"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu vào tủ đồ
            </button>
          </div>
        </div>
      )}

      {loadError && <p className="mt-3 text-sm text-rose-600">{loadError}</p>}

      {items === null && !loadError ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải tủ đồ…
        </div>
      ) : items && items.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">Tủ đồ trống. Thêm món đầu tiên ở đây hoặc trên web.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(items ?? []).map((item) => (
            <li key={item.id} className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="aspect-square bg-stone-50">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.label} loading="lazy" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-300">
                    <Shirt className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold text-stone-800">{item.label}</p>
                <p className="truncate text-xs text-stone-500">
                  {item.webCategory}
                  {item.color ? ` · ${item.color}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                disabled={deletingId === item.id}
                aria-label={`Xoá ${item.label}`}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-500 shadow-sm hover:bg-rose-500 hover:text-white cursor-pointer"
              >
                {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
