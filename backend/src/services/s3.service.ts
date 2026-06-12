import fs from 'fs';
import path from 'path';

class S3Service {
  private bucketName: string;
  private uploadDir: string;
  private isMock: boolean;

  constructor() {
    this.bucketName = process.env.S3_BUCKET || 'warehouse-iot-reports';
    this.uploadDir = path.join(__dirname, '../../uploads');
    
    // Determine if we should run in Mock mode (local file writes)
    this.isMock = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'CHANGE_ME';
    
    if (this.isMock) {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
      console.log(`S3 Service initialized in LOCAL MOCK mode. Files saved to: ${this.uploadDir}`);
    } else {
      console.log(`S3 Service initialized with bucket: ${this.bucketName}`);
    }
  }

  /**
   * Upload a generated file (CSV/PDF) to S3 (or local disk in mock mode)
   */
  public async uploadReport(key: string, fileContent: Buffer | string, contentType: string = 'text/csv'): Promise<string> {
    if (this.isMock) {
      const filePath = path.join(this.uploadDir, path.basename(key));
      fs.writeFileSync(filePath, fileContent);
      console.log(`[Local Upload] File written to: ${filePath}`);
      return `local://${path.basename(key)}`;
    }

    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
      });

      await s3Client.send(command);
      return `s3://${this.bucketName}/${key}`;
    } catch (err) {
      console.error(`S3 upload failed for key ${key}:`, err);
      // Fallback to local
      const filePath = path.join(this.uploadDir, path.basename(key));
      fs.writeFileSync(filePath, fileContent);
      return `local://${path.basename(key)}`;
    }
  }

  /**
   * Generate a pre-signed download URL for a file. Expires in 1 hour (3600 seconds).
   */
  public async getSignedUrl(fileUrl: string): Promise<string> {
    const isLocal = fileUrl.startsWith('local://');
    const key = isLocal ? fileUrl.replace('local://', '') : fileUrl.substring(fileUrl.lastIndexOf('/') + 1);

    if (this.isMock || isLocal) {
      // Return local server URL that downloads the file
      const port = process.env.PORT || 5000;
      const host = process.env.FRONTEND_URL || `http://localhost:${port}`;
      return `${host}/api/upload/local-download/${key}`;
    }

    try {
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl: awsGetSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileUrl.replace(`s3://${this.bucketName}/`, ''),
      });

      return await awsGetSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (err) {
      console.error(`Failed to generate pre-signed URL for ${fileUrl}:`, err);
      const port = process.env.PORT || 5000;
      const host = process.env.FRONTEND_URL || `http://localhost:${port}`;
      return `${host}/api/upload/local-download/${key}`;
    }
  }

  public getUploadDir(): string {
    return this.uploadDir;
  }
}

export const s3Service = new S3Service();
export default s3Service;
