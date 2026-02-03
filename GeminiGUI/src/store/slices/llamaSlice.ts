/**
 * llamaSlice - Zustand slice for llama.cpp state management
 * @module store/slices/llamaSlice
 */

import type { StateCreator } from 'zustand';
import { LlamaService, type GGUFModelInfo, type RecommendedModel } from '../../services/tauri.service';

export interface LlamaState {
  // Model state
  availableModels: GGUFModelInfo[];
  recommendedModels: RecommendedModel[];
  currentModel: string | null;
  isModelLoaded: boolean;

  // Loading states
  isLoadingModels: boolean;
  isLoadingModel: boolean;
  isDownloading: boolean;

  // Download progress
  downloadProgress: {
    filename: string;
    downloaded: number;
    total: number;
    percentage: number;
    speed_bps: number;
  } | null;

  // Error state
  error: string | null;
}

export interface LlamaActions {
  // Initialization
  initializeLlama: () => Promise<void>;

  // Model list operations
  fetchModels: () => Promise<void>;
  fetchRecommendedModels: () => Promise<void>;

  // Model operations
  loadModel: (modelPath: string, gpuLayers?: number) => Promise<void>;
  unloadModel: () => Promise<void>;

  // Download operations
  downloadModel: (repoId: string, filename: string) => Promise<void>;
  cancelDownload: () => Promise<void>;
  setDownloadProgress: (progress: LlamaState['downloadProgress']) => void;

  // Delete
  deleteModel: (modelPath: string) => Promise<void>;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type LlamaSlice = LlamaState & LlamaActions;

const initialState: LlamaState = {
  availableModels: [],
  recommendedModels: [],
  currentModel: null,
  isModelLoaded: false,
  isLoadingModels: false,
  isLoadingModel: false,
  isDownloading: false,
  downloadProgress: null,
  error: null,
};

export const createLlamaSlice: StateCreator<LlamaSlice, [], [], LlamaSlice> = (set, get) => ({
  ...initialState,

  initializeLlama: async () => {
    try {
      await LlamaService.initialize();
      // Check if a model is already loaded
      const isLoaded = await LlamaService.isModelLoaded();
      if (isLoaded) {
        const currentModel = await LlamaService.getCurrentModel();
        set({ isModelLoaded: true, currentModel });
      }
      // Fetch available models
      await get().fetchModels();
      await get().fetchRecommendedModels();
    } catch (error) {
      console.error('Failed to initialize llama.cpp:', error);
      set({ error: error instanceof Error ? error.message : String(error) });
    }
  },

  fetchModels: async () => {
    set({ isLoadingModels: true, error: null });
    try {
      const models = await LlamaService.listModels();
      set({ availableModels: models, isLoadingModels: false });
    } catch (error) {
      console.error('Failed to fetch models:', error);
      set({
        isLoadingModels: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  fetchRecommendedModels: async () => {
    try {
      const models = await LlamaService.getRecommendedModels();
      set({ recommendedModels: models });
    } catch (error) {
      console.error('Failed to fetch recommended models:', error);
    }
  },

  loadModel: async (modelPath: string, gpuLayers?: number) => {
    set({ isLoadingModel: true, error: null });
    try {
      await LlamaService.loadModel(modelPath, gpuLayers);
      set({
        currentModel: modelPath,
        isModelLoaded: true,
        isLoadingModel: false,
      });
    } catch (error) {
      console.error('Failed to load model:', error);
      set({
        isLoadingModel: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  unloadModel: async () => {
    try {
      await LlamaService.unloadModel();
      set({ currentModel: null, isModelLoaded: false });
    } catch (error) {
      console.error('Failed to unload model:', error);
      set({ error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  downloadModel: async (repoId: string, filename: string) => {
    set({
      isDownloading: true,
      error: null,
      downloadProgress: {
        filename,
        downloaded: 0,
        total: 0,
        percentage: 0,
        speed_bps: 0,
      },
    });
    try {
      await LlamaService.downloadModel(repoId, filename);
      // Refresh model list after download
      await get().fetchModels();
      set({ isDownloading: false, downloadProgress: null });
    } catch (error) {
      console.error('Failed to download model:', error);
      set({
        isDownloading: false,
        downloadProgress: null,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  cancelDownload: async () => {
    try {
      await LlamaService.cancelDownload();
      set({ isDownloading: false, downloadProgress: null });
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  },

  setDownloadProgress: (progress) => {
    set({ downloadProgress: progress });
  },

  deleteModel: async (modelPath: string) => {
    const { currentModel } = get();

    try {
      // Unload if this is the current model
      if (currentModel === modelPath) {
        await get().unloadModel();
      }

      await LlamaService.deleteModel(modelPath);

      // Refresh model list
      await get().fetchModels();
    } catch (error) {
      console.error('Failed to delete model:', error);
      set({ error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
});

export default createLlamaSlice;
