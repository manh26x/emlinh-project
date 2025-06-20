/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config as RemotionConfig } from "@remotion/cli/config";

RemotionConfig.setChromiumOpenGlRenderer("angle");
RemotionConfig.setVideoImageFormat("jpeg");
RemotionConfig.setPixelFormat("yuv420p");
RemotionConfig.setEntryPoint("src/index.ts"); // Chỉ định entry point

// Fix timeout issue với ThreeCanvas - set concurrency thấp
RemotionConfig.setConcurrency(1);
