declare module 'next-pwa' {
    import { NextConfig } from 'next';

    export interface PluginOptions {
        disable?: boolean;
        register?: boolean;
        dest?: string;
        sw?: string;
        cacheStartUrl?: boolean;
        dynamicStartUrl?: boolean;
        dynamicStartUrlRedirect?: string;
        publicExcludes?: string[];
        buildExcludes?: (string | RegExp | ((opts: any) => boolean))[];
        fallbacks?: { [key: string]: string };
        cacheOnFrontEndNav?: boolean;
        reloadOnOnline?: boolean;
        customWorkerDir?: string;
        skipWaiting?: boolean;
    }

    export default function withPWA(pluginOptions: PluginOptions): (nextConfig?: NextConfig) => NextConfig;
}
