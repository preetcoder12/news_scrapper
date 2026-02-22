"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Globe,
  TrendingUp,
  Cpu,
  Briefcase,
  Search,
  ExternalLink,
  RefreshCcw,
  Newspaper,
  LayoutGrid,
  Filter
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NewsItem {
  id: number;
  source: string;
  category: string;
  title: string;
  description: string;
  image_url: string;
  source_url: string;
  scraped_at: string;
}

const CATEGORIES = ["home", "india", "world", "business", "tech", "entertainment", "sports"];
const SOURCES = ["IndiaToday", "BBC", "CNN", "Reuters", "AlJazeera"];

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("home");
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchNews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("global_news")
        .select("*")
        .order("scraped_at", { ascending: false });

      if (activeCategory !== "home") {
        query = query.eq("category", activeCategory);
      }

      if (activeSource) {
        query = query.eq("source", activeSource);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNews(data || []);
    } catch (err) {
      console.error("Error fetching news:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [activeCategory, activeSource]);

  const filteredNews = news.filter((item, index, self) => {
    // 1. Basic Quality Checks
    const isHighQuality =
      item.title &&
      item.title !== "No Title" &&
      item.title.length > 20 &&
      item.description &&
      item.description !== "No Description" &&
      item.description.length > 30;

    if (!isHighQuality) return false;

    // 2. Search Match
    const hasSearchMatch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!hasSearchMatch) return false;

    // 3. De-duplicate (keep only first occurrence of a title)
    const firstIndex = self.findIndex(t => t.title === item.title);
    return index === firstIndex;
  });

  return (
    <div className="min-h-screen text-white pb-20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-violet-600 to-pink-500 p-2 rounded-lg">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              NEWS<span className="text-violet-500">VAULT</span>
            </h1>
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
            <input
              type="text"
              placeholder="Search global news..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={() => fetchNews()}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* Hero Section */}
        <section className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-64 md:h-96 rounded-3xl overflow-hidden glass-card group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
            <div className="absolute inset-0 bg-violet-600/10 mix-blend-overlay" />

            <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 w-full md:w-2/3">
              <div className="flex items-center gap-2 mb-4">
                <div className="px-3 py-1 bg-violet-500 text-xs font-bold rounded-full uppercase tracking-widest leading-none flex items-center h-5">
                  Live Updates
                </div>
                <div className="text-gray-400 text-sm flex items-center gap-1">
                  <Globe className="w-4 h-4" /> 58+ global sources monitored
                </div>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
                Global news intelligence, <br />
                <span className="premium-gradient-text">delivered in real-time.</span>
              </h2>
            </div>
          </motion.div>
        </section>

        {/* Filters & Categories */}
        <div className="mb-12 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap",
                  activeCategory === cat
                    ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20 shadow-inner"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white"
                )}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-2 bg-white/5 rounded-2xl w-fit border border-white/5">
            <button
              onClick={() => setActiveSource(null)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                activeSource === null ? "bg-white text-black" : "text-gray-500 hover:text-gray-300"
              )}
            >
              All Sources
            </button>
            {SOURCES.map((src) => (
              <button
                key={src}
                onClick={() => setActiveSource(src)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  activeSource === src ? "bg-white text-black" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredNews.length > 0 ? (
                filteredNews.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group glass-card overflow-hidden news-card-hover flex flex-col h-full"
                  >
                    <Link href={`/news/${item.id}`} className="relative h-48 overflow-hidden block">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1585007600263-ad52c0e87d5d?q=80&w=2070&auto=format&fit=crop";
                        }}
                      />
                      <div className="absolute top-4 left-4 z-10">
                        <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] uppercase font-black border border-white/10 tracking-widest">
                          {item.source}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    </Link>

                    <div className="p-6 flex flex-col grow">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">{item.category}</span>
                        <span className="text-[10px] text-gray-500">•</span>
                        <span className="text-[10px] text-gray-500">{new Date(item.scraped_at).toLocaleTimeString()}</span>
                      </div>
                      <Link href={`/news/${item.id}`}>
                        <h3 className="text-lg font-bold mb-3 line-clamp-2 leading-snug group-hover:text-violet-400 transition-colors">
                          {item.title}
                        </h3>
                      </Link>
                      <p className="text-gray-400 text-sm line-clamp-3 mb-6 font-light leading-relaxed">
                        {item.description === "No Description" ? "" : item.description}
                      </p>

                      <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                        <Link
                          href={`/news/${item.id}`}
                          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                        >
                          READ MORE <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <div className="inline-block p-6 bg-white/5 rounded-full mb-6">
                    <Filter className="w-12 h-12 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-400">No news found</h3>
                  <p className="text-gray-600">Try adjusting your filters or search query.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-6 mt-32 border-t border-white/5 pt-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-gradient-to-tr from-violet-600 to-pink-500 p-1 rounded">
            <Newspaper className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            NEWS<span className="text-violet-500">VAULT</span>
          </h1>
        </div>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-[0.2em]">
          Automated Global Intelligence Engine © 2026
        </p>
      </footer>
    </div>
  );
}
