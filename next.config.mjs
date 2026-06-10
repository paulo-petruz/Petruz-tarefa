/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // O driver mssql não pode ser empacotado pelo webpack (quebra a
    // validação de tipos dos parâmetros); deixá-lo como dependência externa.
    serverComponentsExternalPackages: ["mssql"],
  },
};

export default nextConfig;
