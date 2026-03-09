import React, { useMemo } from 'react';
import { SequinItem, Category } from '../db';
import { X, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency } from '../lib/utils';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SequinItem[];
  categories: Category[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

export function StatisticsModal({ isOpen, onClose, items, categories }: StatisticsModalProps) {
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; value: number; color: string }> = {};
    
    // Initialize with all categories
    categories.forEach((cat, index) => {
      stats[cat.name] = { 
        count: 0, 
        value: 0,
        color: cat.color || COLORS[index % COLORS.length]
      };
    });
    
    // Add 'Uncategorized' if needed
    if (!stats['未分類']) {
      stats['未分類'] = { count: 0, value: 0, color: '#9ca3af' };
    }

    items.forEach(item => {
      const catName = item.category || '未分類';
      if (!stats[catName]) {
         stats[catName] = { count: 0, value: 0, color: '#9ca3af' };
      }
      stats[catName].count += 1;
      stats[catName].value += (item.price || 0);
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .filter(stat => stat.count > 0) // Only show categories with items
      .sort((a, b) => b.count - a.count);
  }, [items, categories]);

  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + (item.price || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <PieChartIcon className="w-6 h-6 text-teal-600" />
            庫存統計
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
              <p className="text-sm text-teal-600 font-medium mb-1">總項目數</p>
              <p className="text-2xl font-bold text-teal-900">{totalItems}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-600 font-medium mb-1">總庫存價值</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalValue)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <p className="text-sm text-purple-600 font-medium mb-1">分類數量</p>
              <p className="text-2xl font-bold text-purple-900">{categoryStats.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">分類佔比 (數量)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, '數量']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4">分類價值排行</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryStats}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '價值']} />
                    <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-medium">
                  <th className="px-6 py-3">分類名稱</th>
                  <th className="px-6 py-3 text-right">數量</th>
                  <th className="px-6 py-3 text-right">佔比</th>
                  <th className="px-6 py-3 text-right">總價值</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoryStats.map((stat) => (
                  <tr key={stat.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                      {stat.name}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">{stat.count}</td>
                    <td className="px-6 py-3 text-right text-gray-500">
                      {((stat.count / totalItems) * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">{formatCurrency(stat.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
