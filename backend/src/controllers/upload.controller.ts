import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { s3Service } from '../services/s3.service';
import path from 'path';
import fs from 'fs';

export class UploadController {
  /**
   * Upload report file directly.
   */
  public static async uploadReport(req: AuthenticatedRequest, res: Response) {
    const { key, contentType } = req.body;
    const file = req.file; // if uploaded via multipart/form-data

    if (!key) {
      return res.status(400).json({ error: 'S3 Key is required' });
    }

    try {
      const buffer = file ? file.buffer : Buffer.from(req.body.content || '');
      const type = contentType || file?.mimetype || 'text/csv';

      const s3Url = await s3Service.uploadReport(key, buffer, type);
      return res.status(200).json({
        message: 'File uploaded successfully',
        url: s3Url,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to upload report file' });
    }
  }

  /**
   * Generate pre-signed S3 download URL.
   */
  public static async getSignedUrl(req: AuthenticatedRequest, res: Response) {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'File key or url is required' });
    }

    try {
      const preSignedUrl = await s3Service.getSignedUrl(key as string);
      return res.status(200).json({ url: preSignedUrl });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to generate pre-signed URL' });
    }
  }

  /**
   * Local file download endpoint. Used in mock development mode to serve uploaded files.
   */
  public static async downloadLocal(req: AuthenticatedRequest, res: Response) {
    const { key } = req.params;
    const uploadDir = s3Service.getUploadDir();
    const filePath = path.join(uploadDir, path.basename(key));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found in local mock storage' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(key)}`);
    return res.sendFile(filePath);
  }
}
export default UploadController;
