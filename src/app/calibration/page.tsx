import { redirect } from "next/navigation";

/**
 * Legacy /calibration route — redirect to the renamed /scores page.
 */
export default function CalibrationRedirect() {
  redirect("/scores");
}
