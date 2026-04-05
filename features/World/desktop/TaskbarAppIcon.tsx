'use client';

import { memo, useState } from 'react';
import type { WindowId } from './desktopTypes';

interface TaskbarAppIconProps {
  id: WindowId;
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isMinimized: boolean;
  onClick: () => void;
}

export const TaskbarAppIcon = memo<TaskbarAppIconProps>(({
  id,
  label,
  icon,
  isOpen,
  isMinimized,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-app-id={id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      type="button"
      style={{
        position: 'relative',
        width: 40,
        height: 40,
        borderRadius: 8,
        border: 'none',
        background: hovered
          ? 'rgba(255, 255, 255, 0.10)'
          : isOpen
          ? 'rgba(255, 255, 255, 0.06)'
          : 'transparent',
        color: isOpen ? '#e2e8f0' : '#94a3b8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 150ms, color 150ms, transform 100ms',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      {icon}

      {/* Active indicator dot */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: 2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: isMinimized ? 4 : 16,
          height: 3,
          borderRadius: 2,
          background: isMinimized ? '#64748b' : '#60a5fa',
          transition: 'width 200ms, background 200ms',
        }} />
      )}
    </button>
  );
});

TaskbarAppIcon.displayName = 'TaskbarAppIcon';
