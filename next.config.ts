import type { NextConfig } from "next";
import { getBuildHash } from "./build/build-version";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isCrazyGamesBuild = process.env.CRAZYGAMES_BUILD === "true";
const isKongregateBuild = process.env.KONGREGATE_BUILD === "true";
const isPortalBuild = isCrazyGamesBuild || isKongregateBuild;
const isStaticExport =
  isGitHubPages || isPortalBuild || process.env.STATIC_EXPORT === "true";
const repositoryName =
  process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "KesselKrawall";
const buildHash = getBuildHash();

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  basePath: isGitHubPages ? `/${repositoryName}` : "",
  assetPrefix: isPortalBuild ? "." : undefined,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_SHA: buildHash,
    NEXT_PUBLIC_DISTRIBUTION: isCrazyGamesBuild
      ? "crazygames"
      : isKongregateBuild
        ? "kongregate"
        : "web",
  },
};

export default nextConfig;
