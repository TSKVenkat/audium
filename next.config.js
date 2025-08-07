/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000"],
    },
  },
  webpack: (config, { isServer, webpack }) => {
    // Handle server-only packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        os: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        assert: false,
        http: false,
        https: false,
        zlib: false,
      }
    }

    // Exclude problematic packages from client-side bundle
    config.externals = config.externals || []
    config.externals.push({
      
      'playwright': 'commonjs playwright',
      '@google-cloud/text-to-speech': 'commonjs @google-cloud/text-to-speech',
      'say': 'commonjs say',
      'ffmpeg-static': 'commonjs ffmpeg-static',
    })



    return config
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig