import { Planner } from "@/components/Planner";

// The only screen. Sections + shared editor + undo (M2). The shared calendar
// and Minute Ledger arrive in M3–M4.
export default function HomePage() {
  return <Planner />;
}
