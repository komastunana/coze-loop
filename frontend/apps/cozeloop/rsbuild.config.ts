// Copyright (c) 2025 coze-dev Authors
// SPDX-License-Identifier: Apache-2.0
import { createRsbuildConfig } from '@cozeloop/rsbuild-config';

export type RsbuildConfig = ReturnType<typeof createRsbuildConfig>;

const port = 8090;

export default createRsbuildConfig({
  server: { port },
  dev: {
    assetPrefix: `http://localhost:${port}`,
    client: {
      port: `${port}`,
      host: 'localhost',
      protocol: 'ws',
    },
  },
  html: {
    title: 'Coze Loop',
    template: './src/assets/template.html',
    favicon: './src/assets/images/coze.svg',
    crossorigin: 'anonymous',
  },
  source: {
    define: {
      'API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
      'LOGIN_URL': JSON.stringify(process.env.LOGIN_URL),
      'ENV_MODE': JSON.stringify(process.env.NODE_ENV),
    },
  },
}) as RsbuildConfig;
