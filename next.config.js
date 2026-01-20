/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Skip static generation for API routes
  typescript: {
    // We handle type checking separately
    tsconfigPath: './tsconfig.json'
  }
}

module.exports = nextConfig
