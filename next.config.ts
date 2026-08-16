import type { NextConfig } from "next";
import { getBuildHash } from "./build/build-version";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isStaticExport =
  isGitHubPages || process.env.STATIC_EXPORT === "true";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "KesselKrawall";
const buildHash = getBuildHash();

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  basePath: isGitHubPages ? `/${repositoryName}` : "",
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_SHA: buildHash,
  },
};

export default nextConfig;
