import { redirect } from "next/navigation";

// Redirect root to the Community Pot page by default
export default function Page() {
  redirect("/community-pot");
}
