import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// --- Time Series Telemetry Line Chart ---
interface TimeSeriesProps {
  data: { time: string; value: number }[];
  yLabel?: string;
  strokeColor?: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesProps> = ({
  data,
  yLabel = '',
  strokeColor = '#3B82F6',
}) => {
  const formatted = data.map((d) => ({
    ...d,
    timeFormatted: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="timeFormatted"
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            unit={yLabel}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '6px' }}
            labelStyle={{ color: '#F8FAF6', fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Radial Gauge Dial Chart ---
interface GaugeProps {
  value: number;
  min: number;
  max: number;
  unit?: string;
  title?: string;
  color?: string;
}

export const GaugeChart: React.FC<GaugeProps> = ({
  value,
  min,
  max,
  unit = '',
  title = '',
  color = '#22C55E',
}) => {
  // Map value to percentage
  const percent = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  
  const data = [
    {
      name: 'Value',
      value: percent,
      fill: color,
    },
  ];

  return (
    <div className="w-full h-48 flex flex-col items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="75%"
          outerRadius="95%"
          barSize={12}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar background={{ fill: '#334155' }} dataKey="value" />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-[55%] text-center">
        <div className="text-2xl font-extrabold text-slate-100 font-sans">
          {value.toFixed(1)}
          <span className="text-sm font-medium text-slate-400 ml-1">{unit}</span>
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-wide mt-0.5">{title}</div>
      </div>
    </div>
  );
};

// --- Bar Chart for Valuations ---
interface BarChartProps {
  data: { name: string; value: number }[];
}

export const AssetValuationChart: React.FC<BarChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#94A3B8"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            formatter={(val: any) => [`$${val}`, 'Value']}
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }}
          />
          <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#22C55E'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Pie Chart for Categories Donut ---
interface DonutProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#3B82F6', '#22C55E', '#EF4444', '#EAB308', '#8B5CF6', '#EC4899'];

export const CategorySummaryChart: React.FC<DonutProps> = ({ data }) => {
  return (
    <div className="w-full h-64 flex flex-col justify-center items-center">
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 px-4">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-300">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            ></span>
            <span>{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Uptime Status Horizontal Bar Chart ---
interface UptimeProps {
  data: { name: string; uptime: number }[];
}

export const UptimeChart: React.FC<UptimeProps> = ({ data }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="#94A3B8"
            fontSize={10}
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#94A3B8"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(val: any) => [`${val}%`, 'Uptime']}
            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }}
          />
          <Bar dataKey="uptime" fill="#10B981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
