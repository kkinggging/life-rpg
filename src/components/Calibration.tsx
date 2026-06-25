import { useState, useMemo } from 'react';
import {
  BASE_ATTRS,
  ATTR_META,
  type BaseAttr,
} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type RecordBaseAttr = Record<BaseAttr, number>;

interface CalibrationProps {
  onComplete: (values: RecordBaseAttr) => void;
}

/** Percentile -> initial value: 5 + (p/100)*90 */
function percentileToValue(p: number): number {
  return Math.round(5 + (p / 100) * 90);
}

/** Reverse mapping for display */
function valueToPercentile(v: number): number {
  return Math.round(((v - 5) / 90) * 100);
}

/** Reference group text for each attribute */
const REFERENCE_GROUP: Record<BaseAttr, string> = {
  charm: '在你接触的异性或社交场合中',
  strength: '在同龄男性中',
  intellect: '在你的学习/工作环境中',
  social: '在同龄人的社交场合中',
  willpower: '在你认识的人中，说到做到的程度',
  health: '在同龄人的身体状况中',
  courage: '在你认识的人中，主动做困难事的程度',
  abstinence: '在你对自己控制力的认知中',
};

/** Steps: 0 = Welcome, 1-8 = attrs, 9 = Summary */
const TOTAL_STEPS = 10; // welcome + 8 attrs + summary
const WELCOME_STEP = 0;
const SUMMARY_STEP = 9;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    minHeight: '100dvh',
    background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    color: '#e2e8f0',
    fontFamily: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '16px',
    boxSizing: 'border-box' as const,
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px 0 20px',
  },
  stepDot: (active: boolean, done: boolean) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: active ? '#f59e0b' : done ? '#f59e0b88' : '#334155',
    transition: 'all 0.3s ease',
    boxShadow: active ? '0 0 8px #f59e0b88' : 'none',
  }),
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '80px',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: 700,
    textAlign: 'center' as const,
    marginBottom: '16px',
    color: '#f8fafc',
  },
  welcomeText: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#94a3b8',
    textAlign: 'center' as const,
    maxWidth: '320px',
  },
  attrEmoji: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  attrLabel: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#f8fafc',
    marginBottom: '6px',
  },
  attrRefGroup: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '24px',
    textAlign: 'center' as const,
    maxWidth: '280px',
    lineHeight: 1.5,
  },
  valueDisplay: {
    fontSize: '64px',
    fontWeight: 900,
    color: '#f59e0b',
    lineHeight: 1,
    marginBottom: '8px',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  valueLabel: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '20px',
  },
  sliderContainer: {
    width: '100%',
    maxWidth: '340px',
    padding: '0 8px',
  },
  slider: {
    width: '100%',
    height: '6px',
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    background: '#334155',
    borderRadius: '3px',
    outline: 'none',
    accentColor: '#f59e0b',
  },
  sliderTrack: {
    background: 'linear-gradient(90deg, #f59e0b 0%, #f59e0b var(--pct), #334155 var(--pct))',
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    width: '100%',
    maxWidth: '340px',
    marginTop: '32px',
  },
  btn: (primary: boolean) => ({
    flex: 1,
    padding: '14px 0',
    borderRadius: '12px',
    border: primary ? 'none' : '1px solid #334155',
    background: primary ? '#f59e0b' : 'transparent',
    color: primary ? '#0f0f1a' : '#e2e8f0',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }),
  btnFull: {
    width: '100%',
    maxWidth: '340px',
    padding: '14px 0',
    borderRadius: '12px',
    border: 'none',
    background: '#f59e0b',
    color: '#0f0f1a',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
  },
  summaryCard: {
    width: '100%',
    maxWidth: '340px',
    background: '#1e293b',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '12px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #334155',
  },
  summaryAttr: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#f59e0b',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  progressText: {
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center' as const,
    marginTop: '4px',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Calibration({ onComplete }: CalibrationProps) {
  const [step, setStep] = useState(0);
  const [percentiles, setPercentiles] = useState<Record<BaseAttr, number>>({
    charm: 50,
    strength: 50,
    intellect: 50,
    social: 50,
    willpower: 50,
    health: 50,
    courage: 50,
    abstinence: 50,
  });

  const values = useMemo(() => {
    const v: RecordBaseAttr = {} as RecordBaseAttr;
    for (const attr of BASE_ATTRS) {
      v[attr] = percentileToValue(percentiles[attr]);
    }
    return v;
  }, [percentiles]);

  const currentAttr = step >= 1 && step <= 8 ? BASE_ATTRS[step - 1] : null;
  const isFirstAttr = step === 1;
  const isLastAttr = step === 8;
  const isSummary = step === SUMMARY_STEP;

  const goNext = () => setStep((s) => Math.min(s + 1, SUMMARY_STEP));
  const goBack = () => setStep((s) => Math.max(s - 1, WELCOME_STEP));

  const setPct = (attr: BaseAttr) => (p: number) => {
    setPercentiles((prev) => ({ ...prev, [attr]: p }));
  };

  const handleConfirm = () => {
    onComplete({ ...values });
  };

  // -- Render helpers --

  const renderStepDots = () => (
    <div style={styles.stepIndicator}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div
            key={i}
            style={{
              ...styles.stepDot(active, done),
              // widen the current dot
              width: active ? '28px' : '10px',
              borderRadius: active ? '5px' : '50%',
            }}
          />
        );
      })}
    </div>
  );

  const renderWelcome = () => (
    <>
      <div style={styles.welcomeTitle}>
        ⚔️ 首次校准 · 初始化你的属性
      </div>
      <div style={styles.welcomeText}>
        接下来你需要对自己进行 8 项基础属性的自评。
        <br />
        <br />
        每一题你需要在同年龄群体中
        评估自己所在的
        <strong style={{ color: '#f59e0b' }}> 百分位 </strong>
        （0-99）。
        <br />
        <br />
        0% 表示你在该群体中处于最底端，
        99% 表示你处于最顶端。
        <br />
        <br />
        请诚实作答 —— 这决定了你的初始属性值，
        也是你成长的起点。
      </div>
      <div style={{ ...styles.btnFull, marginTop: '32px', textAlign: 'center' as const } as React.CSSProperties}>
        <button
          style={{ ...styles.btn(true), width: '100%', background: '#f59e0b' }}
          onClick={goNext}
        >
          开始校准
        </button>
      </div>
    </>
  );

  const renderAttrSlider = () => {
    if (!currentAttr) return null;
    const meta = ATTR_META[currentAttr];
    const pct = percentiles[currentAttr];
    const val = values[currentAttr];

    return (
      <>
        <div style={{ textAlign: 'center' as const }}>
          <div style={styles.attrEmoji}>{meta.emoji}</div>
          <div style={styles.attrLabel}>{meta.label}</div>
          <div style={styles.attrRefGroup}>{REFERENCE_GROUP[currentAttr]}</div>

          {/* Value display */}
          <div style={styles.valueDisplay}>{val}</div>
          <div style={styles.valueLabel}>
            初始值 &nbsp;|&nbsp; 百分位{' '}
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{pct}%</span>
          </div>
        </div>

        {/* Slider */}
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min={0}
            max={99}
            value={pct}
            onChange={(e) => setPct(currentAttr)(Number(e.target.value))}
            style={{
              ...styles.slider,
              background: `linear-gradient(90deg, #f59e0b 0%, #f59e0b ${pct}%, #334155 ${pct}%)`,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#475569',
              marginTop: '4px',
            }}
          >
            <span>0%</span>
            <span>50%</span>
            <span>99%</span>
          </div>
        </div>

        {/* Navigation */}
        <div style={styles.navRow}>
          <button style={styles.btn(false)} onClick={goBack}>
            {isFirstAttr ? '返回' : '上一项'}
          </button>
          <button style={styles.btn(true)} onClick={goNext}>
            {isLastAttr ? '查看结果' : '下一项'}
          </button>
        </div>
      </>
    );
  };

  const renderSummary = () => (
    <>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#f8fafc',
          marginBottom: '4px',
          textAlign: 'center' as const,
        }}
      >
        📊 你的初始属性
      </div>
      <div
        style={{
          fontSize: '13px',
          color: '#64748b',
          marginBottom: '16px',
          textAlign: 'center' as const,
        }}
      >
        确认后将进入主界面，开启你的成长之旅
      </div>

      <div style={styles.summaryCard}>
        {BASE_ATTRS.map((attr) => {
          const meta = ATTR_META[attr];
          const val = values[attr];
          const pct = percentiles[attr];
          return (
            <div key={attr} style={styles.summaryRow}>
              <div style={styles.summaryAttr}>
                <span style={{ fontSize: '20px' }}>{meta.emoji}</span>
                <span>{meta.label}</span>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={styles.summaryValue}>{val}</div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  百分位 {pct}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        style={{
          ...styles.btn(true),
          width: '100%',
          maxWidth: '340px',
          background: '#f59e0b',
        }}
        onClick={handleConfirm}
      >
        确认
      </button>

      <button
        style={{
          ...styles.btn(false),
          width: '100%',
          maxWidth: '340px',
          marginTop: '8px',
        }}
        onClick={goBack}
      >
        返回修改
      </button>
    </>
  );

  // -- Main render --

  return (
    <div style={styles.container}>
      {renderStepDots()}

      <div style={styles.progressText}>
        {step === WELCOME_STEP
          ? '欢迎'
          : step === SUMMARY_STEP
            ? '汇总'
            : `${step} / ${BASE_ATTRS.length}`}
      </div>

      <div style={styles.content}>
        {step === WELCOME_STEP && renderWelcome()}
        {currentAttr && renderAttrSlider()}
        {isSummary && renderSummary()}
      </div>
    </div>
  );
}
