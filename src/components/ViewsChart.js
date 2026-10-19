import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";
import styles from "../styles/ViewsChat.module.css";
import { useI18n } from "@/i18n/I18nProvider";

// ===== CUSTOM TOOLTIP =====
const CustomTooltip = ({ active, payload, label }) => {
  const { t } = useI18n();

  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        <p className={styles.tooltipValue}>
          <span className={styles.tooltipIcon}>👁️</span>
          {payload[0].value.toLocaleString()}{" "}{t("views")}</p>
        <div className={styles.tooltipDetail}>
          <span>{t("Episodes:")}{" "}{payload[0].payload.episodes || 0}</span>
          <span>{t("Seasons:")}{" "}{payload[0].payload.seasonsCount || 0}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ViewsChart({ data }) {
  const { t } = useI18n();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ===== COLORS =====
  const getBarColor = (index) => {
    const colors = [
      "#60a5fa", // blue
      "#34d399", // green
      "#facc15", // yellow
      "#f87171", // red
      "#a78bfa", // purple
      "#f472b6", // pink
      "#22d3ee", // cyan
      "#fb923c", // orange
      "#4ade80", // light green
      "#818cf8", // indigo
    ];
    return colors[index % colors.length];
  };

  // ===== GRADIENT COLORS =====
  const getGradientColor = (color) => {
    const gradients = {
      "#60a5fa": "url(#blueGradient)",
      "#34d399": "url(#greenGradient)",
      "#facc15": "url(#yellowGradient)",
      "#f87171": "url(#redGradient)",
      "#a78bfa": "url(#purpleGradient)",
      "#f472b6": "url(#pinkGradient)",
      "#22d3ee": "url(#cyanGradient)",
      "#fb923c": "url(#orangeGradient)",
      "#4ade80": "url(#lightGreenGradient)",
      "#818cf8": "url(#indigoGradient)",
    };
    return gradients[color] || color;
  };

  if (!mounted) {
    return (
      <div className={styles.chartPlaceholder}>
        <div className={styles.placeholderContent}>
          <span className={styles.placeholderIcon}>📊</span>
          <p>{t("Loading chart...")}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>📭</span>
        <p>{t("Nta makuru yo kwerekana")}</p>
      </div>
    );
  }

  // ===== TRUNCATE TITLE =====
  const truncateTitle = (title, maxLength = 20) => {
    if (!title) return "Untitled";
    return title.length > maxLength ? title.slice(0, maxLength) + "..." : title;
  };

  // ===== PREPARE DATA =====
  const chartData = data.map((item, index) => ({
    ...item,
    shortTitle: truncateTitle(item.title, 15),
    color: getBarColor(index),
    gradient: getGradientColor(getBarColor(index)),
  }));

  return (
    <div className={styles.chartContainer}>
      {/* GRADIENTS */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="lightGreenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="shortTitle"
            tick={{
              fill: "#94a3b8",
              fontSize: 11,
              fontWeight: 500,
            }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{
              fill: "#94a3b8",
              fontSize: 11,
            }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="totalViews"
            radius={[6, 6, 0, 0]}
            barSize={36}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.gradient}
                style={{
                  cursor: "pointer",
                  transition: "opacity 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = "0.7";
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = "1";
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
