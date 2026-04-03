import { createStyles } from 'antd-style';

// Soft overlay tones — slightly brighter than bg (#08080f), never white
const overlay = {
  bright: 'rgb(176 176 200 / 70%)',
  medium: 'rgb(176 176 200 / 50%)',
  muted: 'rgb(176 176 200 / 40%)',
  faint: 'rgb(176 176 200 / 30%)',
  surfaceBg: 'rgb(176 176 200 / 4%)',
  surfaceBgHover: 'rgb(176 176 200 / 10%)',
  surfaceBgActive: 'rgb(176 176 200 / 12%)',
  surfaceBorder: 'rgb(176 176 200 / 6%)',
  surfaceBorderHover: 'rgb(176 176 200 / 8%)',
  surfaceBorderActive: 'rgb(176 176 200 / 25%)',
};

export const useStyles = createStyles(({ css, token }) => ({
  container: css`
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  `,
  errorText: css`
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSize}px;
    color: ${token.colorErrorText};
  `,
  feedAmount: css`
    flex-shrink: 0;
    color: ${token.colorSuccess};
  `,
  feedCard: css`
    display: flex;
    gap: ${token.sizeXS}px;
    align-items: center;
    padding: ${token.paddingXXS}px ${token.paddingSM}px;
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    color: ${overlay.bright};
    background: ${overlay.surfaceBg};
    border: 1px solid ${overlay.surfaceBorder};
    border-radius: ${token.borderRadiusSM}px;
  `,
  feedChain: css`
    flex-shrink: 0;
    font-size: 9px;
    color: ${overlay.faint};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  `,
  feedContainer: css`
    position: absolute;
    right: ${token.marginSM}px;
    bottom: 60px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: ${token.sizeXXS}px;
    width: 280px;
    max-height: 40vh;
    overflow: hidden;

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
  `,
  feedHeader: css`
    display: flex;
    gap: ${token.sizeXS}px;
    align-items: center;
    padding: ${token.sizeXXS}px 0;
    font-family: ${token.fontFamilyCode};
    font-size: 10px;
    font-weight: 600;
    color: ${overlay.muted};
    text-transform: uppercase;
    letter-spacing: 1px;
  `,
  feedLabel: css`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  feedTimestamp: css`
    flex-shrink: 0;
    font-size: 9px;
    color: ${overlay.faint};
  `,
  kbHint: css`
    position: absolute;
    bottom: ${token.marginSM}px;
    left: ${token.marginSM}px;
    z-index: 10;
    font-family: ${token.fontFamilyCode};
    font-size: 9px;
    color: ${overlay.faint};
    letter-spacing: 0.06em;
    pointer-events: none;
    user-select: none;
  `,
  loadingPlaceholder: css`
    width: 100%;
    height: 100%;
    background: #08080f;
  `,
  // Segmented control — buttons sit inside a unified pill container
  periodButton: css`
    padding: ${token.paddingXXS}px ${token.paddingSM}px;
    font-family: ${token.fontFamilyCode};
    font-size: ${token.fontSizeSM}px;
    color: ${overlay.medium};
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: calc(${token.borderRadiusSM}px - 1px);
    transition: all 0.15s ease;

    &:hover {
      color: ${overlay.bright};
      background: ${overlay.surfaceBgHover};
    }
  `,
  periodButtonActive: css`
    color: ${overlay.bright};
    background: ${overlay.surfaceBgActive};
  `,
  // Grouped pill wrapper — replaces the gap-based row
  periodSelector: css`
    position: absolute;
    top: ${token.marginSM}px;
    right: ${token.marginSM}px;
    z-index: 10;
    display: flex;
    gap: 0;
    padding: 2px;
    background: ${overlay.surfaceBg};
    border: 1px solid ${overlay.surfaceBorder};
    border-radius: ${token.borderRadiusSM + 2}px;
  `,
  snapshotOverlay: css`
    position: fixed;
    inset: 0;
    z-index: 1000;
    overflow-y: auto;
    padding: ${token.paddingXL}px;
    background: rgb(0 0 0 / 80%);
    backdrop-filter: blur(8px);
  `,
  statPill: css`
    display: flex;
    gap: 5px;
    align-items: baseline;
    padding: ${token.paddingXXS}px ${token.paddingSM}px;
    font-family: ${token.fontFamilyCode};
    background: ${overlay.surfaceBg};
    border: 1px solid ${overlay.surfaceBorder};
    border-radius: ${token.borderRadiusSM}px;
  `,
  statPillLabel: css`
    font-size: 9px;
    color: ${overlay.faint};
    text-transform: uppercase;
    letter-spacing: 0.06em;
  `,
  statPillValue: css`
    font-size: 12px;
    font-weight: 600;
    color: ${overlay.bright};
  `,
  statsPanel: css`
    position: absolute;
    top: ${token.marginSM}px;
    left: ${token.marginSM}px;
    z-index: 10;
    display: flex;
    gap: ${token.sizeXXS}px;
    align-items: center;
  `,
  statusDot: css`
    display: inline-block;
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  `,
  statusDotPulse: css`
    display: inline-block;
    width: 6px;
    height: 6px;
    background: ${token.colorSuccess};
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  `,
}));
