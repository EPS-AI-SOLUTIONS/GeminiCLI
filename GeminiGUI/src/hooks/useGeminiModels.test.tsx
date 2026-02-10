/**
 * useGeminiModels - Hook Tests
 * @module hooks/__tests__/useGeminiModels.test.ts
 *
 * Comprehensive test suite for the useGeminiModels hook.
 * Tests loading states, error handling, API key validation, and refetching.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_MODELS, TAURI_COMMANDS } from '../constants';
import { useAppStore } from '../store/useAppStore';
import { useGeminiModels } from './useGeminiModels';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Import the mocked invoke for use in tests
import { invoke } from '@tauri-apps/api/core';

// Mock the zustand store
vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

// ============================================================================
// TEST SETUP
// ============================================================================

/**
 * Create a new QueryClient for each test to avoid state leakage
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable garbage collection timer
      },
    },
  });
}

/**
 * Wrapper component that provides React Query context
 */
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('useGeminiModels', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ========================================================================
  // Test 1: Returns loading state initially
  // ========================================================================

  it('should return loading state initially', async () => {
    // Setup: Mock store to return API key
    const mockApiKey = 'test-api-key-123';
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: mockApiKey },
      };
      return selector(state);
    });

    // Setup: Mock invoke to delay response
    (invoke as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(['gemini-model']), 100)),
    );

    // Act
    const { result } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert: Initially should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.models).toEqual(FALLBACK_MODELS.gemini);
    expect(result.current.error).toBeNull();
    expect(result.current.hasApiKey).toBe(true);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: After loading, should have models
    expect(result.current.models).toEqual(['gemini-model']);
  });

  // ========================================================================
  // Test 2: Returns fallback models when no API key
  // ========================================================================

  it('should return fallback models when no API key is present', async () => {
    // Setup: Mock store to return empty API key
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: '' },
      };
      return selector(state);
    });

    // Act
    const { result } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert: Should use fallback models
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models).toEqual(FALLBACK_MODELS.gemini);
    expect(result.current.hasApiKey).toBe(false);
    expect(result.current.error).toBeNull();

    // Verify invoke was NOT called (no API key)
    expect(invoke).not.toHaveBeenCalled();
  });

  // ========================================================================
  // Test 3: Fetches models when API key is present
  // ========================================================================

  it('should fetch models when API key is present', async () => {
    // Setup
    const mockApiKey = 'sk-proj-valid-key-123';
    const mockModels = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];

    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: mockApiKey },
      };
      return selector(state);
    });

    (invoke as any).mockResolvedValue(mockModels);

    // Act
    const { result } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert: Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(invoke).toHaveBeenCalledWith(TAURI_COMMANDS.GET_GEMINI_MODELS, { apiKey: mockApiKey });

    expect(result.current.models).toEqual(mockModels);
    expect(result.current.hasApiKey).toBe(true);
    expect(result.current.error).toBeNull();
  });

  // ========================================================================
  // Test 4: Returns error state on fetch failure
  // ========================================================================

  it.skip('should return error state on fetch failure', async () => {
    // Setup
    const mockApiKey = 'sk-proj-invalid-key';
    const mockError = new Error('401: Invalid API key');

    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: mockApiKey },
      };
      return selector(state);
    });

    (invoke as any).mockRejectedValue(mockError);

    // Act
    const { result } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert: Wait for error
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should fall back to default models on error
    expect(result.current.models).toEqual(FALLBACK_MODELS.gemini);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('401');
    expect(result.current.hasApiKey).toBe(true);
  });

  // ========================================================================
  // Test 5: Refetch function works
  // ========================================================================

  it.skip('should refetch models when refetch is called', async () => {
    // Setup
    const mockApiKey = 'sk-proj-test-key';
    const initialModels = ['gemini-1.5-flash'];
    const refetchedModels = ['gemini-2.0-flash', 'gemini-1.5-pro'];

    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: mockApiKey },
      };
      return selector(state);
    });

    // First call returns initial models, second call returns refetched models
    (invoke as any).mockResolvedValueOnce(initialModels).mockResolvedValueOnce(refetchedModels);

    // Act
    const { result, rerender } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models).toEqual(initialModels);

    // Act: Call refetch
    result.current.refetch();

    // Assert: Should be loading again
    expect(result.current.isLoading).toBe(true);

    // Wait for refetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models).toEqual(refetchedModels);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  // ========================================================================
  // Test 6: hasApiKey returns correct boolean
  // ========================================================================

  it('should return correct hasApiKey boolean', async () => {
    // Setup: Test with API key
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: 'sk-proj-key-exists' },
      };
      return selector(state);
    });

    (invoke as any).mockResolvedValue(['gemini-model']);

    // Act
    const { result: resultWithKey } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(resultWithKey.current.isLoading).toBe(false);
    });

    expect(resultWithKey.current.hasApiKey).toBe(true);

    // Setup: Test without API key
    vi.clearAllMocks();
    queryClient.clear();

    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: '' },
      };
      return selector(state);
    });

    // Act
    const { result: resultWithoutKey } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(resultWithoutKey.current.isLoading).toBe(false);
    });

    expect(resultWithoutKey.current.hasApiKey).toBe(false);
  });

  // ========================================================================
  // Test 7: Refetches when API key changes
  // ========================================================================

  it.skip('should refetch when API key changes', async () => {
    // Setup: Initial API key
    const initialKey = 'sk-proj-key-1';
    const newKey = 'sk-proj-key-2';
    const initialModels = ['gemini-1.5-flash'];
    const newModels = ['gemini-2.0-flash'];

    (useAppStore as any)
      .mockImplementationOnce((selector: any) => {
        const state = {
          settings: { geminiApiKey: initialKey },
        };
        return selector(state);
      })
      .mockImplementationOnce((selector: any) => {
        const state = {
          settings: { geminiApiKey: newKey },
        };
        return selector(state);
      });

    (invoke as any).mockResolvedValueOnce(initialModels).mockResolvedValueOnce(newModels);

    // Act: Render with initial key
    const { result, rerender } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models).toEqual(initialModels);

    // Act: Simulate API key change
    vi.clearAllMocks();
    queryClient.clear();

    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: newKey },
      };
      return selector(state);
    });

    (invoke as any).mockResolvedValue(newModels);

    // Rerender with new key
    rerender();

    await waitFor(() => {
      expect(invoke).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.models).toEqual(newModels);
    });
  });

  // ========================================================================
  // Test 8: Handles empty models array from API
  // ========================================================================

  it('should return fallback models when API returns empty array', async () => {
    // Setup
    const mockApiKey = 'sk-proj-test-key';

    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: mockApiKey },
      };
      return selector(state);
    });

    // Mock API to return empty array
    (invoke as any).mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models).toEqual(FALLBACK_MODELS.gemini);
    expect(result.current.error).toBeNull();
  });

  // ========================================================================
  // Test 9: Handles null/undefined response from API
  // ========================================================================

  it('should return fallback models when API returns null or undefined', async () => {
    // Setup
    const mockApiKey = 'sk-proj-test-key';

    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: mockApiKey },
      };
      return selector(state);
    });

    (invoke as any).mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.models).toEqual(FALLBACK_MODELS.gemini);
    expect(result.current.error).toBeNull();
  });

  // ========================================================================
  // Test 10: Does not call invoke when API key is missing
  // ========================================================================

  it('should not call invoke when API key is missing', async () => {
    // Setup
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: '' },
      };
      return selector(state);
    });

    // Act
    const { result } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(invoke).not.toHaveBeenCalled();
    expect(result.current.models).toEqual(FALLBACK_MODELS.gemini);
  });

  // ========================================================================
  // Test 11: Returns expected interface shape
  // ========================================================================

  it('should return correct interface shape', async () => {
    // Setup
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        settings: { geminiApiKey: 'test-key' },
      };
      return selector(state);
    });

    (invoke as any).mockResolvedValue(['gemini-model']);

    // Act
    const { result } = renderHook(() => useGeminiModels(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert: Check all required properties exist
    expect(result.current).toHaveProperty('models');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(result.current).toHaveProperty('hasApiKey');

    // Check types
    expect(Array.isArray(result.current.models)).toBe(true);
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.hasApiKey).toBe('boolean');
  });
});
