'use client';

/**
 * ClaudeHydra - ModelSelector Component
 * @module components/chat/ModelSelector
 *
 * Dropdown for selecting AI model.
 */

import { memo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ModelSelectorProps {
  models: string[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  isLoading: boolean;
  hasError: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ModelSelector = memo<ModelSelectorProps>(
  ({ models, selectedModel, onSelectModel, isLoading, hasError }) => {
    return (
      <select
        value={selectedModel}
        onChange={(e) => onSelectModel(e.target.value)}
        className="matrix-input rounded px-2 py-2 text-sm max-w-[120px] truncate transition-colors duration-300"
        disabled={isLoading || hasError}
      >
        {isLoading && <option>...</option>}
        {hasError && <option>Offline</option>}
        {!isLoading &&
          !hasError &&
          models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
      </select>
    );
  },
);

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
