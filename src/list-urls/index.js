const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.URLS_TABLE_NAME;

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit)
      : 10; // Default to 10 items

    const lastKey = event.queryStringParameters?.lastKey
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
      : undefined;

    if (limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Limit must be between 1 and 100'
        })
      };
    }

    const scanParams = {
      TableName: TABLE_NAME,
      Limit: limit
    };

    if (lastKey) {
      scanParams.ExclusiveStartKey = lastKey;
    }

    const command = new ScanCommand(scanParams);
    const result = await docClient.send(command);

    const urls = result.Items.map(item => ({
      shortCode: item.shortCode,
      originalUrl: item.originalUrl,
      clicks: item.clicks || 0,
      createdAt: item.createdAt
    }));

    const response = {
      urls: urls,
      count: urls.length,
      scannedCount: result.ScannedCount
    };


    if (result.LastEvaluatedKey) {
      response.lastKey = encodeURIComponent(
        JSON.stringify(result.LastEvaluatedKey)
      );
      response.hasMore = true;
    } else {
      response.hasMore = false;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
