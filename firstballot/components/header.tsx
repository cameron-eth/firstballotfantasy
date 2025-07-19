"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, User, LogOut, Menu, X, Lock } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const navigation = [
  { name: "OVERVIEW", href: "/" },
  { name: "TIERS", href: "/tiers" },
  { name: "DRAFT GUIDE", href: "/conversion" },
  { name: "LEAGUE BUDDY", href: "/league-buddy", requiresAuth: true },
  { name: "DRAFT BUDDY", href: "/draft-buddy", requiresAuth: true },
]

export function Header() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Main Header */}
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
              <Shield className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-green-400 font-mono tracking-wide">FIRST BALLOT</h1>
              <p className="text-xs text-gray-400 font-mono">FANTASY</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const requiresAuth = item.requiresAuth && !user
              return (
                <motion.div
                  key={item.name}
                  whileHover={!requiresAuth ? { scale: 1.02 } : {}}
                  whileTap={!requiresAuth ? { scale: 0.98 } : {}}
                >
                  <Link
                    href={item.href}
                    className={`px-4 py-2 text-sm font-mono transition-all duration-200 rounded-lg flex items-center space-x-2 ${
                      isActive
                        ? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/25"
                        : requiresAuth
                        ? "text-gray-500 cursor-not-allowed"
                        : "text-gray-300 hover:text-white hover:bg-slate-700/50 hover:shadow-md"
                    }`}
                    onClick={requiresAuth ? (e) => e.preventDefault() : undefined}
                    title={requiresAuth ? "Sign in required" : undefined}
                  >
                    <span>{item.name}</span>
                    {requiresAuth && <Lock className="h-3 w-3" />}
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="flex items-center space-x-3">
            {user ? (
              <motion.div 
                className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur-sm rounded-lg p-2 border border-slate-700/50"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-center w-6 h-6 bg-green-400/10 rounded-full">
                  <User className="h-3 w-3 text-green-400" />
                </div>
                <span className="text-green-400 text-sm font-mono hidden sm:block">{user.email}</span>
                <motion.button
                  onClick={signOut}
                  className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded"
                  title="Sign out"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <LogOut className="h-3 w-3" />
                </motion.button>
              </motion.div>
            ) : (
              <Link
                href="/login"
                className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono text-sm hover:bg-yellow-300 transition-all duration-200 shadow-lg shadow-yellow-400/25"
              >
                LOGIN
              </Link>
            )}

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </motion.button>
          </div>
        </div>

        {/* Subtitle Section */}
        <div className="hidden md:block pb-4">
          <div className="flex items-center space-x-4">
           
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden pb-4 border-t border-slate-700/50 pt-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <motion.nav 
                className="flex flex-col space-y-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                {navigation.map((item, index) => {
                  const isActive = pathname === item.href
                  const requiresAuth = item.requiresAuth && !user
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05, duration: 0.2 }}
                    >
                      <Link
                        href={item.href}
                        onClick={requiresAuth ? (e) => e.preventDefault() : () => setMobileMenuOpen(false)}
                        className={`px-4 py-3 text-sm font-mono transition-all duration-200 rounded-lg flex items-center justify-between ${
                          isActive
                            ? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/25"
                            : requiresAuth
                            ? "text-gray-500 cursor-not-allowed"
                            : "text-gray-300 hover:text-white hover:bg-slate-700/50"
                        }`}
                        title={requiresAuth ? "Sign in required" : undefined}
                      >
                        <span>{item.name}</span>
                        {requiresAuth && <Lock className="h-3 w-3" />}
                      </Link>
                    </motion.div>
                  )
                })}
              </motion.nav>
              
              {/* Mobile Subtitle */}
              <motion.div 
                className="mt-4 pt-4 border-t border-slate-700/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.2 }}
              >
                <p className="text-xs text-gray-400 font-mono">ADVANCED ANALYTICS • 2015-2024</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
