const HEADER_ACCEPT = {
    'json': 'application/vnd.github+json',
    'diff': 'application/vnd.github.v3.diff',
}

function createHeaders(type = 'json'){
    const token = process.env.GIT_API_KEY;
    if (!token) throw new Error("Missing GIT_API_KEY in .env");``

    const accept = HEADER_ACCEPT[type] ?? 'application/vnd.github+json';
    return {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        "User-Agent": "nlog-api",
        "X-GitHub-Api-Version": process.env.GIT_API_VERSION ?? "2022-11-28",
    };
}

async function getGitResponse(url, type){
    const response = await fetch(url, {headers: createHeaders(type)});
    const result = await response.json();

    return result;
}


export default {
    createHeaders,
    getGitResponse
}