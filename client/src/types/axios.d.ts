import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    offlineData?: unknown;
    offlineCacheKey?: string;
  }
}
