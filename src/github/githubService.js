import githubClient from "./githubClient.js";

async function getRepoTree(owner, repo, branch){
    branch = 'main';
    repo = 'nlog';
    owner = 'PARKyc-web';

    // 1) ref -> commit sha
    const ref = await githubClient.getGitResponse(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`);
    const commitSha = ref.object.sha;

    // 2) commit -> tree sha
    const commit = await githubClient.getGitResponse(`https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`);
    const treeSha = commit.tree.sha;

    // 3) tree recursive
    const tree = await githubClient.getGitResponse(`https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
    return tree.tree.map(x => ({ path: x.path, type: x.type, size: x.size }));
    /*
     *** raw data
        {
            "path": ".gitignore",
            "mode": "100644",
            "type": "blob",
            "sha": "9a5acedff56aee2e6731a444d283bf6071c49bcc",
            "size": 2152,
            "url": "https://api.github.com/repos/PARKyc-web/nlog/git/blobs/9a5acedff56aee2e6731a444d283bf6071c49bcc"
         },
     *** raw data
     */
}

async function getRepoJsonTree(owner, repo, branch){
    owner = 'PARKyc-web';
    repo = 'nlog';
    branch = 'main';

    // 1) ref -> commit sha
    const ref = await githubClient.getGitResponse(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`);
    const commitSha = ref.object.sha;

    // 2) commit -> tree sha
    const commit = await githubClient.getGitResponse(`https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`);
    const treeSha = commit.tree.sha;

    // 3) tree recursive
    const tree = await githubClient.getGitResponse(`https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
    const result = tree.tree.map(x => ({ path: x.path, type: x.type, size: x.size }));
    /*
     *** raw data
        {
            "path": ".gitignore",
            "mode": "100644",
            "type": "blob",
            "sha": "9a5acedff56aee2e6731a444d283bf6071c49bcc",
            "size": 2152,
            "url": "https://api.github.com/repos/PARKyc-web/nlog/git/blobs/9a5acedff56aee2e6731a444d283bf6071c49bcc"
         },
     *** raw data
     */
    const resultByjson = summarizeRepoStructure(result);
    console.log(resultByjson);

    return resultByjson;
}

function summarizeRepoStructure(items, opt = {}) {
    const {
        excludePrefixes = [".idea/", "node_modules/", "dist/", "build/"],
        excludeExact = [".idea", "package-lock.json"],
        rootKeep = ["index.js", "package.json", "README.md", "env_example"],
        publicCssWildcard = true,
    } = opt;

    // items: [{path, type}] type: "blob" | "tree"
    const filtered = items.filter(x => {
        const p = x.path;
        if (excludeExact.includes(p)) return false;
        if (excludePrefixes.some(pre => p.startsWith(pre))) return false;
        return true;
    });

    // 루트/폴더별 직속 파일 수집
    const rootFiles = [];
    const dirs = new Map(); // dirName -> { rootFiles: [], sub: Map(subdir -> files[]) }

    const ensureDir = (dir) => {
        if (!dirs.has(dir)) dirs.set(dir, { rootFiles: [], sub: new Map() });
        return dirs.get(dir);
    };

    for (const x of filtered) {
        if (x.type !== "blob") continue;

        const parts = x.path.split("/");
        if (parts.length === 1) {
            rootFiles.push(parts[0]);
            continue;
        }

        const top = parts[0];      // public/src/views
        const rest = parts.slice(1);

        const bucket = ensureDir(top);

        if (rest.length === 1) {
            // e.g. src/routes.js
            bucket.rootFiles.push(rest[0]);
        } else {
            // e.g. src/github/github.js  (깊이2 기준)
            const subdir = rest[0];
            const filename = rest[rest.length - 1];

            if (!bucket.sub.has(subdir)) bucket.sub.set(subdir, []);
            bucket.sub.get(subdir).push(filename);
        }
    }

    // 정렬 유틸
    const uniqSort = (arr) => Array.from(new Set(arr)).sort();

    // root 정렬: rootKeep 우선
    const rootSet = new Set(rootFiles);
    const orderedRoot = [];
    for (const k of rootKeep) if (rootSet.has(k)) orderedRoot.push(k);
    for (const k of uniqSort(rootFiles)) if (!rootKeep.includes(k)) orderedRoot.push(k);

    const result = { root: orderedRoot };

    // public/css 축약 판단 (public 아래 파일이 전부 css고 subdir 없으면 "*.css")
    const maybeWildcardPublic = (bucket) => {
        const files = uniqSort(bucket.rootFiles);
        const hasSub = bucket.sub.size > 0;
        if (!publicCssWildcard || hasSub) return null;
        if (files.length > 0 && files.every(f => f.endsWith(".css"))) return ["*.css"];
        return null;
    };

    // dirs 처리
    for (const [dirName, bucket] of Array.from(dirs.entries()).sort(([a],[b]) => a.localeCompare(b))) {
        if (dirName === "public") {
            const wild = maybeWildcardPublic(bucket);
            if (wild) {
                result.public = wild;
                continue;
            }
            // wildcard 안되면 public도 src/views처럼 처리
        }

        const obj = {};
        obj[`${dirName}-root`] = uniqSort(bucket.rootFiles);

        for (const [subdir, files] of Array.from(bucket.sub.entries()).sort(([a],[b]) => a.localeCompare(b))) {
            obj[subdir] = uniqSort(files);
        }

        result[dirName] = obj;
    }

    return result;
}


export default {
    getRepoTree,
    getRepoJsonTree,
}