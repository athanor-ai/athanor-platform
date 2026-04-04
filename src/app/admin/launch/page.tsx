import { redirect } from "next/navigation";

/**
 * /admin/launch redirects to /launch.
 *
 * The launch wizard lives at /launch (accessible to all authenticated users).
 * This redirect exists so admins who navigate to /admin/launch reach the
 * correct page instead of getting a 404.
 */
export default function AdminLaunchRedirect() {
  redirect("/launch");
}
