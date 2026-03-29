/**
 * Netlify Serverless Function to securely serve Lua scripts from private GitHub repository
 * 
 * Environment Variables Required:
 * - GITHUB_TOKEN: GitHub Personal Access Token with repo access
 * - GH_OWNER: GitHub repository owner
 * - GH_REPO: GitHub repository name  
 * - GH_PATH: Path to Lua script in repository
 * - ACCESS_KEY: Optional access key for security
 */

export default async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "text/plain" },
        body: "-- method not allowed",
      };
    }

    const accessKey = event.queryStringParameters?.key;
    const expectedKey = process.env.ACCESS_KEY;

    if (expectedKey && accessKey !== expectedKey) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
        body: "-- unauthorized",
      };
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.GH_OWNER;
    const repo = process.env.GH_REPO;
    const path = process.env.GH_PATH || "script.lua";

    if (!githubToken || !owner || !repo) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/plain" },
        body: "-- server configuration error",
      };
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const fetchResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "Netlify-Function/1.0",
      },
    });

    if (!fetchResponse.ok) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/plain" },
        body: `-- failed to load script (${fetchResponse.status})`,
      };
    }

    const scriptContent = await fetchResponse.text();

    if (!scriptContent || !scriptContent.trim()) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/plain" },
        body: "-- script content is empty",
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
      body: scriptContent,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: "-- failed to load script",
    };
  }
};
