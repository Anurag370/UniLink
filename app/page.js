import { getSession } from "@/lib/auth";
import Feed from "@/components/Feed";
import Landing from "@/components/Landing";

export default async function Home() {
  const session = await getSession();

  return session ? <Feed /> : <Landing />;
}
