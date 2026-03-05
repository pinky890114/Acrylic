import React, { useState, useRef } from 'react';
import { Category, dbApi } from '../db';
import { localDb } from '../localDb';
import { X, Plus, Trash2, Check, AlertCircle, Database, FolderTree, Loader2, Download, Upload, AlertTriangle, Smartphone, Share2 } from 'lucide-react';
import { generateId, cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onUpdate: () => void;
}

export function SettingsModal({ isOpen, onClose, categories, onUpdate }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'data'>('categories');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#0d9488');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || isAddingCategory) return;

    setIsAddingCategory(true);
    try {
      await dbApi.addCategory({
        id: generateId(),
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      setNewCategoryName('');
      onUpdate();
    } catch (error) {
      console.error('Failed to add category:', error);
      alert('新增分類失敗');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeleteCategory = async (id: string) => {
    if (!id) return;
    setIsDeleting(id);
    try {
      await dbApi.deleteCategory(id);
      setDeleteConfirmId(null);
      await onUpdate();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('刪除失敗，請稍後再試');
    } finally {
      setIsDeleting(null);
    }
  };

  const BATCH_SIZE = 5; // Reduced batch size to prevent payload too large errors with images

  const executeImport = async (items: any[], categories: any[], recipes: any[]) => {
    setIsImporting(true);
    setImportProgress(null);
    
    try {
      const totalItems = items.length + categories.length + recipes.length;
      if (totalItems === 0) {
        setImportStatus({ type: 'error', message: '沒有資料可匯入' });
        setIsImporting(false);
        return;
      }

      setImportStatus({ type: 'info', message: `正在匯入 ${totalItems} 筆資料...` });
      setImportProgress({ current: 0, total: totalItems });

      let globalImportedCount = 0;
      let globalFailedCount = 0;
      const failedItems: string[] = [];

      const runBatch = async <T extends { name: string }>(data: T[], apiCall: (chunk: T[]) => Promise<any>) => {
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const chunk = data.slice(i, i + BATCH_SIZE);
          let retries = 3;
          while (retries > 0) {
            try {
              await apiCall(chunk);
              globalImportedCount += chunk.length;
              setImportProgress({ current: globalImportedCount, total: totalItems });
              setImportStatus({ 
                type: 'info', 
                message: `正在匯入... (成功: ${globalImportedCount - globalFailedCount}, 失敗: ${globalFailedCount})` 
              });
              // Small delay to prevent server overload
              await new Promise(r => setTimeout(r, 50));
              break;
            } catch (err) {
              console.error('Batch import failed:', err);
              retries--;
              if (retries === 0) {
                // If a batch fails, we log the first item name as a representative
                failedItems.push(`${chunk[0]?.name || 'Unknown'} (及其他 ${chunk.length - 1} 筆)`);
                globalFailedCount += chunk.length;
                globalImportedCount += chunk.length; // Treat as processed even if failed
                setImportProgress({ current: globalImportedCount, total: totalItems });
                setImportStatus({ 
                  type: 'info', 
                  message: `正在匯入... (成功: ${globalImportedCount - globalFailedCount}, 失敗: ${globalFailedCount})` 
                });
              } else {
                setImportStatus({ 
                  type: 'info', 
                  message: `批次匯入失敗，正在重試 (${3 - retries}/3)...` 
                });
                await new Promise(r => setTimeout(r, 1000));
              }
            }
          }
        }
      };

      if (categories.length > 0) {
        const sanitized = categories.map(c => ({ ...c, color: c.color || '#000000' }));
        await runBatch(sanitized, (chunk) => dbApi.addCategories(chunk));
      }

      if (items.length > 0) {
        const sanitized = items.map(i => ({
          ...i,
          createdAt: i.createdAt || Date.now(),
          quantity: i.quantity || 0,
          category: i.category || '未分類',
          status: i.status || '充足',
        }));
        await runBatch(sanitized, (chunk) => dbApi.addItems(chunk));
      }

      if (recipes.length > 0) {
        const sanitized = recipes.map(r => ({
          ...r,
          createdAt: r.createdAt || Date.now(),
          items: r.items || [],
        }));
        await runBatch(sanitized, (chunk) => dbApi.addRecipes(chunk));
      }

      if (failedItems.length > 0) {
        setImportStatus({ 
          type: 'error', 
          message: `匯入完成，成功: ${globalImportedCount - globalFailedCount}，失敗: ${globalFailedCount}。失敗項目：${failedItems.join(', ')}` 
        });
      } else {
        setImportStatus({ type: 'success', message: `成功匯入 ${globalImportedCount} 筆資料！` });
      }
      onUpdate();

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({ type: 'error', message: '匯入發生錯誤: ' + (error instanceof Error ? error.message : String(error)) });
    } finally {
      setIsImporting(false);
      // Keep status visible
    }
  };

  const handleImportLegacyData = async () => {
    setImportStatus({ type: 'info', message: '正在讀取舊資料...' });
    try {
      const items = await localDb.getAllItems();
      const categories = await localDb.getAllCategories();
      const recipes = await localDb.getAllRecipes();
      await executeImport(items, categories, recipes);
    } catch (error) {
      setImportStatus({ type: 'error', message: '讀取舊資料失敗' });
    }
  };

  const handleExportLegacyData = async () => {
    try {
      const items = await localDb.getAllItems();
      const categories = await localDb.getAllCategories();
      const recipes = await localDb.getAllRecipes();
      
      if (items.length === 0 && categories.length === 0 && recipes.length === 0) {
        alert('沒有找到瀏覽器舊資料');
        return;
      }

      const data = {
        items,
        categories,
        recipes,
        exportDate: new Date().toISOString(),
        version: 1,
        source: 'legacy-browser-storage'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sequin-legacy-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export legacy failed:', error);
      alert('匯出舊資料失敗');
    }
  };

  const handleExportData = async () => {
    try {
      setImportStatus({ type: 'info', message: '正在準備備份資料...' });
      
      const [items, categories, recipes] = await Promise.all([
        dbApi.getAllItems(),
        dbApi.getAllCategories(),
        dbApi.getAllRecipes()
      ]);

      const data = {
        items,
        categories,
        recipes,
        exportDate: new Date().toISOString(),
        version: 2,
        source: 'firebase-cloud-backup'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sequin-cloud-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setImportStatus({ type: 'success', message: '備份檔案已下載' });
    } catch (error) {
      console.error('Export failed:', error);
      setImportStatus({ type: 'error', message: '備份失敗，請稍後再試' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      setImportStatus({ type: 'error', message: '讀取檔案失敗' });
    };
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.items && !json.categories && !json.recipes) {
          throw new Error('Invalid format');
        }
        await executeImport(json.items || [], json.categories || [], json.recipes || []);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('File parse error:', error);
        setImportStatus({ type: 'error', message: '檔案格式錯誤' });
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">設定</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
              activeTab === 'categories' 
                ? "border-teal-600 text-teal-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <FolderTree className="w-4 h-4" />
            分類管理
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
              activeTab === 'data' 
                ? "border-teal-600 text-teal-600" 
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <Database className="w-4 h-4" />
            資料管理
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'categories' ? (
            <div className="space-y-4">
              {/* Categories content... */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={e => setNewCategoryColor(e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                    title="選擇顏色"
                  />
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="新分類名稱..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isAddingCategory}
                    className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingCategory ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </button>
                </form>
              </div>

              <div className="space-y-1">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">沒有分類</div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group border border-transparent hover:border-gray-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium text-gray-700">{cat.name}</span>
                      </div>
                      
                      {deleteConfirmId === cat.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-500 font-medium">確定刪除?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat.id);
                            }}
                            disabled={isDeleting === cat.id}
                            className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {isDeleting === cat.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            disabled={isDeleting === cat.id}
                            className="p-1.5 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(cat.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                          title="刪除分類"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <h3 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  雲端資料庫已啟用
                </h3>
                <p className="text-sm text-green-700 leading-relaxed">
                  您的資料現在安全地儲存在 Firebase 雲端資料庫中。
                  <br />
                  您可以在任何裝置上登入並存取您的庫存資料。
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  資料遷移說明
                </h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                  如果您之前在「本機瀏覽器」使用過此系統，您可以將舊資料匯入到現在的「雲端資料庫」。
                  <br /><br />
                  <strong>注意：</strong> 匯入操作會將舊資料新增到目前的資料庫中。如果 ID 相同，舊資料會覆蓋新資料。
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportData}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-teal-50 border border-teal-200 text-teal-700 font-medium rounded-xl hover:bg-teal-100 transition-all shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                    下載雲端備份
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 border border-blue-200 text-blue-700 font-medium rounded-xl hover:bg-blue-100 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5" />
                    匯入備份檔案
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".json"
                    className="hidden"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2 text-center">進階選項</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleImportLegacyData}
                      disabled={isImporting}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                      強制重新同步本機資料
                    </button>
                    <button
                      onClick={handleExportLegacyData}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      匯出本機暫存
                    </button>
                  </div>
                </div>
              </div>

              {importStatus && (
                <div className={cn(
                  "p-4 rounded-xl text-sm font-medium flex flex-col gap-3",
                  importStatus.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" :
                  importStatus.type === 'error' ? "bg-red-50 text-red-700 border border-red-100" :
                  "bg-gray-50 text-gray-700 border border-gray-100"
                )}>
                  <div className="flex items-start gap-3">
                    {importStatus.type === 'success' && <Check className="w-5 h-5 flex-shrink-0" />}
                    {importStatus.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    {importStatus.type === 'info' && <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />}
                    <p>{importStatus.message}</p>
                  </div>
                  
                  {importProgress && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-teal-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
