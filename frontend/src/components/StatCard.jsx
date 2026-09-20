export default function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  subtext,
  trend,
  trendDir,
  progress,
  progressColor,
  delay = 0,
}) {
  return (
    <div
      className="glass-card stat-card animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-card-header">
        <div
          className="stat-card-icon"
          style={{
            background: iconBg || 'var(--bg-glass-strong)',
            color: iconColor || 'var(--accent-primary)',
          }}
        >
          {Icon && <Icon size={20} />}
        </div>
        {trend && (
          <span className={`stat-card-trend ${trendDir || 'up'}`}>
            {trendDir === 'down' ? '↓' : '↑'} {trend}
          </span>
        )}
      </div>

      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>

      {progress !== undefined && (
        <div className="stat-card-progress-bar">
          <div
            className="stat-card-progress-fill"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: progressColor || 'var(--accent-gradient)',
            }}
          />
        </div>
      )}

      {subtext && <div className="stat-card-subtext">{subtext}</div>}
    </div>
  );
}
