import { App, Modal } from 'obsidian';

export class ConvertProgressModal extends Modal {
  private statusEl!: HTMLElement;
  private detailEl!: HTMLElement;

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vision2canvas-modal');

    contentEl.createEl('div', {
      text: 'Vision2Canvas - Converting Note',
      cls: 'vision2canvas-modal-header'
    });

    this.statusEl = contentEl.createEl('div', {
      cls: 'vision2canvas-status'
    });
    this.updateStatus('Initializing Vision AI request...');

    this.detailEl = contentEl.createEl('div', {
      cls: 'vision2canvas-preview-box'
    });
    this.detailEl.hide();
  }

  public updateStatus(msg: string) {
    if (this.statusEl) {
      this.statusEl.innerHTML = `<span class="vision2canvas-progress-spinner"></span> ${msg}`;
    }
  }

  public showSuccess(msg: string, details?: string) {
    if (this.statusEl) {
      this.statusEl.innerHTML = `✅ ${msg}`;
    }
    if (details && this.detailEl) {
      this.detailEl.show();
      this.detailEl.setText(details);
    }
  }

  public showError(msg: string) {
    if (this.statusEl) {
      this.statusEl.innerHTML = `❌ ${msg}`;
      this.statusEl.style.backgroundColor = 'var(--background-modifier-error)';
      this.statusEl.style.color = 'var(--text-error)';
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
