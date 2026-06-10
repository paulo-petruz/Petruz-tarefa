import Image from "next/image";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#2e1065] via-[#4c1d95] to-[#1e1b4b] p-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Image
          src="/petruz.png"
          alt="Petruz"
          width={120}
          height={120}
          priority
        />
        <p className="text-sm text-purple-200">
          Gerenciador de tarefas da Petruz
        </p>
      </div>
      {children}
    </div>
  );
}
