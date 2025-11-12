// Copyright (c) 2025 coze-dev Authors
// SPDX-License-Identifier: Apache-2.0
import { createAPI as apiFactory } from '@coze-arch/idl2ts-runtime';
import { type IMeta } from '@coze-arch/idl2ts-runtime';

import {
  checkResponseData,
  checkFetchResponse,
  onClientError,
} from '../notification';

export interface ApiOption {
  /**
   * error toast config
   * @default false
   */
  disableErrorToast?: boolean;
  /** headers */
  headers?: Record<string, string>;
}

export interface ApiResponse {
  code?: number;
  msg?: string;
}

export function createAPI<
  T extends {},
  K,
  O = ApiOption,
  B extends boolean = false,
>(meta: IMeta, cancelable?: B) {
  return apiFactory<T, K & ApiResponse, O, B>(meta, cancelable, false, {
    config: {
      clientFactory: _meta => async (uri, init, options) => {
        // 获取URL查询参数中的 x-user-token
        const urlParams = new URLSearchParams(window.location.search);
        const userTokenFromQuery = urlParams.get('x-user-token');

        // 如果存在 x-user-token 参数，则写入 cookie
        if (userTokenFromQuery) {
          document.cookie = `x-user-token=${userTokenFromQuery}; path=/`;
        }

        // 从 cookie 中获取 x-user-token
        const cookies = document.cookie.split(';').reduce<Record<string, string>>((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {});

        const userToken = cookies['x-user-token'];

        const headers = {
          'Agw-Js-Conv': 'str', // RESERVED HEADER FOR SERVER
          ...(userToken && { 'x-user-token': userToken }), // 添加 x-user-token 到请求头
          ...init.headers,
          ...(options?.headers ?? {}),
        };
        const opts = { ...init, headers };

        try {
          if (init?.body) {
            opts.body = JSON.stringify(init?.body);
          }
          const baseUrl = ENV_MODE === 'development' ? '' : API_BASE_URL;
          const resp = await fetch(`${baseUrl}${uri}`, opts);
          checkFetchResponse(resp);

          const data = await resp.json();
          const loginUrl = LOGIN_URL || '/auth/login';
          if (data.code === 401) {
            window.location.href = loginUrl;
          }
          checkResponseData(uri, data);

          return data;
        } catch (e) {
          options.disableErrorToast || onClientError(uri, e);
          throw e;
        }
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- skip
  } as any);
}
