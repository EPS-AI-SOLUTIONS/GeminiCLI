/**
 * useLlamaModels - Hook for managing llama.cpp models
 * @module hooks/useLlamaModels
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { LlamaService, type GGUFModelInfo, type RecommendedModel, type DownloadProgress } from '../services/tauri.service';
import { QUERY_KEYS, TAURI_EVENTS } from '../constants';

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
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

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

  // Listen for download progress events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<DownloadProgress>(TAURI_EVENTS.LLAMA_DOWNLOAD_PROGRESS, (event) => {
        setDownloadProgress(event.payload);
        if (event.payload.complete) {
          // Refresh models list after download completes
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LLAMA_MODELS] });
        }
      });
    };

    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, [queryClient]);

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

  // Mutation: Download model
  const downloadModelMutation = useMutation({
    mutationFn: ({ repoId, filename }: { repoId: string; filename: string }) =>
      LlamaService.downloadModel(repoId, filename),
    onMutate: () => {
      setDownloadProgress({
        filename: '',
        downloaded: 0,
        total: 0,
        speed_bps: 0,
        percentage: 0,
        complete: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LLAMA_MODELS] });
    },
    onSettled: () => {
      // Clear progress after a delay
      setTimeout(() => setDownloadProgress(null), 2000);
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
    [loadModelMutation]
  );

  const unloadModel = useCallback(async () => {
    await unloadModelMutation.mutateAsync();
  }, [unloadModelMutation]);

  const downloadModel = useCallback(
    async (repoId: string, filename: string) => {
      await downloadModelMutation.mutateAsync({ repoId, filename });
    },
    [downloadModelMutation]
  );

  const cancelDownload = useCallback(async () => {
    await LlamaService.cancelDownload();
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
    [currentModel, unloadModel, deleteModelMutation]
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
    isDownloading: downloadModelMutation.isPending,
    downloadProgress,
    downloadModel,
    cancelDownload,

    // Delete
    deleteModel,
    isDeletingModel: deleteModelMutation.isPending,
  };
};

export default useLlamaModels;
