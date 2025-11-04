import { redirect } from "next/navigation";

// Redirect root to the Lobby page by default
export default function Page() {
  redirect("/lobby");
}
