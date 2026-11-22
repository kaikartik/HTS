"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listKbArticles, searchKb } from "../../_lib/requesterApi";
import { themeClasses } from "../../_lib/theme";
import type { KnowledgeBaseArticle } from "../../_lib/mockKb";

function LoadingArticles() {
  return (
    <div role="status" aria-label="Loading articles" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} aria-hidden="true" className="min-h-52 animate-pulse rounded-xl border border-[#D9E2EF] bg-white p-5">
          <div className="h-5 w-2/3 rounded bg-[#E6EEF8]" />
          <div className="mt-4 h-3 w-full rounded bg-[#E6EEF8]" />
          <div className="mt-2 h-3 w-4/5 rounded bg-[#E6EEF8]" />
          <div className="mt-6 h-5 w-24 rounded bg-[#E6EEF8]" />
        </div>
      ))}
    </div>
  );
}

function ArticleCard({ article }: { article: KnowledgeBaseArticle }) {
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-[#D9E2EF] bg-white p-5 transition hover:border-[#00448E]/40 hover:shadow-[0_8px_24px_rgba(15,31,51,0.07)]">
      <p className="text-xs font-semibold text-[#00448E]">{article.category}</p>
      <h3 className="mt-2 break-words text-base font-semibold leading-6 text-[#0F1F33]">{article.title}</h3>
      <p className="mt-2 flex-1 break-words text-sm leading-6 text-[#5B6B80]">{article.summary}</p>
      <ul aria-label="Tags" className="mt-4 flex flex-wrap gap-2">
        {article.tags.slice(0, 4).map((tag) => (
          <li key={tag} className="max-w-full break-words rounded-full bg-[#F4F7FB] px-2.5 py-1 text-xs text-[#5B6B80]">{tag}</li>
        ))}
      </ul>
      <Link href={`/requester-agni/kb/${article.id}`} className="mt-5 inline-flex min-h-11 items-center gap-1 self-start rounded-sm text-sm font-semibold text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">
        Read article <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[] | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const syncQuery = () => setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    syncQuery();
    window.addEventListener("popstate", syncQuery);

    listKbArticles()
      .then((result) => {
        if (active) setArticles(result);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load articles.");
      });

    return () => {
      active = false;
      window.removeEventListener("popstate", syncQuery);
    };
  }, []);

  const categories = useMemo(
    () => [...new Set((articles ?? []).map((article) => article.category))].sort((first, second) => first.localeCompare(second)),
    [articles],
  );
  const visibleArticles = useMemo(() => {
    if (!articles) return [];
    const matching = query.trim() ? searchKb(query, articles.length) : [...articles].sort((first, second) => second.views - first.views);
    return matching.filter((article) => selectedCategory === "All" || article.category === selectedCategory);
  }, [articles, query, selectedCategory]);

  function updateQuery(value: string) {
    setQuery(value);
    const params = new URLSearchParams(window.location.search);
    if (value) params.set("q", value);
    else params.delete("q");
    const queryString = params.toString();
    window.history.replaceState(null, "", queryString ? `/requester-agni/kb?${queryString}` : "/requester-agni/kb");
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1180px]">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#00448E]">Help and guidance</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0F1F33]">Knowledge Base</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B6B80]">Find answers and step-by-step guidance for common campus issues.</p>
      </header>

      <label htmlFor="kb-search" className="sr-only">Search articles</label>
      <input
        id="kb-search"
        type="search"
        value={query}
        onChange={(event) => updateQuery(event.target.value)}
        placeholder="Search articles, topics or keywords"
        className={`${themeClasses.authInput} h-14 text-base sm:text-lg`}
      />

      <nav aria-label="Filter articles by category" className="mt-5 flex flex-wrap gap-2">
        {["All", ...categories].map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedCategory(category)}
              className={`min-h-10 rounded-full border px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] ${isSelected ? "border-[#00448E] bg-[#00448E] text-white" : "border-[#D9E2EF] bg-white text-[#5B6B80] hover:border-[#00448E] hover:text-[#00448E]"}`}
            >
              {category}
            </button>
          );
        })}
      </nav>

      <section aria-labelledby="kb-results-heading" className="mt-8">
        <div className="mb-4">
          <h2 id="kb-results-heading" className="text-xl font-semibold text-[#0F1F33]">
            {query.trim() ? "Search results" : "Popular articles"}
          </h2>
          {query.trim() && <p className="mt-1 text-sm text-[#5B6B80]">Results for “{query}”</p>}
        </div>

        {articles === null && !loadError ? (
          <LoadingArticles />
        ) : loadError ? (
          <p role="alert" className="rounded-lg border border-[#f1c7c3] bg-[#fbf1ef] p-4 text-sm text-[#a52d2a]">{loadError}</p>
        ) : visibleArticles.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleArticles.map((article) => <ArticleCard key={article.id} article={article} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#D9E2EF] bg-white px-5 py-10 text-center">
            <h3 className="text-base font-semibold text-[#0F1F33]">No articles found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5B6B80]">Try another search or category. If you still need help, our support team can assist you.</p>
            <Link href="/requester-agni/tickets/new" className={`mx-auto mt-5 sm:w-auto ${themeClasses.primaryButton}`}>Raise a ticket</Link>
          </div>
        )}
      </section>

      <aside className="mt-10 flex min-w-0 flex-col gap-4 rounded-xl border border-[#D9E2EF] bg-[#E6EEF8] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-[#0F1F33]">Can&apos;t find what you need?</h2>
          <p className="mt-1 text-sm text-[#5B6B80]">Tell us what you need help with and we&apos;ll get back to you.</p>
        </div>
        <Link href="/requester-agni/tickets/new" className={`${themeClasses.primaryButton} sm:w-auto`}>Raise a ticket</Link>
      </aside>
    </div>
  );
}
