import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return children;
}