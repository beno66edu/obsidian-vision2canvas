import { App, PluginSettingTab, Setting } from 'obsidian';
import Vision2CanvasPlugin from './main';
import { DEFAULT_VISION_SYSTEM_PROMPT } from './ai/promptTemplates';

export class Vision2CanvasSettingTab extends PluginSettingTab {
  plugin: Vision2CanvasPlugin;

  constructor(app: App, plugin: Vision2CanvasPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('AI Provider')
      .setHeading();

    // AI Gateway Endpoint
    new Setting(containerEl)
      .setName('AI API Endpoint')
      .setDesc('URL of your OpenAI-compatible API Gateway, Google AI Studio, or MLLM server.')
      .addText(text => text
        .setPlaceholder('https://generativelanguage.googleapis.com/v1beta/openai')
        .setValue(this.plugin.settings.apiEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.apiEndpoint = value.trim();
          await this.plugin.saveSettings();
        }));

    // API Key
    new Setting(containerEl)
      .setName('API Key')
      .setDesc('API Key for authenticating with your AI gateway or Google AI Studio.')
      .addText(text => text
        .setPlaceholder('API Key...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value.trim();
          await this.plugin.saveSettings();
        }));

    // Model Name
    new Setting(containerEl)
      .setName('Vision Model Name')
      .setDesc('Name of the Vision MLLM model to use (e.g. gemini-flash-latest, gpt-4o, claude-3-5-sonnet).')
      .addText(text => text
        .setPlaceholder('gemini-flash-latest')
        .setValue(this.plugin.settings.modelName)
        .onChange(async (value) => {
          this.plugin.settings.modelName = value.trim();
          await this.plugin.saveSettings();
        }));

    // Output Folder
    new Setting(containerEl)
      .setName('Canvas Output Folder')
      .setDesc('Folder in your vault where generated .canvas files will be saved (leave empty for Vault root).')
      .addText(text => text
        .setPlaceholder('Canvases/Handwritten')
        .setValue(this.plugin.settings.outputFolder)
        .onChange(async (value) => {
          this.plugin.settings.outputFolder = value.trim();
          await this.plugin.saveSettings();
        }));

    // Layout Customization
    new Setting(containerEl)
      .setName('Canvas Layout & Prompt')
      .setHeading();

    new Setting(containerEl)
      .setName('Auto-Open Canvas After Creation')
      .setDesc('Automatically open the newly generated .canvas file in obsidian.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoOpenCanvas)
        .onChange(async (value) => {
          this.plugin.settings.autoOpenCanvas = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Custom System Prompt')
      .setDesc('Override default System Prompt for Vision AI model.')
      .addTextArea(text => text
        .setPlaceholder(DEFAULT_VISION_SYSTEM_PROMPT)
        .setValue(this.plugin.settings.customPrompt)
        .onChange(async (value) => {
          this.plugin.settings.customPrompt = value;
          await this.plugin.saveSettings();
        }));
  }
}
