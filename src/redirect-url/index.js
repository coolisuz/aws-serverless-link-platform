const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.URLS_TABLE_NAME;


exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const shortCode = event.pathParameters?.shortCode;

    if (!shortCode) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Short code is required' })
      };
    }

    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { shortCode: shortCode }
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html' },
        body: '<h1>404 - Short URL Not Found</h1><p>This short code does not exist.</p>'
      };
    }

    const originalUrl = result.Item.originalUrl;

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { shortCode: shortCode },
      UpdateExpression: 'ADD clicks :inc',
      ExpressionAttributeValues: {
        ':inc': 1
      }
    });

    docClient.send(updateCommand).catch(err => {
      console.error('Error incrementing click count:', err);
    });

    return {
      statusCode: 302,
      headers: {
        'Location': originalUrl,
        'Cache-Control': 'no-cache' 
      },
      body: '' 
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
