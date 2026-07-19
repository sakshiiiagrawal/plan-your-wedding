import { useMemo, useState } from 'react';
import { currencySymbol, formatCurrency } from '../../utils/currency';

interface SplitShareProps {
  total: number;
  bridePercentage: number;
  onChange: (bridePercentage: number) => void;
  label?: string;
  disabled?: boolean;
}

const BRIDE_COLOR = 'var(--bride-deep)';
const BRIDE_BG = 'var(--bride-soft)';
const BRIDE_BORDER = 'var(--bride-line)';
const GROOM_COLOR = 'var(--groom-deep)';
const GROOM_BG = 'var(--groom-soft)';
const GROOM_BORDER = 'var(--groom-line)';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const roundPct = (n: number) => Math.round(n * 100) / 100;

const formatPct = (n: number) => {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

export default function SplitShare({
  total,
  bridePercentage,
  onChange,
  label = 'Bride / Groom split',
  disabled,
}: SplitShareProps) {
  const hasTotal = total > 0;
  const [mode, setMode] = useState<'percent' | 'amount'>('percent');
  const effectiveMode = hasTotal ? mode : 'percent';

  const bridePct = clamp(Number.isFinite(bridePercentage) ? bridePercentage : 50, 0, 100);
  const groomPct = 100 - bridePct;

  const { brideAmt, groomAmt } = useMemo(() => {
    const roundedTotal = Math.round(total);
    const b = Math.round((total * bridePct) / 100);
    return { brideAmt: b, groomAmt: Math.max(0, roundedTotal - b) };
  }, [total, bridePct]);

  const updateFromMetric = (side: 'bride' | 'groom', raw: string, metric: 'percent' | 'amount') => {
    if (raw.trim() === '') return;
    const num = Number(raw);
    if (!Number.isFinite(num)) return;

    if (metric === 'percent') {
      const pct = clamp(num, 0, 100);
      onChange(roundPct(side === 'bride' ? pct : 100 - pct));
    } else {
      if (total <= 0) return;
      const amtPct = clamp((num / total) * 100, 0, 100);
      onChange(roundPct(side === 'bride' ? amtPct : 100 - amtPct));
    }
  };

  const handleSideInput = (side: 'bride' | 'groom', raw: string) =>
    updateFromMetric(side, raw, effectiveMode);

  const handleSlider = (raw: string) => {
    const num = Number(raw);
    if (!Number.isFinite(num)) return;
    onChange(clamp(num, 0, 100));
  };

  const renderTile = (side: 'bride' | 'groom') => {
    const isBride = side === 'bride';
    const color = isBride ? BRIDE_COLOR : GROOM_COLOR;
    const bg = isBride ? BRIDE_BG : GROOM_BG;
    const border = isBride ? BRIDE_BORDER : GROOM_BORDER;
    const pct = isBride ? bridePct : groomPct;
    const amt = isBride ? brideAmt : groomAmt;
    const inputValue = effectiveMode === 'percent' ? formatPct(pct) : String(amt);
    const prefix = effectiveMode === 'percent' ? '' : currencySymbol();
    const suffix = effectiveMode === 'percent' ? '%' : '';
    const secondaryMetric = effectiveMode === 'percent' ? 'amount' : 'percent';
    const secondaryValue = secondaryMetric === 'amount' ? String(amt) : formatPct(pct);
    const secondaryPrefix = secondaryMetric === 'amount' ? `≈ ${currencySymbol()}` : '';
    const secondarySuffix = secondaryMetric === 'percent' ? '%' : '';
    // The currency secondary is a dead control without a total — show a hint instead
    const showSecondaryInput = !disabled && (secondaryMetric === 'percent' || hasTotal);

    return (
      <div
        style={{
          border: `1px solid ${border}`,
          background: bg,
          borderRadius: 10,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color,
            textTransform: 'uppercase',
          }}
        >
          {isBride ? 'Bride' : 'Groom'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {prefix && <span style={{ color, fontSize: 15, fontWeight: 500 }}>{prefix}</span>}
          <input
            type="number"
            inputMode="decimal"
            className="no-spinner split-num-main"
            min={0}
            max={effectiveMode === 'percent' ? 100 : total || undefined}
            step={effectiveMode === 'percent' ? 0.5 : 1}
            value={inputValue}
            disabled={disabled}
            onChange={(e) => handleSideInput(side, e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color,
              fontWeight: 500,
              padding: 0,
              fontFamily: 'var(--font-sans)',
            }}
          />
          {suffix && <span style={{ color, fontSize: 15, fontWeight: 500 }}>{suffix}</span>}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--ink-dim)',
            height: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {showSecondaryInput ? (
            <>
              {/* Desktop: the secondary metric is directly editable. Phones get
                  a read-only echo — a 10px input would trigger iOS focus zoom
                  and is far below a usable touch target. */}
              <span
                className="max-md:hidden"
                style={{ display: 'flex', alignItems: 'center', gap: 3, height: '100%' }}
              >
                {secondaryPrefix && <span>{secondaryPrefix}</span>}
                <input
                  type="number"
                  inputMode="decimal"
                  className="no-spinner"
                  min={0}
                  max={secondaryMetric === 'percent' ? 100 : total || undefined}
                  step={secondaryMetric === 'percent' ? 0.5 : 1}
                  value={secondaryValue}
                  disabled={disabled}
                  onChange={(e) => updateFromMetric(side, e.target.value, secondaryMetric)}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={`${isBride ? 'Bride' : 'Groom'} ${
                    secondaryMetric === 'amount' ? 'amount' : 'percentage'
                  }`}
                  style={{
                    width: secondaryMetric === 'amount' ? 72 : 44,
                    minWidth: 0,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    color: 'var(--ink-dim)',
                    fontSize: 10,
                    height: '100%',
                    padding: 0,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                {secondarySuffix && <span>{secondarySuffix}</span>}
              </span>
              <span className="md:hidden">
                {secondaryMetric === 'amount'
                  ? `≈ ${formatCurrency(amt)}`
                  : `${formatPct(pct)}%`}
              </span>
            </>
          ) : disabled ? (
            hasTotal ? (
              `≈ ${formatCurrency(amt)}`
            ) : (
              ''
            )
          ) : (
            `Enter the total to see ${currencySymbol()} amounts`
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span className="label" style={{ margin: 0 }}>
          {label}
        </span>
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-raised)',
            border: '1px solid var(--line-soft)',
            borderRadius: 6,
            padding: 2,
            gap: 1,
          }}
          role="group"
          aria-label="Split mode"
        >
          {(['percent', 'amount'] as const).map((m) => {
            const isActive = effectiveMode === m;
            const isAmount = m === 'amount';
            const isDisabled = isAmount && !hasTotal;
            return (
              <button
                key={m}
                type="button"
                onClick={() => !isDisabled && setMode(m)}
                disabled={isDisabled || disabled}
                title={isDisabled ? 'Enter the total first to split by amount' : undefined}
                style={{
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 4,
                  border: 'none',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  background: isActive ? 'var(--bg-panel)' : 'transparent',
                  color: isActive
                    ? 'var(--gold-deep)'
                    : isDisabled
                      ? 'var(--ink-dim)'
                      : 'var(--ink-low)',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 150ms',
                }}
              >
                {m === 'percent' ? '%' : currencySymbol()}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {renderTile('bride')}
        {renderTile('groom')}
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={bridePct}
        disabled={disabled}
        onChange={(e) => handleSlider(e.target.value)}
        style={{
          width: '100%',
          accentColor: 'var(--gold)',
          margin: 0,
        }}
      />
    </div>
  );
}
