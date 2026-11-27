import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Award,
  Receipt,
  Activity,
} from 'lucide-react';
import { DailySummary, Expense, Sale } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  buildPaymentSlices,
  buildTimeSeries,
  computeExpenseBreakdown,
  computeTopProducts,
  TimeSeriesPoint,
} from '../../utils/reportAnalytics';

interface ReportChartsPanelProps {
  period: 'day' | 'month';
  periodKey: string;
  summary: DailySummary | null;
  sales: Sale[];
  expenses: Expense[];
}

function formatCompactAxis(val: number): string {
  if (val === 0) return '0';
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (Math.abs(val) >= 1_000) return `${Math.round(val / 1_000)}k`;
  return String(Math.round(val));
}

export const ReportChartsPanel: React.FC<ReportChartsPanelProps> = ({
  period,
  periodKey,
  summary,
  sales,
  expenses,
}) => {
  const [chartMode, setChartMode] = useState<'bars' | 'net'>('bars');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const timeSeries = useMemo(
    () => buildTimeSeries(period, periodKey, sales, expenses),
    [period, periodKey, sales, expenses]
  );

  const paymentSlices = useMemo(() => buildPaymentSlices(summary), [summary]);
  const topProducts = useMemo(() => computeTopProducts(sales, 5), [sales]);
  const expenseBreakdown = useMemo(() => computeExpenseBreakdown(expenses, 5), [expenses]);

  const maxValue = useMemo(() => {
    const m = timeSeries.reduce(
      (acc, pt) => Math.max(acc, pt.revenue, pt.expenses, Math.abs(pt.net)),
      0
    );
    return m > 0 ? m : 10000;
  }, [timeSeries]);

  const hasActivity = useMemo(
    () => timeSeries.some((p) => p.revenue > 0 || p.expenses > 0),
    [timeSeries]
  );

  const activePoint: TimeSeriesPoint | null =
    activeIndex !== null && timeSeries[activeIndex] ? timeSeries[activeIndex] : null;

  // Dimensions SVG pour le graphique principal
  const svgW = 680;
  const svgH = 210;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const stepX = timeSeries.length > 0 ? plotW / timeSeries.length : plotW;
  const barW = Math.max(4, Math.min(14, stepX * 0.34));

  // Coordonnées courbe Solde Net
  const netPoints = useMemo(() => {
    if (timeSeries.length === 0) return '';
    return timeSeries
      .map((pt, i) => {
        const x = padL + i * stepX + stepX / 2;
        const clamped = Math.max(0, pt.net);
        const y = padT + plotH - (clamped / maxValue) * plotH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [timeSeries, stepX, plotH, maxValue]);

  const netAreaPoints = useMemo(() => {
    if (!netPoints || timeSeries.length === 0) return '';
    const firstX = (padL + stepX / 2).toFixed(1);
    const lastX = (padL + (timeSeries.length - 1) * stepX + stepX / 2).toFixed(1);
    const baseY = (padT + plotH).toFixed(1);
    return `${firstX},${baseY} ${netPoints} ${lastX},${baseY}`;
  }, [netPoints, timeSeries.length, stepX, plotH]);

  // Calcul des segments du Donut SVG
  const donutSegments = useMemo(() => {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;
    return paymentSlices.map((slice) => {
      const length = (slice.percentage / 100) * circumference;
      const offset = circumference - cumulative;
      cumulative += length;
      return {
        ...slice,
        radius,
        circumference,
        dashArray: `${length} ${circumference - length}`,
        dashOffset: offset,
      };
    });
  }, [paymentSlices]);

  const totalPaymentVolume = useMemo(
    () => paymentSlices.reduce((s, p) => s + p.amount, 0),
    [paymentSlices]
  );

  return (
    <div className="space-y-5">
      {/* GRILLE GRAPHIQUES PRINCIPAUX : ÉVOLUTION (8 COLS) + DONUT PAIEMENTS (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAPHIQUE 1 : ÉVOLUTION ENCAISSEMENTS VS DÉPENSES */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 font-display">
                  {period === 'day'
                    ? 'Activité Horaire (Encaissements vs Dépenses)'
                    : 'Évolution Journalière du Mois'}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {period === 'day'
                    ? 'Repérez vos heures de pointe de 06h à 23h'
                    : 'Comparatif quotidien des entrées et sorties de trésorerie'}
                </p>
              </div>
            </div>

            <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setChartMode('bars')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-all cursor-pointer ${
                  chartMode === 'bars'
                    ? 'bg-white text-emerald-800 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Flux</span>
              </button>
              <button
                type="button"
                onClick={() => setChartMode('net')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-all cursor-pointer ${
                  chartMode === 'net'
                    ? 'bg-white text-indigo-800 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Tendance</span>
              </button>
            </div>
          </div>

          {/* Légende + Infobulle active */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50/80 px-3.5 py-2 rounded-2xl border border-slate-100 text-[11px]">
            <div className="flex items-center gap-4">
              {chartMode === 'bars' ? (
                <>
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Encaissements
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    Dépenses
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                  Solde Net Positif
                </span>
              )}
            </div>

            {activePoint ? (
              <div className="flex items-center gap-3 font-bold text-slate-800 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-900 font-black">
                  {period === 'day' ? activePoint.label : `Jour ${activePoint.label}`}
                </span>
                <span className="text-emerald-700">+{formatCurrency(activePoint.revenue)}</span>
                <span className="text-rose-600">-{formatCurrency(activePoint.expenses)}</span>
                <span className="text-slate-500 font-medium">
                  ({activePoint.salesCount} vente{activePoint.salesCount > 1 ? 's' : ''})
                </span>
              </div>
            ) : (
              <span className="text-slate-400 text-[10px] font-medium">
                Survolez ou touchez un point pour voir le détail
              </span>
            )}
          </div>

          {!hasActivity ? (
            <div className="h-[190px] flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-1.5">
              <BarChart3 className="w-9 h-9 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">
                Aucune donnée graphique sur cette période
              </p>
              <p className="text-[11px] text-slate-400">
                Les courbes et histogrammes s'animeront dès la première vente ou dépense.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-auto min-w-[460px] select-none"
                role="img"
                aria-label="Graphique d'évolution des encaissements et dépenses"
                onMouseLeave={() => setActiveIndex(null)}
              >
                <defs>
                  <linearGradient id="netAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Lignes de grille horizontales */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padT + plotH - ratio * plotH;
                  const val = maxValue * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={svgW - padR}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray={ratio === 0 ? undefined : '3 3'}
                        strokeWidth={1}
                      />
                      <text
                        x={padL - 6}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-slate-400 text-[9px] font-semibold"
                      >
                        {formatCompactAxis(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Mode Barres Comparatives */}
                {chartMode === 'bars' &&
                  timeSeries.map((pt, i) => {
                    const centerX = padL + i * stepX + stepX / 2;
                    const revH = (pt.revenue / maxValue) * plotH;
                    const expH = (pt.expenses / maxValue) * plotH;
                    const isActive = activeIndex === i;

                    return (
                      <g
                        key={pt.key}
                        className="cursor-pointer"
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => setActiveIndex(i)}
                      >
                        {/* Zone de survol élargie */}
                        <rect
                          x={padL + i * stepX}
                          y={padT}
                          width={stepX}
                          height={plotH}
                          fill={isActive ? '#f1f5f9' : 'transparent'}
                          rx={4}
                        />
                        {/* Barre Encaissements */}
                        {pt.revenue > 0 && (
                          <rect
                            x={centerX - barW - 1}
                            y={padT + plotH - revH}
                            width={barW}
                            height={Math.max(2, revH)}
                            rx={3}
                            className={`transition-opacity ${
                              isActive ? 'fill-emerald-600' : 'fill-emerald-500/90'
                            }`}
                          />
                        )}
                        {/* Barre Dépenses */}
                        {pt.expenses > 0 && (
                          <rect
                            x={centerX + 1}
                            y={padT + plotH - expH}
                            width={barW}
                            height={Math.max(2, expH)}
                            rx={3}
                            className={`transition-opacity ${
                              isActive ? 'fill-rose-600' : 'fill-rose-500/85'
                            }`}
                          />
                        )}
                      </g>
                    );
                  })}

                {/* Mode Courbe Tendance Solde Net */}
                {chartMode === 'net' && (
                  <>
                    {netAreaPoints && (
                      <polygon points={netAreaPoints} fill="url(#netAreaGrad)" />
                    )}
                    {netPoints && (
                      <polyline
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={netPoints}
                      />
                    )}
                    {timeSeries.map((pt, i) => {
                      const cx = padL + i * stepX + stepX / 2;
                      const clamped = Math.max(0, pt.net);
                      const cy = padT + plotH - (clamped / maxValue) * plotH;
                      const isActive = activeIndex === i;
                      return (
                        <g
                          key={pt.key}
                          className="cursor-pointer"
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => setActiveIndex(i)}
                        >
                          <rect
                            x={padL + i * stepX}
                            y={padT}
                            width={stepX}
                            height={plotH}
                            fill="transparent"
                          />
                          {(pt.revenue > 0 || pt.expenses > 0 || isActive) && (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isActive ? 5 : 3}
                              className={
                                isActive
                                  ? 'fill-indigo-700 stroke-white stroke-2'
                                  : 'fill-indigo-500 stroke-white stroke-1'
                              }
                            />
                          )}
                        </g>
                      );
                    })}
                  </>
                )}

                {/* Labels Axe X (espacés pour rester lisibles) */}
                {timeSeries.map((pt, i) => {
                  const showLabel =
                    period === 'day'
                      ? i % 2 === 0
                      : i === 0 || (i + 1) % 5 === 0 || i === timeSeries.length - 1;
                  if (!showLabel) return null;
                  const x = padL + i * stepX + stepX / 2;
                  return (
                    <text
                      key={`lbl-${pt.key}`}
                      x={x}
                      y={svgH - 8}
                      textAnchor="middle"
                      className={`text-[9px] font-bold ${
                        activeIndex === i ? 'fill-slate-900' : 'fill-slate-400'
                      }`}
                    >
                      {pt.label}
                    </text>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* GRAPHIQUE 2 : DONUT RÉPARTITION DES PAIEMENTS & CRÉDITS */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <PieChartIcon className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 font-display">
                Mix Paiements
              </h3>
              <p className="text-[10px] text-slate-500">
                Part de chaque canal (incl. crédits)
              </p>
            </div>
          </div>

          {paymentSlices.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-1.5">
              <PieChartIcon className="w-9 h-9 text-slate-200" />
              <p className="text-xs font-bold text-slate-500">Aucun volume enregistré</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
                  <circle
                    cx="65"
                    cy="65"
                    r="52"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="16"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.id}
                      cx="65"
                      cy="65"
                      r={seg.radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Volume</span>
                  <span className="text-xs font-black text-slate-900 font-display leading-tight">
                    {formatCurrency(totalPaymentVolume)}
                  </span>
                </div>
              </div>

              <div className="w-full space-y-1.5">
                {paymentSlices.map((slice) => (
                  <div
                    key={slice.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-slate-50/80"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-bold text-slate-700 truncate">{slice.label}</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-black text-slate-900 font-display">
                        {slice.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GRILLE ANALYSES COMPLÉMENTAIRES : TOP ARTICLES + STRUCTURE DES DÉPENSES */}
      {(topProducts.length > 0 || expenseBreakdown.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TOP 5 ARTICLES VENDUS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 font-display">
                    Top Articles Vendus
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Classement par chiffre d'affaires généré
                  </p>
                </div>
              </div>
            </div>

            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Aucun article vendu sur cette période.
              </p>
            ) : (
              <div className="space-y-2.5">
                {topProducts.map((prod, idx) => {
                  const maxRev = topProducts[0].revenue || 1;
                  const widthPct = Math.max(8, Math.round((prod.revenue / maxRev) * 100));
                  return (
                    <div key={prod.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate pr-2">
                          <span className="text-slate-400 font-black mr-1.5">#{idx + 1}</span>
                          {prod.name}
                          <span className="ml-1.5 text-[10px] font-semibold text-slate-500">
                            (x{prod.quantity})
                          </span>
                        </span>
                        <span className="font-black text-emerald-700 font-display shrink-0">
                          {formatCurrency(prod.revenue)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STRUCTURE DES DÉPENSES */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 font-display">
                    Répartition des Dépenses
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Principaux postes de sorties de caisse
                  </p>
                </div>
              </div>
            </div>

            {expenseBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Aucune dépense enregistrée sur cette période.
              </p>
            ) : (
              <div className="space-y-2.5">
                {expenseBreakdown.map((exp) => (
                  <div key={exp.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate pr-2">
                        {exp.label}
                        <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                          ({exp.percentage}%)
                        </span>
                      </span>
                      <span className="font-black text-rose-700 font-display shrink-0">
                        -{formatCurrency(exp.amount)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all"
                        style={{ width: `${Math.max(6, exp.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
