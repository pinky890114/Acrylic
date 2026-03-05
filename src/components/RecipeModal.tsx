import React, { useState, useEffect } from 'react';
import { SequinItem, Recipe, dbApi, RecipeItem, Category } from '../db';
import { cn, generateId } from '../lib/utils';
import { X, Upload, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingRecipe?: Recipe | null;
  inventoryItems: SequinItem[];
  categories: Category[];
}

export function RecipeModal({ isOpen, onClose, onSave, editingRecipe, inventoryItems, categories }: RecipeModalProps) {
  const [formData, setFormData] = useState<Partial<Recipe>>({
    name: '',
    items: [],
    notes: '',
    imageUrl: '',
  });
  const [itemCategories, setItemCategories] = useState<string[]>([]);

  useEffect(() => {
    if (editingRecipe) {
      setFormData(editingRecipe);
      const cats = editingRecipe.items.map(ri => {
        const item = inventoryItems.find(i => i.id === ri.itemId);
        return item?.category || categories[0]?.name || '';
      });
      setItemCategories(cats);
    } else {
      setFormData({
        name: '',
        items: [],
        notes: '',
        imageUrl: '',
      });
      setItemCategories([]);
    }
  }, [editingRecipe, isOpen, inventoryItems, categories]);

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

  const handleAddItem = () => {
    const defaultCategory = categories[0]?.name || '';
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { itemId: '', quantity: 1 }]
    }));
    setItemCategories(prev => [...prev, defaultCategory]);
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index)
    }));
    setItemCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (index: number, category: string) => {
    const newCategories = [...itemCategories];
    newCategories[index] = category;
    setItemCategories(newCategories);
    
    // Reset item selection when category changes
    handleItemChange(index, 'itemId', '');
  };

  const handleItemChange = (index: number, field: keyof RecipeItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipe: Recipe = {
      id: editingRecipe?.id || generateId(),
      name: formData.name || '未命名配方',
      items: formData.items || [],
      imageUrl: formData.imageUrl,
      notes: formData.notes || '',
      createdAt: editingRecipe?.createdAt || Date.now(),
    };

    await dbApi.addRecipe(recipe);
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingRecipe ? '編輯配方' : '新增配方'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Upload Section */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">成品圖片</label>
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
                    <span className="text-sm">點擊上傳成品圖</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">配方名稱</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  placeholder="例如：海洋風流麻"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">使用材料</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    新增材料
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {formData.items?.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <select
                        value={itemCategories[index] || ''}
                        onChange={e => handleCategoryChange(index, e.target.value)}
                        className="w-1/3 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      >
                        <option value="" disabled>分類</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      <select
                        value={item.itemId}
                        onChange={e => handleItemChange(index, 'itemId', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      >
                        <option value="" disabled>選擇材料</option>
                        {inventoryItems
                          .filter(invItem => invItem.category === itemCategories[index])
                          .map(invItem => (
                            <option key={invItem.id} value={invItem.id}>
                              {invItem.name} ({invItem.unit || '個'})
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        placeholder="數量"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.items?.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      還沒有加入任何材料
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  placeholder="製作心得、注意事項..."
                />
              </div>
            </div>
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
