import { Sun, Moon, Waves, Trees } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const THEME_META = {
  dark:     { icon: Moon,  label: 'Dark Obsidian',  color: '#00d4ff' },
  light:    { icon: Sun,   label: 'White Clean',    color: '#f59e0b' },
  midnight: { icon: Waves, label: 'Midnight Blue',  color: '#3b82f6' },
  emerald:  { icon: Trees, label: 'Emerald Forest', color: '#10b981' },
};

export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, cycleTheme } = useTheme();
  const meta = THEME_META[theme] || THEME_META.dark;
  const Icon = meta.icon;

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${theme} ${className}`}
      onClick={cycleTheme}
      title={`Current: ${meta.label} — Click to switch`}
      aria-label={`Current theme: ${meta.label}. Click to switch.`}
      id="theme-toggle-btn"
    >
      <div className="theme-toggle-track" style={{ borderColor: `${meta.color}33` }}>
        <div className="theme-toggle-thumb" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}aa` }}>
          <Icon size={13} className="theme-toggle-icon" />
        </div>
      </div>
      {showLabel && (
        <span className="theme-toggle-label">
          {meta.label}
        </span>
      )}
    </button>
  );
}
