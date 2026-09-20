export const API_URL = import.meta.env.VITE_API_URL || '';

export const STOCK_STATUS_MAP = {
  in_stock: { label: 'In Stock', color: 'success' },
  low_stock: { label: 'Low Stock', color: 'warning' },
  out_of_stock: { label: 'Out of Stock', color: 'danger' },
  overstock: { label: 'Overstock', color: 'info' },
};

export const TX_TYPE_MAP = {
  stock_in: { label: 'Stock In', color: 'success', icon: '↓' },
  stock_out: { label: 'Stock Out', color: 'danger', icon: '↑' },
  adjustment: { label: 'Adjustment', color: 'info', icon: '⟳' },
  return: { label: 'Return', color: 'warning', icon: '↩' },
  repair: { label: 'Repair Cost', color: 'warning', icon: '🔧' },
};

export const SEVERITY_MAP = {
  info: { label: 'Info', color: 'info', bg: 'var(--color-info-bg)' },
  warning: { label: 'Warning', color: 'warning', bg: 'var(--color-warning-bg)' },
  critical: { label: 'Critical', color: 'danger', bg: 'var(--color-danger-bg)' },
};
