import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // Work around an invalid exports map shipped by @mediapipe/tasks-vision.
      "@mediapipe/tasks-vision$": path.resolve(
        process.cwd(),
        "node_modules/@mediapipe/tasks-vision/vision_bundle.mjs"
      ),
    };

    return config;
  },
};

export default nextConfig;
