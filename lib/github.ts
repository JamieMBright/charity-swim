import { DATA_BRANCH, DATA_REPO } from "./data";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

export class GitHubApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

function getToken() {
  const token = process.env.DATA_GITHUB_TOKEN;

  if (!token) {
    throw new Error("DATA_GITHUB_TOKEN is not configured.");
  }

  return token;
}

function headers() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${getToken()}`,
    "X-GitHub-Api-Version": API_VERSION,
    "Content-Type": "application/json",
  };
}

export async function readRepoFile(path: string) {
  const url = `${GITHUB_API}/repos/${DATA_REPO}/contents/${path}?ref=${encodeURIComponent(DATA_BRANCH)}`;
  const response = await fetch(url, { headers: headers(), cache: "no-store" });

  if (!response.ok) {
    throw new GitHubApiError(
      `Could not read ${path} from GitHub.`,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    content?: string;
    sha?: string;
  };

  if (typeof payload.content !== "string" || typeof payload.sha !== "string") {
    throw new GitHubApiError(`Unexpected GitHub response for ${path}.`, 500);
  }

  return {
    sha: payload.sha,
    text: Buffer.from(payload.content, "base64").toString("utf8"),
  };
}

export async function writeRepoFile(options: {
  path: string;
  text: string;
  sha: string;
  message: string;
}) {
  const url = `${GITHUB_API}/repos/${DATA_REPO}/contents/${options.path}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: headers(),
    cache: "no-store",
    body: JSON.stringify({
      message: options.message,
      content: Buffer.from(options.text, "utf8").toString("base64"),
      sha: options.sha,
      branch: DATA_BRANCH,
    }),
  });

  if (!response.ok) {
    throw new GitHubApiError(
      `Could not commit ${options.path} to GitHub.`,
      response.status,
    );
  }
}
