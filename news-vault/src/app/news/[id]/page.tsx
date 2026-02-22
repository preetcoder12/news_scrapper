"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Globe,
    ExternalLink,
    Calendar,
    Tag,
    Share2,
    Bookmark
} from "lucide-react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export default function NewsDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [article, setArticle] = useState<NewsItem | null>(null);
    const [recommended, setRecommended] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                // Fetch current article
                const { data: mainData, error: mainError } = await supabase
                    .from("global_news")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (mainError) throw mainError;
                setArticle(mainData);

                // Fetch recommended articles (same category, different ID)
                if (mainData) {
                    const { data: recData } = await supabase
                        .from("global_news")
                        .select("*")
                        .eq("category", mainData.category)
                        .neq("id", id)
                        .limit(3)
                        .order("scraped_at", { ascending: false });

                    const filteredRecs = (recData || []).filter(item =>
                        item.title &&
                        item.title !== "No Title" &&
                        item.title.length > 20 &&
                        item.description &&
                        item.description !== "No Description"
                    );
                    setRecommended(filteredRecs);
                }
            } catch (err) {
                console.error("Error fetching article details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
                <Link href="/" className="premium-button">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white bg-black">
            {/* Header / Nav */}
            <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-bold uppercase tracking-wider">Back</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><Share2 className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-white/5 rounded-full transition-colors"><Bookmark className="w-5 h-5" /></button>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <span className="px-3 py-1 bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded text-xs font-black uppercase tracking-widest">
                            {article.source}
                        </span>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Tag className="w-3 h-3" />
                            <span className="uppercase tracking-widest font-bold">{article.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(article.scraped_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                        </div>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black mb-8 leading-tight tracking-tight">
                        {article.title}
                    </h1>

                    {/* Featured Image */}
                    <div className="relative aspect-video rounded-3xl overflow-hidden mb-12 border border-white/10 shadow-2xl shadow-violet-500/5">
                        <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1585007600263-ad52c0e87d5d?q=80&w=2070&auto=format&fit=crop";
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="prose prose-invert max-w-none mb-16">
                        <div className="text-xl md:text-2xl text-gray-200 leading-relaxed font-light mb-12 first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-violet-500">
                            {article.description && article.description !== "No Description"
                                ? article.description
                                : "No detailed summary available for this headline. Please click the button below to read the full story on the official source website."}
                        </div>

                        <div className="flex items-center gap-4 py-8 border-y border-white/5 my-12">
                            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                <Globe className="w-6 h-6 text-violet-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Verified Global Source</p>
                                <p className="text-xs text-gray-500">Indexed by NewsVault intelligence engine</p>
                            </div>
                        </div>

                        <a
                            href={article.source_url}
                            target="_blank"
                            className="premium-button w-fit"
                        >
                            Read Full Article on {article.source} <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>

                    <hr className="border-white/5 mb-16" />

                    {/* Recommended Section */}
                    <section className="mb-20">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Globe className="w-6 h-6 text-violet-500" /> RECOMMENDED FOR YOU
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recommended.map((item) => (
                                <Link
                                    href={`/news/${item.id}`}
                                    key={item.id}
                                    className="group block"
                                >
                                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-white/10 group-hover:border-violet-500/50 transition-colors">
                                        <img
                                            src={item.image_url}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1585007600263-ad52c0e87d5d?q=80&w=2070&auto=format&fit=crop";
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">{item.source}</span>
                                        <h3 className="font-bold line-clamp-2 leading-snug group-hover:text-violet-400 transition-colors">
                                            {item.title}
                                        </h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 text-center bg-zinc-950/50">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    Automated Global Intelligence Engine © 2026
                </p>
            </footer>
        </div>
    );
}
