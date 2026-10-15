import { GroupPage } from "@/components/pages/GroupPage";
export const metadata = { title: "Group" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupPage id={id} />;
}
