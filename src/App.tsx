import React, { useState, useEffect, useMemo } from 'react';
import { SequinItem, Category, dbApi, Recipe } from './db';
import { localDb } from './localDb';
import { ItemModal } from './components/ItemModal';
import { SettingsModal } from './components/SettingsModal';
import { RecipeModal } from './components/RecipeModal';
import { 
  Search, 
  Plus, 
  Filter, 
  LayoutGrid, 
  List, 
  Settings, 
  Trash2, 
  Edit2,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BookOpen,
  ChefHat,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn, formatCurrency, getStatusColor } from './lib/utils';
import { format } from 'date-fns';

function App() {
  const [items, setItems] = useState<SequinItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentTab, setCurrentTab] = useState<'inventory' | 'recipes'>('inventory');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SequinItem | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'item' | 'recipe';
    id: string;
    name: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedItems, fetchedCategories, fetchedRecipes] = await Promise.all([
        dbApi.getAllItems(),
        dbApi.getAllCategories(),
        dbApi.getAllRecipes()
      ]);

      // Check for server data loss (Server empty but Local has data)
      const localItems = await localDb.getAllItems();
      const localCategories = await localDb.getAllCategories();
      const localRecipes = await localDb.getAllRecipes();

      if (fetchedItems.length === 0 && localItems.length > 0) {
        console.log('Detecting server data reset. Restoring from local backup...');
        
        // Restore Categories first
        if (localCategories.length > 0) {
          await dbApi.addCategories(localCategories);
          setCategories(localCategories);
        } else {
          setCategories(fetchedCategories);
        }

        // Restore Items
        if (localItems.length > 0) {
          await dbApi.addItems(localItems);
          setItems(localItems);
        } else {
          setItems(fetchedItems);
        }

        // Restore Recipes
        if (localRecipes.length > 0) {
          await dbApi.addRecipes(localRecipes);
          setRecipes(localRecipes);
        } else {
          setRecipes(fetchedRecipes);
        }

        // Show a non-blocking notification or just log it
        // We can use the error state temporarily to inform the user, but it might be alarming.
        // Better to just let it happen silently or add a toast system later.
        // For now, let's just set the state.
      } else {
        setItems(fetchedItems);
        setCategories(fetchedCategories);
        setRecipes(fetchedRecipes);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('無法載入資料，請檢查網路連線或稍後再試。');
      
      // Try to load from local DB as fallback
      try {
        const localItems = await localDb.getAllItems();
        const localCategories = await localDb.getAllCategories();
        const localRecipes = await localDb.getAllRecipes();
        
        if (localItems.length > 0 || localCategories.length > 0) {
          setItems(localItems);
          setCategories(localCategories);
          setRecipes(localRecipes);
          setError('無法連線至伺服器，目前顯示本機備份資料。');
        }
      } catch (localError) {
        console.error('Local fallback failed:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteItem = (item: SequinItem) => {
    setDeleteConfirmation({
      type: 'item',
      id: item.id,
      name: item.name
    });
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setDeleteConfirmation({
      type: 'recipe',
      id: recipe.id,
      name: recipe.name
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.type === 'item') {
      await dbApi.deleteItem(deleteConfirmation.id);
    } else {
      await dbApi.deleteRecipe(deleteConfirmation.id);
    }
    
    setDeleteConfirmation(null);
    fetchData();
  };

  const handleEditItem = async (item: SequinItem) => {
    try {
      // If the item has an image but no URL (because we stripped it in list view), fetch full details
      if (item.hasImage && !item.imageUrl) {
        const fullItem = await dbApi.getItem(item.id);
        setEditingItem(fullItem);
      } else {
        setEditingItem(item);
      }
      setIsItemModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch item details:', error);
      // Fallback to existing item data if fetch fails
      setEditingItem(item);
      setIsItemModalOpen(true);
    }
  };

  const handleEditRecipe = async (recipe: Recipe) => {
    try {
      if (recipe.hasImage && !recipe.imageUrl) {
        const fullRecipe = await dbApi.getRecipe(recipe.id);
        setEditingRecipe(fullRecipe);
      } else {
        setEditingRecipe(recipe);
      }
      setIsRecipeModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch recipe details:', error);
      setEditingRecipe(recipe);
      setIsRecipeModalOpen(true);
    }
  };

  const handleAddNew = () => {
    if (currentTab === 'inventory') {
      setEditingItem(null);
      setIsItemModalOpen(true);
    } else {
      setEditingRecipe(null);
      setIsRecipeModalOpen(true);
    }
  };

  const [sortConfig, setSortConfig] = useState<{ key: keyof SequinItem; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof SequinItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof SequinItem }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-4 h-4 text-gray-300 ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-teal-600 ml-1" />
      : <ArrowDown className="w-4 h-4 text-teal-600 ml-1" />;
  };

  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesColor = selectedColor === 'all' || item.color === selectedColor;
      return matchesSearch && matchesCategory && matchesColor;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === undefined || bValue === undefined) return 0;
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, searchQuery, selectedCategory, selectedColor, sortConfig]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recipes, searchQuery]);

  const totalValue = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  }, [filteredItems]);

  const uniqueColors = useMemo(() => {
    const colors = new Set(items.map(item => item.color).filter(Boolean));
    return Array.from(colors);
  }, [items]);

  const getItemName = (id: string) => {
    const item = items.find(i => i.id === id);
    return item ? item.name : '未知物品';
  };

  const getItemUnit = (id: string) => {
    const item = items.find(i => i.id === id);
    return item?.unit || '個';
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-teal-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">流麻亮片管理系統</h1>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg mx-4">
              <button
                onClick={() => setCurrentTab('inventory')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  currentTab === 'inventory' ? "bg-white shadow-sm text-teal-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Package className="w-4 h-4" />
                庫存
              </button>
              <button
                onClick={() => setCurrentTab('recipes')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  currentTab === 'recipes' ? "bg-white shadow-sm text-teal-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <BookOpen className="w-4 h-4" />
                配方
              </button>
            </div>

            <div className="flex items-center gap-4">
              {currentTab === 'inventory' && (
                <div className="hidden md:flex items-center text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                  <span>總價值: <span className="font-semibold text-gray-900">{formatCurrency(totalValue)}</span></span>
                  <span className="mx-2">|</span>
                  <span>總項目: <span className="font-semibold text-gray-900">{filteredItems.length}</span></span>
                </div>
              )}
              
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {currentTab === 'inventory' ? '新增項目' : '新增配方'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-red-50 p-6 rounded-full mb-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">載入失敗</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm font-medium"
            >
              重試
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
            <p className="text-gray-500">正在載入資料...</p>
          </div>
        ) : (
          <>
        {/* Toolbar */}
          <div className="flex flex-col xl:flex-row gap-4 mb-8 justify-between items-start xl:items-center">
            <div className="flex flex-col sm:flex-row flex-1 w-full xl:w-auto gap-4">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={currentTab === 'inventory' ? "搜尋名稱、備註..." : "搜尋配方名稱、備註..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none shadow-sm transition-all"
                />
              </div>
              
              {currentTab === 'inventory' && (
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full sm:w-auto appearance-none pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none shadow-sm cursor-pointer min-w-[140px]"
                    >
                      <option value="all">所有分類</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  </div>

                  <div className="relative flex-1 sm:flex-none">
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-full sm:w-auto appearance-none pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none shadow-sm cursor-pointer min-w-[140px]"
                    >
                      <option value="all">所有顏色</option>
                      {uniqueColors.map(color => (
                        <option key={color} value={color as string}>
                          {color}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-200 bg-gray-100" />
                  </div>

                  <div className="relative flex-1 sm:flex-none">
                    <select
                      value={sortConfig ? `${sortConfig.key}-${sortConfig.direction}` : ''}
                      onChange={(e) => {
                        if (!e.target.value) {
                          setSortConfig(null);
                          return;
                        }
                        const [key, direction] = e.target.value.split('-');
                        setSortConfig({ key: key as keyof SequinItem, direction: direction as 'asc' | 'desc' });
                      }}
                      className="w-full sm:w-auto appearance-none pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none shadow-sm cursor-pointer min-w-[140px]"
                    >
                      <option value="">預設排序</option>
                      <option value="name-asc">名稱 (A → Z)</option>
                      <option value="name-desc">名稱 (Z → A)</option>
                      <option value="quantity-asc">數量 (少 → 多)</option>
                      <option value="quantity-desc">數量 (多 → 少)</option>
                      <option value="price-asc">價格 (低 → 高)</option>
                      <option value="price-desc">價格 (高 → 低)</option>
                    </select>
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
            {currentTab === 'inventory' && (
              <>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2.5 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-gray-200 transition-all"
                  title="設定"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-gray-300 mx-1" />
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 rounded-md transition-all",
                      viewMode === 'list' ? "bg-white shadow-sm text-teal-600" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-md transition-all",
                      viewMode === 'grid' ? "bg-white shadow-sm text-teal-600" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {currentTab === 'inventory' ? (
          filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">沒有找到項目</h3>
              <p className="text-gray-500">試著調整搜尋條件或新增一個亮片吧！</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-medium">
                      <th className="px-6 py-4 w-20">圖片</th>
                      <th 
                        className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          名稱 <SortIcon columnKey="name" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center">
                          分類 <SortIcon columnKey="category" />
                        </div>
                      </th>
                      <th className="px-6 py-4">狀態</th>
                      <th 
                        className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort('quantity')}
                      >
                        <div className="flex items-center justify-end">
                          數量 <SortIcon columnKey="quantity" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => handleSort('price')}
                      >
                        <div className="flex items-center justify-end">
                          單價 <SortIcon columnKey="price" />
                        </div>
                      </th>
                      <th className="px-6 py-4 w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : item.hasImage ? (
                              <img src={`/api/items/${item.id}/image`} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {item.color && (
                            <span className="text-sm text-gray-500">[{item.color}]</span>
                          )}
                          {item.name}
                        </div>
                      </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", getStatusColor(item.status))}>
                            {item.status || '充足'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-gray-600">
                          {item.quantity} <span className="text-xs text-gray-400">{item.unit || '個'}</span>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-gray-600">{formatCurrency(item.price || 0)}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                              title="編輯"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="刪除"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : item.hasImage ? (
                      <img src={`/api/items/${item.id}/image`} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}
                        className="p-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-full text-gray-700 hover:text-teal-600 transition-colors"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}
                        className="p-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-full text-gray-700 hover:text-red-600 transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-medium text-gray-900 truncate mb-1 flex items-center gap-2">
                    {item.color && (
                      <span className="text-xs text-gray-500 flex-shrink-0">[{item.color}]</span>
                    )}
                    <span className="truncate">{item.name}</span>
                  </h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                        {item.category}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border", getStatusColor(item.status))}>
                        {item.status || '充足'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-500">x{item.quantity}{item.unit || '個'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Recipes View
          filteredRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <BookOpen className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">沒有找到配方</h3>
              <p className="text-gray-500">試著新增一個配方，記錄你的創作吧！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map(recipe => (
                <div key={recipe.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : recipe.hasImage ? (
                      <img src={`/api/recipes/${recipe.id}/image`} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ChefHat className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditRecipe(recipe); }}
                        className="p-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-full text-gray-700 hover:text-teal-600 transition-colors"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe); }}
                        className="p-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-full text-gray-700 hover:text-red-600 transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-medium text-gray-900 text-lg mb-2">{recipe.name}</h3>
                    <div className="space-y-2 mb-4 flex-1">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">使用材料</p>
                      <div className="flex flex-wrap gap-2">
                        {recipe.items.map((item, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                            {getItemName(item.itemId)} <span className="text-gray-400 ml-1">x{item.quantity}{getItemUnit(item.itemId)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    {recipe.notes && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 line-clamp-2">{recipe.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        </>
      )}
      </main>

      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={fetchData}
        editingItem={editingItem}
        categories={categories}
      />

      <RecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        onSave={fetchData}
        editingRecipe={editingRecipe}
        inventoryItems={items}
        categories={categories}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        categories={categories}
        onUpdate={fetchData}
      />

      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">確認刪除</h3>
            <p className="text-gray-500 mb-6">
              確定要刪除「{deleteConfirmation.name}」嗎？<br />
              <span className="text-xs text-red-500">此動作無法復原。</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
