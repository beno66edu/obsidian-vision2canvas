import { App, PluginSettingTab, Setting } from 'obsidian';
import Vision2CanvasPlugin from './main';
import { defaultConnection, ProviderId, providerName, PROVIDERS } from './ai/providers';
import type { LanguagePreference } from './i18n';

export class Vision2CanvasSettingTab extends PluginSettingTab {
  plugin: Vision2CanvasPlugin;

  constructor(app: App, plugin: Vision2CanvasPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const t = this.plugin.t;
    const settings = this.plugin.settings;

    new Setting(containerEl)
      .setName(t('settings.language.name'))
      .addDropdown(dropdown => dropdown
        .addOption('auto', t('settings.language.auto'))
        .addOption('en', 'English')
        .addOption('pt-BR', 'Português (Brasil)')
        .addOption('zh-TW', '繁體中文')
        .setValue(settings.language)
        .onChange(value => {
          const saved = this.plugin.setLanguage(value as LanguagePreference);
          this.display();
          return saved;
        }));

    new Setting(containerEl)
      .setName(t('settings.providers.heading'))
      .setHeading();

    const provider = settings.aiProvider;
    const preset = PROVIDERS[provider];
    const connection = settings.connections[provider] ??= defaultConnection(provider);
    const customEndpoint = provider === 'local' || provider === 'remote';

    new Setting(containerEl)
      .setName(t('settings.connection.name'))
      .setDesc(t('settings.connection.description'))
      .addDropdown(dropdown => {
        for (const [id, option] of Object.entries(PROVIDERS)) {
          dropdown.addOption(id, providerName(option, t));
        }
        dropdown.setValue(provider).onChange(async value => {
          settings.aiProvider = value as ProviderId;
          this.display();
          await this.plugin.saveSettings();
        });
      });

    if (customEndpoint) {
      new Setting(containerEl)
        .setName(t('settings.endpoint.name'))
        .setDesc(t('settings.endpoint.description'))
        .addText(text => text
          .setPlaceholder(preset.endpoint || 'https://example.com/v1')
          .setValue(connection.apiEndpoint)
          .onChange(async value => {
            connection.apiEndpoint = value.trim();
            await this.plugin.saveSettings();
          }));
    }

    new Setting(containerEl)
      .setName(t('settings.apiKey.name'))
      .setDesc(customEndpoint ? t('settings.apiKey.optionalDescription') : t('settings.apiKey.providerDescription', { provider: providerName(preset, t) }))
      .addText(text => {
        text.inputEl.type = 'password';
        text.setValue(connection.apiKey).onChange(async value => {
          connection.apiKey = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('settings.model.name'))
      .setDesc(t('settings.model.description'))
      .addText(text => text
        .setPlaceholder(preset.model || t('settings.model.placeholder'))
        .setValue(connection.modelName)
        .onChange(async value => {
          connection.modelName = value.trim();
          await this.plugin.saveSettings();
        }));

    // Output Folder
    new Setting(containerEl)
      .setName(t('settings.outputFolder.name'))
      .setDesc(t('settings.outputFolder.description'))
      .addText(text => text
        .setPlaceholder(t('settings.outputFolder.placeholder'))
        .setValue(this.plugin.settings.outputFolder)
        .onChange(async (value) => {
          this.plugin.settings.outputFolder = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.openCanvas.name'))
      .setDesc(t('settings.openCanvas.description'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoOpenCanvas)
        .onChange(async (value) => {
          this.plugin.settings.autoOpenCanvas = value;
          await this.plugin.saveSettings();
        }));

    // Layout Customization
    new Setting(containerEl)
      .setName(t('settings.layout.heading'))
      .setHeading();

    new Setting(containerEl)
      .setName(t('settings.prompt.name'))
      .setDesc(t('settings.prompt.description'))
      .addTextArea(text => text
        .setPlaceholder(t('settings.prompt.placeholder'))
        .setValue(this.plugin.settings.customPrompt)
        .onChange(async (value) => {
          this.plugin.settings.customPrompt = value;
          await this.plugin.saveSettings();
        }));
  }
}
