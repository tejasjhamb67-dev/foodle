import { redirect } from "next/navigation";

/** /global, /india → Dish mode. Shared links like /142 → today's game. */
export default async function EditionIndex({ params }: { params: Promise<{ edition: string }> }) {
  const { edition } = await params;
  if (edition === "global" || edition === "india") redirect(`/${edition}/dish`);
  redirect("/");
}
