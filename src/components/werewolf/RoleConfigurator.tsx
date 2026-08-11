'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ROLES,
  WOLF_ROLES,
  VILLAGE_ROLES,
  NEUTRAL_ROLES,
  PRESETS,
  PLAYER_COUNTS,
  analyzeBalance,
  getPresetCounts,
  type BalanceReport,
  type BalanceWarning,
} from '@/lib/werewolf-config';
import { Minus, Plus, RotateCcw, AlertTriangle, Info, XCircle, CheckCircle2, Lightbulb, Users, Zap } from 'lucide-react';
import { RoleCrest } from '@/components/characters/RoleCrest';

// ---- Warning Item ----
function WarningItem({ warning }: { warning: BalanceWarning }) {
  const styles = {
    danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
    info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200',
  };
  const icons = {
    danger: <XCircle className="h-4 w-4 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />,
    info: <Info className="h-4 w-4 shrink-0 mt-0.5" />,
  };
  return (
    <div className={`flex gap-2.5 rounded-lg border p-3 text-sm ${styles[warning.level]}`}>
      {icons[warning.level]}
      <div>
        <p className="font-semibold">{warning.message}</p>
        <p className="mt-0.5 opacity-80">{warning.detail}</p>
      </div>
    </div>
  );
}

// ---- Balance Gauge ----
function BalanceGauge({ report }: { report: BalanceReport }) {
  const wolfPct = report.wolfRatio * 100;
  const villagePct = report.villageRatio * 100;
  const neutralPct = Math.max(0, 100 - wolfPct - villagePct);

  // Ideal wolf range highlight: 25%-33%
  const idealStart = 25;
  const idealEnd = 33;

  return (
    <div className="space-y-2">
      <div className="relative h-6 w-full overflow-hidden rounded-full bg-muted">
        {/* Ideal range marker */}
        <div
          className="absolute top-0 h-full border-2 border-dashed border-emerald-400/60 bg-emerald-100/40 dark:bg-emerald-900/30"
          style={{ left: `${idealStart}%`, width: `${idealEnd - idealStart}%` }}
        />
        {/* Wolf bar */}
        <div
          className="absolute top-0 left-0 h-full bg-red-500/80 transition-all duration-500 rounded-l-full"
          style={{ width: `${wolfPct}%` }}
        />
        {/* Village bar */}
        <div
          className="absolute top-0 h-full bg-emerald-500/80 transition-all duration-500"
          style={{ left: `${wolfPct}%`, width: `${villagePct}%` }}
        />
        {/* Neutral bar */}
        {neutralPct > 0 && (
          <div
            className="absolute top-0 h-full bg-violet-500/80 transition-all duration-500 rounded-r-full"
            style={{ left: `${wolfPct + villagePct}%`, width: `${neutralPct}%` }}
          />
        )}
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
          {report.totalPlayers > 0 ? `${report.wolfCount}S / ${report.totalPlayers - report.wolfCount}D` : '—'}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          Sói {wolfPct.toFixed(0)}%
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Dân {villagePct.toFixed(0)}%
        </div>
        {neutralPct > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500" />
            Trung lập {neutralPct.toFixed(0)}%
          </div>
        )}
      </div>
      {/* Ideal range label */}
      <p className="text-center text-xs text-muted-foreground">
        Khoảng lý tưởng: <span className="font-medium text-emerald-600">25%–33% Sói</span>{' '}
        <span className="text-[10px]">(đường đứt xanh)</span>
      </p>
    </div>
  );
}

