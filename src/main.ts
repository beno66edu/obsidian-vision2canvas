import { Notice, Platform, Plugin, setTooltip, TFile } from 'obsidian';
import { Vision2CanvasSettings, readSettings } from './types';
import { Vision2CanvasSettingTab } from './settings';
import { VisionClient } from './ai/visionClient';
import { CanvasBuilder } from './canvas/canvasBuilder';
import { CanvasValidator } from './canvas/canvasValidator';
import { FileUtils } from './utils/fileUtils';
import { ImageUtils } from './utils/imageUtils';
import { resolveLanguage, translate, type LanguagePreference, type Locale, type Translator } from './i18n';

const CLIPBOARD_COMMAND_ID = 'convert-clipboard-image-to-canvas';

export default class Vision2CanvasPlugin extends Plugin {
  declare settings: Vision2CanvasSettings;
  private statusBarItem?: HTMLElement;
  private clipboardRibbon?: HTMLElement;
  private locale: Locale = 'en';
  readonly t: Translator = (key, params) => translate(this.locale, key, params);

  async onload() {
    await this.loadSettings();

    if (!Platform.isMobile) {
      this.statusBarItem = this.addStatusBarItem();
      this.statusBarItem.addClass('vision2canvas-status');
    }

    // 1. Register Setting Tab
    this.addSettingTab(new Vision2CanvasSettingTab(this.app, this));

    this.clipboardRibbon = this.addRibbonIcon('layout-dashboard', this.t('commands.convertClipboard'), () => {
      void this.convertClipboardImage();
    });

    this.registerClipboardCommand();

    // 4. Right-click context menu on image files in File Explorer
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && this.isImageFile(file)) {
          menu.addItem((item) => {
            item
              .setTitle(this.t('menu.convertImage'))
              .setIcon('layout-dashboard')
              .onClick(() => {
                void this.convertVaultImage(file);
              });
          });
        }
      })
    );
  }

  onunload() {
    // Plugin unloaded
  }

  public async loadSettings() {
    const saved = await this.loadData();
    this.settings = readSettings(saved);
    this.locale = resolveLanguage(this.settings.language);
    if (saved?.language !== this.settings.language) await this.saveSettings();
  }

  public async saveSettings() {
    await this.saveData(this.settings);
  }

  private registerClipboardCommand() {
    this.addCommand({
      id: CLIPBOARD_COMMAND_ID,
      name: this.t('commands.convertClipboard'),
      callback: () => { void this.convertClipboardImage(); }
    });
  }

  public async setLanguage(preference: LanguagePreference) {
    this.settings.language = preference;
    const locale = resolveLanguage(preference);
    if (this.locale !== locale) {
      this.locale = locale;
      if (typeof this.removeCommand === 'function') {
        this.removeCommand(CLIPBOARD_COMMAND_ID);
        this.registerClipboardCommand();
      }
      if (this.clipboardRibbon) {
        const label = this.t('commands.convertClipboard');
        this.clipboardRibbon.setAttribute('aria-label', label);
        if (typeof setTooltip === 'function') {
          setTooltip(this.clipboardRibbon, label, { placement: 'right' });
        } else {
          this.clipboardRibbon.title = label;
        }
      }
    }
    await this.saveSettings();
  }

  private isImageFile(file: TFile): boolean {
    const ext = file.extension.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext);
  }

  /**
   * Reads an image file from the Vault and converts it to .canvas
   */
  public convertVaultImage(file: TFile) {
    return this.runConversion(file.name, async (client) => {
      const arrayBuffer = await this.app.vault.readBinary(file);
      const base64Str = ImageUtils.arrayBufferToBase64(arrayBuffer);
      const mimeType = ImageUtils.getMimeType(file.path);

      return this.processImageBase64(base64Str, mimeType, file.basename, client);
    });
  }

  /**
   * Reads image from system clipboard and converts it to .canvas
   */
  public convertClipboardImage() {
    return this.runConversion(null, async (client) => {
      // Use standard Web Clipboard API
      const clipboardItems = await navigator.clipboard.read();
      let imageBlob: Blob | null = null;
      let mimeType = 'image/png';

      for (const item of clipboardItems) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) {
          imageBlob = await item.getType(type);
          mimeType = type;
          break;
        }
      }

      if (!imageBlob) {
        throw new Error(this.t('errors.clipboardEmpty'));
      }

      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64Str = ImageUtils.arrayBufferToBase64(arrayBuffer);

      return this.processImageBase64(base64Str, mimeType, 'ClipboardNote', client);
    });
  }

  private async runConversion(filename: string | null, convert: (client: VisionClient) => Promise<TFile>): Promise<void> {
    const source = () => filename ?? this.t('source.clipboardImage');
    const label = this.t('status.converting', { source: source() });
    const spinner = this.statusBarItem?.createSpan({
      cls: 'vision2canvas-progress-spinner',
      attr: { role: 'progressbar', 'aria-label': label, title: label }
    });

    let createdFile: TFile | undefined;
    try {
      createdFile = await convert(new VisionClient(this.settings, this.t));
      if (this.settings.autoOpenCanvas) {
        await this.app.workspace.getLeaf(true).openFile(createdFile);
      }
      new Notice(this.t('notice.canvasCreated', { filename: createdFile.name }));
    } catch (err: unknown) {
      const reason = (err instanceof Error ? err.message : String(err ?? '')) || this.t('errors.unknown');
      const message = createdFile
        ? this.t('notice.openFailed', { filename: createdFile.name, reason })
        : this.t('notice.conversionFailed', { source: source(), reason });
      new Notice(message);
    } finally {
      spinner?.remove();
    }
  }

  /**
   * Core conversion pipeline: Base64 -> Image Compression -> Vision AI -> Canvas Data -> Vault .canvas File
   */
  private async processImageBase64(
    base64Str: string,
    mimeType: string,
    titlePrefix: string,
    visionClient: VisionClient
  ): Promise<TFile> {
    const optimized = await ImageUtils.compressImageBase64(base64Str, mimeType);

    const aiResult = await visionClient.analyzeImage(optimized.base64, optimized.mimeType);

    const canvasBuilder = new CanvasBuilder(this.settings);
    const canvasData = canvasBuilder.buildCanvasData(aiResult);

    const validation = CanvasValidator.validate(canvasData, this.t);
    if (!validation.valid) {
      throw new Error(this.t('errors.invalidCanvas', { details: validation.errors.join(', ') }));
    }

    const canvasJsonStr = JSON.stringify(canvasData, null, 2);
    const filename = FileUtils.generateCanvasFilename(aiResult.title || titlePrefix);

    return FileUtils.saveCanvasToVault(
      this.app,
      this.settings.outputFolder,
      filename,
      canvasJsonStr
    );
  }
}
