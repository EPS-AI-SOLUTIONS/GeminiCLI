'use client';

/**
 * useLlamaModels - Hook for managing llama.cpp models
 * @module hooks/useLlamaModels
 *
 * Uses HTTP API via LlamaService.
 * Download progress is tracked via SSE callbacks.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QUERY_KEYS } from '../constants';
import {
  type DownloadProgress,
  type GGUFModelInfo,
  LlamaService,
  type RecommendedModel,
} from '../services';

export interface UseLlamaModelsReturn {
  // Available models
  models: GGUFModelInfo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Current model state
  currentModel: string | null;
  isModelLoaded: boolean;
  isLoadingModel: boolean;

  // Model operations
  loadModel: (modelPath: string, gpuLayers?: number) => Promise<void>;
  unloadModel: () => Promise<void>;

  // Download
  recommendedModels: RecommendedModel[];
  isDownloading: boolean;
  downloadProgress: DownloadProgress | null;
  downloadModel: (repoId: string, filename: string) => Promise<void>;
  cancelDownload: () => Promise<void>;

  // Delete
  deleteModel: (modelPath: string) => Promise<void>;
  isDeletingModel: boolean;
}

export const useLlamaModels = (): UseLlamaModelsReturn => {
  const queryClient = useQueryClient();

  // Local state
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const downloadControllerRef = useRef<AbortController | null>(null);

  // Query: List available models
  const {
    data: models = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.LLAMA_MODELS],
    queryFn: () => LlamaService.listModels(),
    staleTime: 30000, // 30 seconds
    retry: 2,
  });

  // Query: Recommended models
  const { data: recommendedModels = [] } = useQuery({
    queryKey: [QUERY_KEYS.RECOMMENDED_MODELS],
    queryFn: () => LlamaService.getRecommendedModels(),
    staleTime: 60000 * 60, // 1 hour
    retry: 1,
  });

  // Check current model on mount
  useEffect(() => {
    const checkCurrentModel = async () => {
      try {
        const loaded = await LlamaService.isModelLoaded();
        setIsModelLoaded(loaded);
        if (loaded) {
          const path = await LlamaService.getCurrentModel();
          setCurrentModel(path);
        }
      } catch (e) {
        console.error('Failed to check current model:', e);
      }
    };
    checkCurrentModel();
  }, []);

  // Mutation: Load model
  const loadModelMutation = useMutation({
    mutationFn: async ({ modelPath, gpuLayers }: { modelPath: string; gpuLayers?: number }) => {
      await LlamaService.loadModel(modelPath, gpuLayers);
      return modelPath;
    },
    onSuccess: (modelPath) => {
      setCurrentModel(modelPath);
      setIsModelLoaded(true);
    },
    onError: (error) => {
      console.error('Failed to load model:', error);
    },
  });

  // Mutation: Unload model
  const unloadModelMutation = useMutation({
    mutationFn: () => LlamaService.unloadModel(),
    onSuccess: () => {
      setCurrentModel(null);
      setIsModelLoaded(false);
    },
  });

  // Mutation: Delete model
  const deleteModelMutation = useMutation({
    mutationFn: (modelPath: string) => LlamaService.deleteModel(modelPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LLAMA_MODELS] });
    },
  });

  // Callbacks
  const loadModel = useCallback(
    async (modelPath: string, gpuLayers?: number) => {
      await loadModelMutation.mutateAsync({ modelPath, gpuLayers });
    },
    [loadModelMutation],
  );

  const unloadModel = useCallback(async () => {
    await unloadModelMutation.mutateAsync();
  }, [unloadModelMutation]);

  // Download model via SSE with progress callbacks
  const downloadModel = useCallback(
    async (repoId: string, filename: string) => {
      setIsDownloading(true);
      setDownloadProgress({
        filename,
        downloaded: 0,
        total: 0,
        percentage: 0,
        complete: false,
      });

      downloadControllerRef.current = LlamaService.downloadModel(repoId, filename, {
        onProgress: (progress) => {
          setDownloadProgress(progress);
          if (progress.complete) {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LLAMA_MODELS] });
            setIsDownloading(false);
            setTimeout(() => setDownloadProgress(null), 2000);
          }
        },
        onDone: () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LLAMA_MODELS] });
          setIsDownloading(false);
          setTimeout(() => setDownloadProgress(null), 2000);
        },
        onError: (err) => {
          console.error('Download error:', err);
          setIsDownloading(false);
          setDownloadProgress(null);
        },
      });
    },
    [queryClient],
  );

  const cancelDownload = useCallback(async () => {
    if (downloadControllerRef.current) {
      downloadControllerRef.current.abort();
      downloadControllerRef.current = null;
    }
    setIsDownloading(false);
    setDownloadProgress(null);
  }, []);

  const deleteModel = useCallback(
    async (modelPath: string) => {
      // Unload if this is the current model
      if (currentModel === modelPath) {
        await unloadModel();
      }
      await deleteModelMutation.mutateAsync(modelPath);
    },
    [currentModel, unloadModel, deleteModelMutation],
  );

  return {
    // Available models
    models,
    isLoading,
    error: error as Error | null,
    refetch,

    // Current model state
    currentModel,
    isModelLoaded,
    isLoadingModel: loadModelMutation.isPending,

    // Model operations
    loadModel,
    unloadModel,

    // Download
    recommendedModels,
    isDownloading,
    downloadProgress,
    downloadModel,
    cancelDownload,

    // Delete
    deleteModel,
    isDeletingModel: deleteModelMutation.isPending,
  };
};

export default useLlamaModels;
