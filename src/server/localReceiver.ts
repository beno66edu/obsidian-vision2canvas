import * as http from 'http';
import { Vision2CanvasSettings } from '../types';
import { VisionClient } from '../ai/visionClient';
import { CanvasBuilder } from '../canvas/canvasBuilder';
import { CanvasValidator } from '../canvas/canvasValidator';
import { FileUtils } from '../utils/fileUtils';
import { App } from 'obsidian';

export class LocalReceiverServer {
  private server: http.Server | null = null;
  private app: App;
  private settings: Vision2CanvasSettings;

  constructor(app: App, settings: Vision2CanvasSettings) {
    this.app = app;
    this.settings = settings;
  }

  public updateSettings(settings: Vision2CanvasSettings) {
    this.settings = settings;
    if (this.server && this.server.listening) {
      this.stop();
      if (this.settings.enableLocalServer) {
        this.start();
      }
    }
  }

  public start(): void {
    if (this.server && this.server.listening) {
      return;
    }

    const port = this.settings.localServerPort || 18462;

    this.server = http.createServer(async (req, res) => {
      // CORS headers for local/Tailscale requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/health' || req.url === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'Vision2Canvas Receiver' }));
        return;
      }

      if (req.method === 'POST' && (req.url === '/api/v1/convert' || req.url === '/convert')) {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            const base64Image = payload.image || payload.base64;
            const mimeType = payload.mimeType || 'image/jpeg';
            const customTitle = payload.title || payload.filename;

            if (!base64Image) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing "image" base64 string in POST payload' }));
              return;
            }

            // 1. Vision AI Processing
            const visionClient = new VisionClient(this.settings);
            const aiResult = await visionClient.analyzeImage(base64Image, mimeType);

            // 2. Build Canvas
            const canvasBuilder = new CanvasBuilder(this.settings);
            const canvasData = canvasBuilder.buildCanvasData(aiResult);

            // 3. Validate
            const validation = CanvasValidator.validate(canvasData);
            if (!validation.valid) {
              res.writeHead(422, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Generated canvas failed validation', details: validation.errors }));
              return;
            }

            // 4. Save to Vault
            const canvasJsonStr = JSON.stringify(canvasData, null, 2);
            const filename = customTitle 
              ? (customTitle.endsWith('.canvas') ? customTitle : `${customTitle}.canvas`)
              : FileUtils.generateCanvasFilename(aiResult.title || 'MobileNote');

            const file = await FileUtils.saveCanvasToVault(
              this.app,
              this.settings.outputFolder,
              filename,
              canvasJsonStr
            );

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              filename: file.name,
              path: file.path,
              nodeCount: canvasData.nodes.length,
              edgeCount: canvasData.edges.length
            }));
          } catch (err: any) {
            console.error('LocalReceiver error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Internal processing error' }));
          }
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    this.server.listen(port, '0.0.0.0', () => {
      console.log(`[Vision2Canvas] Local API receiver listening on port ${port}`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('[Vision2Canvas] Local API receiver stopped.');
    }
  }

  public isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }
}
