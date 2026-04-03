"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  PiHouseSimple,
  PiCube,
  PiListChecks,
  PiPlay,
  PiWaveSine,
  PiChartBar,
  PiBrain,
  PiKey,
  PiBookOpen,
  PiRocketLaunch,
  PiLightning,
} from "react-icons/pi";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";

const navItems = [
  { label: "Dashboard", href: "/overview", icon: PiHouseSimple },
  { label: "Quick Start", href: "/quickstart", icon: PiLightning },
  { label: "Environments", href: "/environments", icon: PiCube },
  { label: "Download", href: "/download", icon: PiCube },
  { label: "Tasks", href: "/tasks", icon: PiListChecks },
  { label: "Runs", href: "/runs", icon: PiPlay },
  { label: "Launch Run", href: "/launch", icon: PiRocketLaunch },
  { label: "Scores", href: "/scores", icon: PiWaveSine },
  { label: "Baselines", href: "/baselines", icon: PiChartBar },
  { label: "Integration", href: "/training", icon: PiBrain },
  { label: "Credentials", href: "/credentials", icon: PiKey },
  { label: "Docs", href: "/docs", icon: PiBookOpen },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[200px] flex-col border-r border-border bg-surface">
      {/* Logo area */}
      <div className="flex h-12 items-center border-b border-border px-4">
        <Link href="/overview" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-accent">
            <span className="text-xs font-bold text-background">T</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-text-primary">
            Tahoe
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/overview" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-100",
                    isActive
                      ? "bg-accent-subtle text-accent"
                      : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary",
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-accent" : "text-text-tertiary",
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — org identity */}
      <div className="border-t border-border px-4 py-3">
        <Link href="/overview" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-text-primary">Athanor Labs</div>
            <div className="text-[10px] text-text-tertiary">{ATHANOR_ENVIRONMENTS.length} shipped environments</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
