export default async (request) => {
  try {
    const url = new URL(request.url);

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

    console.log({ owner, repo, path, hasToken: !!githubToken });

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
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      return new Response(
        `-- failed to load script (${fetchResponse.status}) ${errorText}`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const scriptContent = await fetchResponse.text();

    return new Response(scriptContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(`-- failed to load script ${String(error)}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};
