'use client';
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend
} from 'recharts';

import { getSupabase } from '@/lib/supabase';

export function PerformanceAnalytics({ userId }: { userId: string }) {
  const [analytics, setAnalytics] = React.useState<any>(null);

  React.useEffect(() => {
    async function load() {
      if (!userId) return;
      const supabase = getSupabase();
      const { data } = await (supabase as any).from('user_performance_analytics').select('*').eq('user_id', userId).single();
      if (data) setAnalytics(data);
    }
    load();
  }, [userId]);
  const activityData = [
    { name: 'Mon', submissions: 0, accepted: 0 },
    { name: 'Tue', submissions: 0, accepted: 0 },
    { name: 'Wed', submissions: 0, accepted: 0 },
    { name: 'Thu', submissions: 0, accepted: 0 },
    { name: 'Fri', submissions: 0, accepted: 0 },
    { name: 'Sat', submissions: 0, accepted: 0 },
    { name: 'Sun', submissions: 0, accepted: 0 },
  ];

  const radarData = [
    { subject: 'Algorithms', A: analytics?.radar_chart_data?.algorithms || 0, fullMark: 150 },
    { subject: 'Data Structures', A: analytics?.radar_chart_data?.data_structures || 0, fullMark: 150 },
    { subject: 'Math', A: analytics?.radar_chart_data?.math || 0, fullMark: 150 },
    { subject: 'Dynamic Prog', A: analytics?.radar_chart_data?.dynamic_programming || 0, fullMark: 150 },
    { subject: 'Graphs', A: analytics?.radar_chart_data?.graphs || 0, fullMark: 150 },
    { subject: 'Strings', A: analytics?.radar_chart_data?.strings || 0, fullMark: 150 },
  ];

  const pieData = [
    { name: 'Easy', value: 0, color: '#22c55e' },
    { name: 'Medium', value: 0, color: '#eab308' },
    { name: 'Hard', value: 0, color: '#ef4444' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(10,10,15,0.9)', border: '1px solid var(--color-border)', padding: '0.75rem', borderRadius: 'var(--radius)', backdropFilter: 'blur(10px)' }}>
          <p style={{ color: '#fff', margin: '0 0 0.5rem 0', fontWeight: 600 }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: 0, fontSize: '0.85rem' }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-col gap-6">
      
      {/* Velocity Line Chart */}
      <div className="card">
        <h4 style={{ marginBottom: '1.5rem' }}>📈 Problem Solving Velocity</h4>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={activityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="submissions" name="Total Submissions" stroke="var(--text-tertiary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--color-surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="accepted" name="Accepted" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Topic Mastery Radar */}
        <div className="card">
          <h4 style={{ marginBottom: '1.5rem' }}>🎯 Topic Mastery Radar</h4>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar name="Points" dataKey="A" stroke="var(--accent-2)" fill="var(--accent)" fillOpacity={0.4} />
                <RechartsTooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="card">
          <h4 style={{ marginBottom: '1.5rem' }}>📊 Difficulty Distribution</h4>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
