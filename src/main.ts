import { Notice, Platform, Plugin, TFile } from 'obsidian';
import { Vision2CanvasSettings, DEFAULT_SETTINGS } from './types';
import { Vision2CanvasSettingTab } from './settings';
import { VisionClient } from './ai/visionClient';
import { CanvasBuilder } from './canvas/canvasBuilder';
import { CanvasValidator } from './canvas/canvasValidator';
import { FileUtils } from './utils/fileUtils';
import { ImageUtils } from './utils/imageUtils';

export default class Vision2CanvasPlugin extends Plugin {
  declare settings: Vision2CanvasSettings;
  private statusBarItem?: HTMLElement;

  async onload() {
    await this.loadSettings();

    if (!Platform.isMobile) {
      this.statusBarItem = this.addStatusBarItem();
      this.statusBarItem.addClass('vision2canvas-status');
    }

    // 1. Register Setting Tab
    this.addSettingTab(new Vision2CanvasSettingTab(this.app, this));

    // 2. Ribbon Icon for quick action
    this.addRibbonIcon('layout-dashboard', 'Convert Clipboard Image to Canvas', () => {
      void this.convertClipboardImage();
    });

    // 3. Command: Convert Clipboard Image
    this.addCommand({
      id: 'convert-clipboard-image-to-canvas',
      name: 'Convert Clipboard Image to Canvas',
      callback: () => {
        void this.convertClipboardImage();
      }
    });

    // 4. Right-click context menu on image files in File Explorer
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && this.isImageFile(file)) {
          menu.addItem((item) => {
            item
              .setTitle('Convert to Obsidian Canvas Whiteboard')
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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<Vision2CanvasSettings>);
  }

  public async saveSettings() {
    await this.saveData(this.settings);
  }

  private isImageFile(file: TFile): boolean {
    const ext = file.extension.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext);
  }

  /**
   * Reads an image file from the Vault and converts it to .canvas
   */
  public convertVaultImage(file: TFile) {
    return this.runConversion(file.name, async () => {
      const arrayBuffer = await this.app.vault.readBinary(file);
      const base64Str = ImageUtils.arrayBufferToBase64(arrayBuffer);
      const mimeType = ImageUtils.getMimeType(file.path);

      return this.processImageBase64(base64Str, mimeType, file.basename);
    });
  }

  /**
   * Reads image from system clipboard and converts it to .canvas
   */
  public convertClipboardImage() {
    return this.runConversion('clipboard image', async () => {
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
        throw new Error('No image found in clipboard. Please copy an image first.');
      }

      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64Str = ImageUtils.arrayBufferToBase64(arrayBuffer);

      return this.processImageBase64(base64Str, mimeType, 'ClipboardNote');
    });
  }

  private async runConversion(source: string, convert: () => Promise<TFile>): Promise<void> {
    const label = `Vision2Canvas: Converting ${source}`;
    const spinner = this.statusBarItem?.createSpan({
      cls: 'vision2canvas-progress-spinner',
      attr: { role: 'progressbar', 'aria-label': label, title: label }
    });

    let createdFile: TFile | undefined;
    try {
      createdFile = await convert();
      if (this.settings.autoOpenCanvas) {
        await this.app.workspace.getLeaf(true).openFile(createdFile);
      }
      new Notice(`Vision2Canvas created: ${createdFile.name}`);
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      const message = createdFile
        ? `Vision2Canvas saved ${createdFile.name} but could not open it`
        : `Vision2Canvas could not convert ${source}`;
      new Notice(reason ? `${message}: ${reason}` : message);
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
    titlePrefix: string
  ): Promise<TFile> {
    const optimized = await ImageUtils.compressImageBase64(base64Str, mimeType);

    const visionClient = new VisionClient(this.settings);
    const aiResult = await visionClient.analyzeImage(optimized.base64, optimized.mimeType);

    const canvasBuilder = new CanvasBuilder(this.settings);
    const canvasData = canvasBuilder.buildCanvasData(aiResult);

    const validation = CanvasValidator.validate(canvasData);
    if (!validation.valid) {
      throw new Error(`Generated canvas failed validation: ${validation.errors.join(', ')}`);
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
