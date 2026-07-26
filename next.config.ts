import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "KesselKrawall";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? `/${repositoryName}` : "",
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
