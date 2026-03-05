import React, { useState, useEffect } from 'react';
import { SequinItem, Category, dbApi, StockStatus } from '../db';
import { cn, generateId } from '../lib/utils';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

const PREDEFINED_COLORS = [
  '紅色', '橘色', '黃色', '綠色', '深綠', 
  '淺藍', '深藍', '紫色', '金色', '銀色', '咖啡色', '白色', '黑色'
];

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingItem?: SequinItem | null;
  categories: Category[];
}

interface ItemFormData extends Omit<Partial<SequinItem>, 'quantity' | 'price'> {
  quantity: number | string;
  price: number | string;
}

export function ItemModal({ isOpen, onClose, onSave, editingItem, categories }: ItemModalProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    category: '',
    quantity: '',
    unit: '個',
    price: '',
    status: '充足',
    color: '',
    notes: '',
    imageUrl: '',
  });

  const [customColor, setCustomColor] = useState('');
  const [isCustomColor, setIsCustomColor] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        ...editingItem,
        quantity: editingItem.quantity,
        price: editingItem.price ?? ''
      });
      if (editingItem.color && !PREDEFINED_COLORS.includes(editingItem.color)) {
        setIsCustomColor(true);
        setCustomColor(editingItem.color);
      } else {
        setIsCustomColor(false);
        setCustomColor('');
      }
    } else {
      setFormData({
        name: '',
        category: categories[0]?.name || '',
        quantity: '',
        unit: '個',
        price: '',
        status: '充足',
        color: '',
        notes: '',
        imageUrl: '',
      });
      setIsCustomColor(false);
      setCustomColor('');
    }
  }, [editingItem, categories, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: SequinItem = {
      id: editingItem?.id || generateId(),
      name: formData.name || '未命名',
      category: formData.category || categories[0]?.name || '未分類',
      imageUrl: formData.imageUrl,
      quantity: Number(formData.quantity) || 0,
      unit: formData.unit || '個',
      price: Number(formData.price) || 0,
      status: formData.status || '充足',
      color: isCustomColor ? customColor : formData.color,
      notes: formData.notes || '',
      createdAt: editingItem?.createdAt || Date.now(),
    };

    await dbApi.addItem(item);
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingItem ? '編輯亮片' : '新增亮片'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Upload Section */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">圖片</label>
              <div className="relative group aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-teal-500 transition-colors cursor-pointer">
                {formData.imageUrl ? (
                  <>
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white font-medium">更換圖片</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span className="text-sm">點擊上傳圖片</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>
            </div>

            {/* Fields Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名稱</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  placeholder="例如：藍色星星"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">顏色</label>
                <div className="flex gap-2">
                  <select
                    value={isCustomColor ? 'custom' : formData.color || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setIsCustomColor(true);
                        setFormData({ ...formData, color: '' });
                      } else {
                        setIsCustomColor(false);
                        setFormData({ ...formData, color: val });
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  >
                    <option value="">無顏色</option>
                    {PREDEFINED_COLORS.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                    <option value="custom">自訂顏色...</option>
                  </select>
                  {isCustomColor && (
                    <input
                      type="text"
                      value={customColor}
                      onChange={e => setCustomColor(e.target.value)}
                      placeholder="輸入顏色名稱"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">數量</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    />
                    <select
                      value={formData.unit || '個'}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white"
                    >
                      <option value="個">個</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="包">包</option>
                      <option value="盒">盒</option>
                      <option value="罐">罐</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">庫存狀態</label>
                  <select
                    value={formData.status || '充足'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as StockStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  >
                    <option value="充足">充足</option>
                    <option value="需補貨">需補貨</option>
                    <option value="用完了">用完了</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">價格 (TWD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              placeholder="購買來源、用途..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm"
            >
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
