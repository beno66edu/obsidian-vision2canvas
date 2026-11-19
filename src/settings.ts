import { App, PluginSettingTab, Setting } from 'obsidian';
import Vision2CanvasPlugin from './main';
import { defaultConnection, ProviderId, PROVIDERS } from './ai/providers';
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

    const settings = this.plugin.settings;
    const provider = settings.aiProvider;
    const preset = PROVIDERS[provider];
    const connection = settings.connections[provider] ??= defaultConnection(provider);
    const customEndpoint = provider === 'local' || provider === 'remote';

    new Setting(containerEl)
      .setName('Connection Type')
      .setDesc('Choose the provider that will analyze your images.')
      .addDropdown(dropdown => {
        for (const [id, { name }] of Object.entries(PROVIDERS)) {
          dropdown.addOption(id, name);
        }
        dropdown.setValue(provider).onChange(async value => {
          settings.aiProvider = value as ProviderId;
          this.display();
          await this.plugin.saveSettings();
        });
      });

    if (customEndpoint) {
      new Setting(containerEl)
        .setName('AI API Endpoint')
        .setDesc('Base URL of your server, including its API version.')
        .addText(text => text
          .setPlaceholder(preset.endpoint || 'https://example.com/v1')
          .setValue(connection.apiEndpoint)
          .onChange(async value => {
            connection.apiEndpoint = value.trim();
            await this.plugin.saveSettings();
          }));
    }

    new Setting(containerEl)
      .setName('API Key')
      .setDesc(customEndpoint ? 'Enter a key if your server requires one.' : `Enter your ${preset.name} API key.`)
      .addText(text => {
        text.inputEl.type = 'password';
        text.setValue(connection.apiKey).onChange(async value => {
          connection.apiKey = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Vision Model Name')
      .setDesc('Choose a model that accepts images.')
      .addText(text => text
        .setPlaceholder(preset.model || 'Vision model ID')
        .setValue(connection.modelName)
        .onChange(async value => {
          connection.modelName = value.trim();
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

    new Setting(containerEl)
      .setName('Open Canvas After Conversion')
      .setDesc('When enabled, open the generated Canvas in a new tab. When disabled, save it to the output folder and show the completion notice.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoOpenCanvas)
        .onChange(async (value) => {
          this.plugin.settings.autoOpenCanvas = value;
          await this.plugin.saveSettings();
        }));

    // Layout Customization
    new Setting(containerEl)
      .setName('Canvas Layout & Prompt')
      .setHeading();

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
