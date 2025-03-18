// handler.js - AWS Lambda function for URL Shortener with DynamoDB integration

const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "URLShortenerTable"; // DynamoDB Table Name

// Function to generate a random short code
const generateShortCode = () => crypto.randomBytes(3).toString('hex');

exports.handler = async (event) => {
    try {
        if (event.httpMethod === "POST") {
            // Handle URL Shortening Request
            const body = JSON.parse(event.body);
            const { longUrl } = body;
            
            if (!longUrl) {
                return { statusCode: 400, body: JSON.stringify({ error: "Missing longUrl parameter" }) };
            }
            
            const shortCode = generateShortCode();
            const shortUrl = `https://short.ly/${shortCode}`;
            
            // Save to DynamoDB
            await dynamoDB.put({
                TableName: TABLE_NAME,
                Item: {
                    shortCode: shortCode,
                    longUrl: longUrl,
                    createdAt: new Date().toISOString()
                }
            }).promise();
            
            return { statusCode: 200, body: JSON.stringify({ shortUrl }) };
        } else if (event.httpMethod === "GET") {
            // Handle URL Redirection Request
            const shortCode = event.pathParameters.shortCode;
            
            const result = await dynamoDB.get({
                TableName: TABLE_NAME,
                Key: { shortCode }
            }).promise();
            
            if (!result.Item) {
                return { statusCode: 404, body: JSON.stringify({ error: "Short URL not found" }) };
            }
            
            return {
                statusCode: 301,
                headers: { "Location": result.Item.longUrl },
                body: "Redirecting..."
            };
        }
        
        return { statusCode: 400, body: JSON.stringify({ error: "Unsupported request method" }) };
    } catch (error) {
        console.error("Error processing request", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
