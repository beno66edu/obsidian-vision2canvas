import { Plugin, Notice, TFile, Menu } from 'obsidian';
import { Vision2CanvasSettings, DEFAULT_SETTINGS } from './types';
import { Vision2CanvasSettingTab } from './settings';
import { VisionClient } from './ai/visionClient';
import { CanvasBuilder } from './canvas/canvasBuilder';
import { CanvasValidator } from './canvas/canvasValidator';
import { FileUtils } from './utils/fileUtils';
import { ImageUtils } from './utils/imageUtils';
import { ConvertProgressModal } from './ui/convertModal';

export default class Vision2CanvasPlugin extends Plugin {
  settings!: Vision2CanvasSettings;

  async onload() {
    console.log('Loading Vision2Canvas plugin');

    await this.loadSettings();

    // 1. Register Setting Tab
    this.addSettingTab(new Vision2CanvasSettingTab(this.app, this));

    // 2. Ribbon Icon for quick action
    this.addRibbonIcon('layout-dashboard', 'Convert Clipboard Image to Canvas', () => {
      this.convertClipboardImage();
    });

    // 3. Command: Convert Clipboard Image
    this.addCommand({
      id: 'convert-clipboard-image-to-canvas',
      name: 'Convert Clipboard Image to Canvas',
      callback: () => this.convertClipboardImage()
    });

    // 4. Right-click context menu on image files in File Explorer
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file: TFile) => {
        if (file instanceof TFile && this.isImageFile(file)) {
          menu.addItem((item) => {
            item
              .setTitle('Convert to Obsidian Canvas Whiteboard')
              .setIcon('layout-dashboard')
              .onClick(() => this.convertVaultImage(file));
          });
        }
      })
    );
  }

  onunload() {
    console.log('Unloading Vision2Canvas plugin');
  }

  public async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
  public async convertVaultImage(file: TFile) {
    const modal = new ConvertProgressModal(this.app);
    modal.open();

    try {
      modal.updateStatus(`Reading image file "${file.name}"...`);
      const arrayBuffer = await this.app.vault.readBinary(file);
      const base64Str = ImageUtils.arrayBufferToBase64(arrayBuffer);
      const mimeType = ImageUtils.getMimeType(file.path);

      await this.processImageBase64(base64Str, mimeType, file.basename, modal);
    } catch (err: any) {
      console.error('convertVaultImage failed:', err);
      modal.showError(err.message || 'Failed to process vault image');
    }
  }

  /**
   * Reads image from system clipboard and converts it to .canvas
   */
  public async convertClipboardImage() {
    const modal = new ConvertProgressModal(this.app);
    modal.open();

    try {
      modal.updateStatus('Reading image from clipboard...');
      
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
        modal.showError('No image found in clipboard. Please copy an image first.');
        return;
      }

      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64Str = ImageUtils.arrayBufferToBase64(arrayBuffer);

      await this.processImageBase64(base64Str, mimeType, 'ClipboardNote', modal);
    } catch (err: any) {
      console.error('convertClipboardImage failed:', err);
      modal.showError(err.message || 'Failed to read image from clipboard.');
    }
  }

  /**
   * Core conversion pipeline: Base64 -> Vision AI -> Canvas Data -> Vault .canvas File
   */
  private async processImageBase64(
    base64Str: string,
    mimeType: string,
    titlePrefix: string,
    modal: ConvertProgressModal
  ) {
    modal.updateStatus(`Sending request to Vision AI (${this.settings.modelName})...`);

    const visionClient = new VisionClient(this.settings);
    const aiResult = await visionClient.analyzeImage(base64Str, mimeType);

    modal.updateStatus('AI analysis complete. Building Canvas layout...');

    const canvasBuilder = new CanvasBuilder(this.settings);
    const canvasData = canvasBuilder.buildCanvasData(aiResult);

    const validation = CanvasValidator.validate(canvasData);
    if (!validation.valid) {
      throw new Error(`Generated canvas failed validation: ${validation.errors.join(', ')}`);
    }

    const canvasJsonStr = JSON.stringify(canvasData, null, 2);
    const filename = FileUtils.generateCanvasFilename(aiResult.title || titlePrefix);

    modal.updateStatus(`Saving canvas file "${filename}" to vault...`);

    const createdFile = await FileUtils.saveCanvasToVault(
      this.app,
      this.settings.outputFolder,
      filename,
      canvasJsonStr
    );

    modal.showSuccess(
      `Canvas created successfully! (${canvasData.nodes.length} nodes, ${canvasData.edges.length} edges)`,
      canvasJsonStr
    );

    new Notice(`Vision2Canvas created: ${createdFile.name}`);

    if (this.settings.autoOpenCanvas) {
      await this.app.workspace.getLeaf(true).openFile(createdFile);
    }
  }
}
