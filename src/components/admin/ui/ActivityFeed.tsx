import React from 'react';

interface ActivityItem {
  id: string;
  action: string;
  target: string;
  user: string;
  time: string;
  icon: string;
}

export function ActivityFeed({ items = [] }: { items?: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="admin-empty-state">
        <span className="icon">📭</span>
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <ul className="admin-activity-feed">
      {items.map((item) => (
        <li key={item.id} className="activity-item">
          <div className="activity-icon">{item.icon}</div>
          <div className="activity-content">
            <p>
              <span className="activity-user">{item.user}</span> {item.action}{' '}
              <span className="activity-target">{item.target}</span>
            </p>
            <span className="activity-time">{item.time}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
