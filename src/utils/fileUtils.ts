import { App, TFile } from 'obsidian';

export class FileUtils {
  /**
   * Generates a timestamped default filename for the canvas file
   */
  public static generateCanvasFilename(prefix: string = 'Note'): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    return `${prefix}_${yyyy}${mm}${dd}_${hh}${min}${ss}.canvas`;
  }

  /**
   * Save canvas JSON string to specified vault path
   */
  public static async saveCanvasToVault(
    app: App,
    folderPath: string,
    filename: string,
    canvasJsonStr: string
  ): Promise<TFile> {
    let cleanFolder = folderPath.trim().replace(/^\/+|\/+$/g, '');
    if (cleanFolder && !(await app.vault.adapter.exists(cleanFolder))) {
      await app.vault.createFolder(cleanFolder);
    }

    const fullPath = cleanFolder ? `${cleanFolder}/${filename}` : filename;
    return await app.vault.create(fullPath, canvasJsonStr);
  }
}
