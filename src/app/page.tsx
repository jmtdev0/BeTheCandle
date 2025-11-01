import { redirect } from "next/navigation";

// Redirect root to the Goofy Mode page by default
export default function Page() {
  redirect("/goofy-mode");
}
