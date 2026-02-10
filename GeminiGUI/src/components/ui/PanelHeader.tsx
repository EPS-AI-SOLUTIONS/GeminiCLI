import type { LucideIcon } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

interface PanelHeaderProps {
  icon?: LucideIcon;
  title: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  children?: ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  icon: Icon,
  title,
  onRefresh,
  isLoading = false,
  children,
}) => {
  return (
    <div className="flex justify-between items-center text-[var(--matrix-text-dim)] border-b border-[var(--matrix-border)] pb-2">
      <span className="flex items-center gap-2 font-semibold text-sm">
        {Icon && <Icon size={16} />}
        {title}
      </span>
      <div className="flex items-center gap-2">
        {children}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={`hover:text-[var(--matrix-accent)] transition-colors ${isLoading ? 'animate-spin' : ''}`}
            title="Odswiez"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
