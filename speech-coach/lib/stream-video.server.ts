import { StreamClient } from "@stream-io/node-sdk";

let cachedClient: StreamClient | null = null;

export const getStreamVideo = () => {
  if (!cachedClient) {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
    const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;

    if (!apiKey || !secretKey) {
      throw new Error("Stream Video env vars are missing.");
    }

    cachedClient = new StreamClient(apiKey, secretKey);
  }

  return cachedClient;
};
