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

export default async (request) => {
  try {
    if (request.method === "OPTIONS") {
      return new Response("", {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (request.method !== "GET") {
      return new Response("-- method not allowed", {
        status: 405,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const url = new URL(request.url);
    const accessKey = url.searchParams.get("key");
    const expectedKey = process.env.ACCESS_KEY;

    if (expectedKey && accessKey !== expectedKey) {
      return new Response("-- unauthorized", {
        status: 401,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.GH_OWNER;
    const repo = process.env.GH_REPO;
    const path = process.env.GH_PATH || "script.lua";

    if (!githubToken || !owner || !repo) {
      return new Response("-- server configuration error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
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
      return new Response(`-- failed to load script (${fetchResponse.status})`, {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const scriptContent = await fetchResponse.text();

    if (!scriptContent || !scriptContent.trim()) {
      return new Response("-- script content is empty", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(scriptContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response("-- failed to load script", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};
