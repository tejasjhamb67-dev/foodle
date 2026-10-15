import { RootRedirect } from "@/components/RootRedirect";

/** "/" redirects to the last mode played (spec 5.1). */
export default function Home() {
  return <RootRedirect />;
}