// ---- Role Row ----
function RoleRow({
  role,
  count,
  isCustom,
  onIncrease,
  onDecrease,
}: {
  role: (typeof ROLES)[number];
  count: number;
  isCustom: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const factionBadge = {
    wolf: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    village: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    neutral: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  };

  // Tile keeps bg-card so the crest's knocked-out details line up with `cutout`.
  const factionTile = {
    wolf: 'bg-card border-red-300 text-red-600 dark:border-red-900 dark:text-red-400',
    village: 'bg-card border-emerald-300 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400',
    neutral: 'bg-card border-violet-300 text-violet-600 dark:border-violet-900 dark:text-violet-400',
  };

  const factionLabel = { wolf: 'Phe Sói', village: 'Phe Dân', neutral: 'Trung lập' };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${factionTile[role.faction]}`}
          >
            <RoleCrest role={role.id} size={20} cutout="var(--card)" title={role.name} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{role.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${factionBadge[role.faction]}`}>
                {factionLabel[role.faction]}
              </span>
              {isCustom && count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  Tùy chỉnh
                </span>
              )}
            </div>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="hidden sm:block text-xs text-muted-foreground max-w-[180px] truncate cursor-default">
              {role.description}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{role.description}</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onDecrease}
            disabled={count <= 0}
            aria-label={`Giảm ${role.name}`}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className={`w-8 text-center font-bold text-lg tabular-nums ${count > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
            {count}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onIncrease}
            aria-label={`Tăng ${role.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---- Main Component ----
export default function RoleConfigurator() {
  const [playerCount, setPlayerCount] = useState<number>(8);
  const [counts, setCounts] = useState<Record<string, number>>(() => getPresetCounts(8));
  const [isCustom, setIsCustom] = useState<Record<string, boolean>>({});

  const report = useMemo(() => analyzeBalance(counts), [counts]);

  const totalAssigned = Object.values(counts).reduce((a, b) => a + b, 0);

  const handlePlayerCountChange = useCallback(
    (n: number) => {
      setPlayerCount(n);
      const preset = PRESETS[n];
      if (preset) {
        setCounts({ ...preset.counts });
        setIsCustom({});
      } else {
        setCounts(getPresetCounts(n));
        setIsCustom({});
      }
    },
    []
  );

  const handleReset = useCallback(() => {
    setCounts(getPresetCounts(playerCount));
    setIsCustom({});
  }, [playerCount]);

  const handleChange = useCallback((roleId: string, delta: number) => {
    setCounts((prev) => {
      const next = { ...prev };
      next[roleId] = Math.max(0, (next[roleId] || 0) + delta);
      return next;
    });
    setIsCustom((prev) => ({ ...prev, [roleId]: true }));
  }, []);

  const ratingIcons: Record<BalanceReport['rating'], React.ReactNode> = {
    excellent: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    good: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    acceptable: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    unbalanced: <AlertTriangle className="h-5 w-5 text-orange-500" />,
    broken: <XCircle className="h-5 w-5 text-red-500" />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="flex items-center justify-center gap-2.5 text-3xl sm:text-4xl font-bold tracking-tight">
            <RoleCrest role="werewolf" size={32} cutout="var(--background)" className="text-red-600 dark:text-red-500" />
            Cấu hình Ma Sói
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base">
            Chọn số người chơi, điều chỉnh vai trò — hệ thống sẽ phân tích cân bằng theo thời gian thực.
          </p>
        </header>

        {/* Player Count Selector */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Số người chơi
            </CardTitle>
            <CardDescription>Chọn số lượng hoặc nhập số tùy ý</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PLAYER_COUNTS.map((n) => (
                <Button
                  key={n}
                  variant={playerCount === n ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePlayerCountChange(n)}
                  className="min-w-[3rem]"
                >
                  {n}
                </Button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePlayerCountChange(Math.max(4, playerCount - 1))}
                disabled={playerCount <= 4}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center font-bold text-lg tabular-nums">{playerCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePlayerCountChange(Math.min(24, playerCount + 1))}
                disabled={playerCount >= 24}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground ml-1">người</span>
            </div>
            {PRESETS[playerCount] && (
              <p className="mt-2 text-xs text-muted-foreground">
                Gợi ý: <span className="font-medium">{PRESETS[playerCount].label}</span> — {PRESETS[playerCount].difficulty} —{' '}
                {PRESETS[playerCount].notes}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Balance Overview */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Phân tích cân bằng
              </CardTitle>
              <div className="flex items-center gap-2">
                {ratingIcons[report.rating]}
                <span className={`font-semibold text-sm ${report.ratingColor}`}>
                  {report.ratingLabel}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <BalanceGauge report={report} />

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-red-50 dark:bg-red-950/50 p-2.5">
                <p className="text-2xl font-bold text-red-600">{report.wolfCount}</p>
                <p className="text-xs text-muted-foreground">Phe Sói</p>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-2.5">
                <p className="text-2xl font-bold text-emerald-600">{report.villagePowerCount}</p>
                <p className="text-xs text-muted-foreground">Vai trò Dân</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2.5">
                <p className="text-2xl font-bold">{totalAssigned}</p>
                <p className="text-xs text-muted-foreground">Tổng phân vai</p>
              </div>
            </div>

            {/* Mismatch warning */}
            {totalAssigned !== playerCount && totalAssigned > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Tổng vai trò (<strong>{totalAssigned}</strong>) không khớp số người chơi (<strong>{playerCount}</strong>).{' '}
                  {totalAssigned < playerCount
                    ? `Còn thiếu ${playerCount - totalAssigned} người.`
                    : `Dư ${totalAssigned - playerCount} vai trò.`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Configuration */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Phân vai trò</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại theo gợi ý
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wolf faction */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="destructive" className="text-xs">Phe Sói</Badge>
                <Separator className="flex-1" />
              </div>
              <div className="space-y-2">
                {WOLF_ROLES.map((role) => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    count={counts[role.id] || 0}
                    isCustom={!!isCustom[role.id]}
                    onIncrease={() => handleChange(role.id, 1)}
                    onDecrease={() => handleChange(role.id, -1)}
                  />
                ))}
              </div>
            </div>

            {/* Village faction */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-emerald-600 text-xs hover:bg-emerald-600">Phe Dân</Badge>
                <Separator className="flex-1" />
              </div>
              <div className="space-y-2">
                {VILLAGE_ROLES.map((role) => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    count={counts[role.id] || 0}
                    isCustom={!!isCustom[role.id]}
                    onIncrease={() => handleChange(role.id, 1)}
                    onDecrease={() => handleChange(role.id, -1)}
                  />
                ))}
              </div>
            </div>

            {/* Neutral faction */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-violet-600 text-xs hover:bg-violet-600">Trung lập</Badge>
                <Separator className="flex-1" />
              </div>
              <div className="space-y-2">
                {NEUTRAL_ROLES.map((role) => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    count={counts[role.id] || 0}
                    isCustom={!!isCustom[role.id]}
                    onIncrease={() => handleChange(role.id, 1)}
                    onDecrease={() => handleChange(role.id, -1)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warnings & Tips */}
        {(report.warnings.length > 0 || report.tips.length > 0) && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Cảnh báo & Gợi ý
                {report.warnings.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {report.warnings.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.warnings.map((w, i) => (
                <WarningItem key={i} warning={w} />
              ))}
              {report.tips.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  {report.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
                      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="mt-auto text-center text-xs text-muted-foreground pb-6">
          Ma Sói Realtime — Công cụ cấu hình cân bằng phe
        </footer>
      </div>
    </div>
  );
}