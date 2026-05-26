import Link from 'next/link';

interface AnalyticsCardProps {
  title: string;
  value: number | string;
  link: string;
  icon: string;
  trend?: { value: string; positive: boolean };
}

export function AnalyticsCard({ title, value, link, icon, trend }: AnalyticsCardProps) {
  return (
    <Link href={link} className="admin-analytics-card">
      <div className="card-content">
        <div className="card-header">
          <span className="card-title">{title}</span>
          <span className="card-icon">{icon}</span>
        </div>
        <div className="card-body">
          <span className="card-value">{value}</span>
          {trend && (
            <span className={`card-trend ${trend.positive ? 'positive' : 'negative'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
