import Link from 'next/link';

interface ActionItem {
  label: string;
  href: string;
  icon: string;
}

export function QuickActions({ actions }: { actions: ActionItem[] }) {
  return (
    <div className="admin-quick-actions">
      {actions.map((action) => (
        <Link key={action.href} href={action.href} className="quick-action-btn">
          <span className="action-icon">{action.icon}</span>
          <span className="action-label">{action.label}</span>
          <span className="action-arrow">→</span>
        </Link>
      ))}
    </div>
  );
}
