import { InvitePage } from "@/components/pages/InvitePage";
export const metadata = { title: "You're invited" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { code } = await params;
  const { k } = await searchParams;
  return <InvitePage code={code.toUpperCase()} kind={k === "g" ? "group" : "friend"} />;
}
