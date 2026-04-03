"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { IconType } from "react-icons";
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
  PiDownloadSimple,
} from "react-icons/pi";
import { ATHANOR_ENVIRONMENTS } from "@/data/environments";

interface NavItem {
  label: string;
  href: string;
  icon: IconType;
}

/** Core product tabs — used constantly by customers. */
const coreNavItems: NavItem[] = [
  { label: "Dashboard", href: "/overview", icon: PiHouseSimple },
  { label: "Environments", href: "/environments", icon: PiCube },
  { label: "Tasks", href: "/tasks", icon: PiListChecks },
  { label: "Runs", href: "/runs", icon: PiPlay },
  { label: "Launch Run", href: "/launch", icon: PiRocketLaunch },
  { label: "Scores", href: "/scores", icon: PiWaveSine },
  { label: "Baselines", href: "/baselines", icon: PiChartBar },
];

/** Setup & admin tabs — used occasionally for onboarding and configuration. */
const setupNavItems: NavItem[] = [
  { label: "Quick Start", href: "/quickstart", icon: PiLightning },
  { label: "Download", href: "/download", icon: PiDownloadSimple },
  { label: "Integration", href: "/training", icon: PiBrain },
  { label: "Credentials", href: "/credentials", icon: PiKey },
  { label: "Docs", href: "/docs", icon: PiBookOpen },
];

// Admin link is NOT in the nav — admins access it directly via /admin URL.
// This prevents customers from seeing an "Admin" link they can't use.

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/overview" && pathname.startsWith(item.href));
  const Icon = item.icon;

  return (
    <li>
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
}

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
        {/* Core product */}
        <ul className="space-y-0.5">
          {coreNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </ul>

        {/* Divider + Setup section */}
        <div className="my-3 border-t border-border" />
        <div className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Setup
        </div>
        <ul className="space-y-0.5">
          {setupNavItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
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
