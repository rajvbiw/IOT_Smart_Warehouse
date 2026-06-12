class SNSService {
  private topicArn: string | undefined;

  constructor() {
    this.topicArn = process.env.AWS_SNS_TOPIC_ARN;
  }

  /**
   * Publishes critical alerts to SNS Topic.
   * If in local environment or variables are missing, logs to console instead.
   */
  public async publishCriticalAlert(message: string, subject: string = 'CRITICAL: IoT Warehouse Alert'): Promise<void> {
    if (!this.topicArn || this.topicArn === 'CHANGE_ME' || !process.env.AWS_ACCESS_KEY_ID) {
      console.log(`[SNS MOCK PUBLISH] Subject: "${subject}", Message: "${message}"`);
      return;
    }

    try {
      // Dynamic import to avoid crash if SDK is not installed or when mock runs.
      const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
      const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Message: message,
        Subject: subject,
      });

      const response = await snsClient.send(command);
      console.log(`SNS alert sent successfully. MessageID: ${response.MessageId}`);
    } catch (err) {
      console.error('Failed to send SNS notification:', err);
    }
  }
}

export const snsService = new SNSService();
export default snsService;
