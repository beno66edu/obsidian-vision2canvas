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

    contentEl.createDiv({
      text: 'Vision2Canvas - Converting Note',
      cls: 'vision2canvas-modal-header'
    });

    this.statusEl = contentEl.createDiv({
      cls: 'vision2canvas-status'
    });
    this.updateStatus('Initializing Vision AI request...');

    this.detailEl = contentEl.createDiv({
      cls: 'vision2canvas-preview-box'
    });
    this.detailEl.hide();
  }

  public updateStatus(msg: string) {
    if (this.statusEl) {
      this.statusEl.empty();
      this.statusEl.removeClass('is-error');
      this.statusEl.createSpan({ cls: 'vision2canvas-progress-spinner' });
      this.statusEl.createSpan({ text: ` ${msg}` });
    }
  }

  public showSuccess(msg: string, details?: string) {
    if (this.statusEl) {
      this.statusEl.empty();
      this.statusEl.removeClass('is-error');
      this.statusEl.setText(`✅ ${msg}`);
    }
    if (details && this.detailEl) {
      this.detailEl.show();
      this.detailEl.setText(details);
    }
  }

  public showError(msg: string) {
    if (this.statusEl) {
      this.statusEl.empty();
      this.statusEl.addClass('is-error');
      this.statusEl.setText(`❌ ${msg}`);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
