import { redirect } from "next/navigation";

export default async function LegacyJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  redirect(
    `/session/${code.toUpperCase()}`,
  );
}