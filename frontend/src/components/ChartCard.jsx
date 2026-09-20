export default function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`glass-card chart-card ${className}`}>
      {title && <div className="chart-card-title">{title}</div>}
      {children}
    </div>
  );
}
