"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RubyToggle } from "@/lib/rubyful";
import { TextSizeToggle } from "@/lib/text-size/text-size-toggle";

const NAV_LINKS = [
  { href: "/", label: "トップページ" },
  { href: "/bills", label: "議案を検索する" },
  { href: "/sessions", label: "過去の定例会" },
] as const;

export function HamburgerMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52" align="end">
        <nav className="flex flex-col">
          <ul className="flex flex-col divide-y divide-mirai-border">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block px-2 py-2.5 text-sm font-medium text-mirai-text hover:text-primary-accent transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 pt-3 mt-3 border-t border-mirai-border">
            <RubyToggle />
            <TextSizeToggle />
          </div>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
