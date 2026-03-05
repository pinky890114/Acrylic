import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const getStatusColor = (status?: string) => {
  switch (status) {
    case '充足':
      return 'bg-green-100 text-green-700 border-green-200';
    case '需補貨':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case '用完了':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const COLOR_MAP: Record<string, string> = {
  '紅色': '#ef4444',
  '橙色': '#f97316',
  '黃色': '#eab308',
  '綠色': '#22c55e',
  '藍色': '#3b82f6',
  '紫色': '#a855f7',
  '粉色': '#ec4899',
  '白色': '#ffffff',
  '黑色': '#000000',
  '金色': '#ffd700',
  '銀色': '#c0c0c0',
  '透明': '#e5e7eb', // Light gray for transparent representation
  '混色': 'linear-gradient(135deg, #ef4444, #eab308, #3b82f6)',
  '其他': '#9ca3af'
};

export const getColorBackground = (colorName?: string) => {
  if (!colorName) return undefined;
  // Check if it's a hex code (legacy support)
  if (colorName.startsWith('#')) return colorName;
  return COLOR_MAP[colorName] || '#9ca3af';
};
