const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqs = new SQSClient({ region: process.env.REGION || "us-east-1" });
const queueUrl = process.env.SQS_QUEUE_URL;

exports.handler = async (event) => {
  console.log("Receiving IoT Telemetry:", JSON.stringify(event));

  try {
    const { device_uid, metric, value, timestamp } = event;

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
    });

    await sqs.send(command);
    console.log(`Pushed to SQS successfully: ${device_uid} - ${metric} = ${value}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Successfully queued telemetry payload" }),
    };
  } catch (err) {
    console.error("Failed to forward telemetry payload to SQS queue:", err);
    throw err;
  }
};
