export interface LLMConfig {
  provider: 'gemini' | 'azure-openai';
  apiKey: string;
  model: string;
  endpoint?: string; // For Azure OpenAI
  deploymentName?: string; // For Azure OpenAI
}

export interface LLMSettings {
  currentProvider: 'gemini' | 'azure-openai';
  gemini: {
    apiKey: string;
    model: string;
  };
  azureOpenAI: {
    apiKey: string;
    endpoint: string;
    deploymentName: string;
    model: string;
  };
}

const DEFAULT_SETTINGS: LLMSettings = {
  currentProvider: 'gemini',
  gemini: {
    apiKey: '',
    model: 'gemini-1.5-flash'
  },
  azureOpenAI: {
    apiKey: '',
    endpoint: '',
    deploymentName: '',
    model: 'gpt-4o'
  }
};

const STORAGE_KEY = 'toeic-llm-settings';

export class LLMConfigManager {
  private settings: LLMSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): LLMSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load LLM settings from localStorage:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save LLM settings to localStorage:', error);
    }
  }

  getSettings(): LLMSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<LLMSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  setCurrentProvider(provider: 'gemini' | 'azure-openai'): void {
    this.settings.currentProvider = provider;
    this.saveSettings();
  }

  getCurrentConfig(): LLMConfig {
    const { currentProvider } = this.settings;
    
    if (currentProvider === 'gemini') {
      return {
        provider: 'gemini',
        apiKey: this.settings.gemini.apiKey,
        model: this.settings.gemini.model
      };
    } else {
      return {
        provider: 'azure-openai',
        apiKey: this.settings.azureOpenAI.apiKey,
        model: this.settings.azureOpenAI.model,
        endpoint: this.settings.azureOpenAI.endpoint,
        deploymentName: this.settings.azureOpenAI.deploymentName
      };
    }
  }

  isConfigured(): boolean {
    const config = this.getCurrentConfig();
    
    if (config.provider === 'gemini') {
      return !!config.apiKey;
    } else {
      return !!(config.apiKey && config.endpoint && config.deploymentName);
    }
  }

  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }
}

// Singleton instance
export const llmConfigManager = new LLMConfigManager();
