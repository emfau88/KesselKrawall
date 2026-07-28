import { execFileSync } from "node:child_process";

export function getBuildHash(): string {
  const environmentHash =
    process.env.NEXT_PUBLIC_BUILD_SHA ??
    process.env.GITHUB_SHA ??
    process.env.CF_PAGES_COMMIT_SHA;

  if (environmentHash) {
    return environmentHash.slice(0, 7);
  }

  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "local";
  }
}
