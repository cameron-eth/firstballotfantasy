"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { LogOut, User } from "lucide-react"

const navigation = [
  { name: "OVERVIEW", href: "/" },
  { name: "TIERS", href: "/tiers" },
  // { name: "TEAM BUILDER", href: "/team-builder" },
  { name: "DRAFT GUIDE", href: "/conversion" },
  { name: "LEAGUE BUDDY", href: "/league-buddy" },
  { name: "DRAFT BUDDY", href: "/draft-buddy" },
  // { name: "TRENDS", href: "/insights" },
  // { name: "MODEL DOCS", href: "/metrics" },
  // { name: "EDA", href: "/analysis" },
]

export function Header() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold text-green-400">FIRST BALLOT FANTASY</h1>
              <p className="text-xs text-gray-400">ADVANCED ANALYTICS • 2015-2024</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-900 rounded-lg p-2">
                <User className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-sm font-mono">{user.email}</span>
                <button
                  onClick={signOut}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono text-sm hover:bg-yellow-300 transition-colors"
              >
                LOGIN
              </Link>
            )}
            <div className="flex items-center space-x-2 bg-slate-900 rounded-lg p-1">
              <span className="text-green-400 text-sm font-mono">R² = 0.74</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400">MODEL ACCURACY: VERIFIED</span>
            </div>
          </div>
        </div>

        <nav className="flex space-x-1 pb-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 text-sm font-mono transition-colors ${
                  isActive
                    ? "bg-yellow-400 text-slate-900 rounded-lg"
                    : "text-gray-300 hover:text-white hover:bg-slate-700 rounded-lg"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
