"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getKbArticle, getKbRating, listKbArticles, rateKbArticle } from "../../../_lib/requesterApi";
import { themeClasses } from "../../../_lib/theme";
import type { KnowledgeBaseArticle } from "../../../_lib/mockKb";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function KnowledgeBaseArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRating, setIsRating] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setArticle(null);
    setIsLoading(true);
    setLoadError("");
    setRatingError("");
    setFeedbackSaved(false);

    Promise.all([getKbArticle(id), listKbArticles()])
      .then(([result, articles]) => {
        if (!active) return;
        setArticle(result);
        setRating(result ? getKbRating(result.id) : null);
        setRelatedArticles(result
          ? articles.filter((entry) => entry.category === result.category && entry.id !== result.id).slice(0, 3)
          : []);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load this article.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function handleRating(nextRating: number) {
    if (!article) return;
    setIsRating(true);
    setRatingError("");
    setFeedbackSaved(false);
    try {
      await rateKbArticle(article.id, nextRating);
      setRating(nextRating);
      setFeedbackSaved(true);
    } catch (error) {
      setRatingError(error instanceof Error ? error.message : "Your feedback could not be saved. Please try again.");
    } finally {
      setIsRating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[760px]">
        <Link href="/requester-agni/kb" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to Knowledge Base</Link>
        <div role="status" aria-label="Loading article" className="mt-4 animate-pulse rounded-xl border border-[#D9E2EF] bg-white p-6">
          <div className="h-4 w-32 rounded bg-[#E6EEF8]" />
          <div className="mt-5 h-8 w-3/4 rounded bg-[#E6EEF8]" />
          <div className="mt-8 space-y-3">
            <div className="h-4 rounded bg-[#E6EEF8]" />
            <div className="h-4 rounded bg-[#E6EEF8]" />
            <div className="h-4 w-4/5 rounded bg-[#E6EEF8]" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[760px]">
        <Link href="/requester-agni/kb" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to Knowledge Base</Link>
        <p role="alert" className="mt-4 rounded-lg border border-[#f1c7c3] bg-[#fbf1ef] p-4 text-sm text-[#a52d2a]">{loadError}</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-[760px]">
        <Link href="/requester-agni/kb" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to Knowledge Base</Link>
        <section className="mt-4 rounded-xl border border-dashed border-[#D9E2EF] bg-white px-5 py-12 text-center">
          <h1 className="text-xl font-semibold text-[#0F1F33]">Article not found</h1>
          <p className="mt-2 text-sm text-[#5B6B80]">This article does not exist or is not available.</p>
        </section>
      </div>
    );
  }

  const paragraphs = article.content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="mx-auto min-w-0 max-w-[760px]">
      <Link href="/requester-agni/kb" className="inline-flex min-h-12 items-center text-sm font-semibold text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">← Back to Knowledge Base</Link>

      <article className="mt-3 min-w-0 rounded-xl border border-[#D9E2EF] bg-white p-5 sm:p-8">
        <header className="border-b border-[#D9E2EF] pb-6">
          <p className="text-sm font-semibold text-[#00448E]">{article.category}</p>
          <h1 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight text-[#0F1F33] sm:text-3xl">{article.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#5B6B80]">{article.summary}</p>
          <ul aria-label="Article tags" className="mt-4 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <li key={tag} className="max-w-full break-words rounded-full bg-[#F4F7FB] px-3 py-1 text-xs font-medium text-[#5B6B80]">{tag}</li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-[#5B6B80]">Last updated <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time></p>
        </header>

        <div className="space-y-5 py-7">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 20)}`} className="whitespace-pre-wrap break-words text-base leading-7 text-[#0F1F33]">{paragraph}</p>
          ))}
        </div>

        <section aria-labelledby="article-rating-heading" className="border-t border-[#D9E2EF] py-6">
          <h2 id="article-rating-heading" className="text-base font-semibold text-[#0F1F33]">Was this helpful?</h2>
          <div role="group" aria-label="Rate this article from 1 to 5 stars" className="mt-3 flex flex-wrap items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                aria-pressed={rating === value}
                disabled={isRating}
                onClick={() => handleRating(value)}
                className="grid h-11 w-11 place-items-center rounded-md text-3xl leading-none text-[#00448E] transition hover:bg-[#E6EEF8] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#00448E] disabled:cursor-wait disabled:opacity-60"
              >
                <span aria-hidden="true">{rating !== null && value <= rating ? "★" : "☆"}</span>
              </button>
            ))}
          </div>
          {feedbackSaved && <p role="status" className="mt-2 text-sm font-medium text-[#166534]">Thanks for your feedback</p>}
          {ratingError && <p role="alert" className="mt-2 text-sm text-[#a52d2a]">{ratingError}</p>}
        </section>
      </article>

      {relatedArticles.length > 0 && (
        <section aria-labelledby="related-articles-heading" className="mt-8">
          <h2 id="related-articles-heading" className="text-lg font-semibold text-[#0F1F33]">Related articles</h2>
          <ul className="mt-3 divide-y divide-[#D9E2EF] rounded-xl border border-[#D9E2EF] bg-white px-4 sm:px-5">
            {relatedArticles.map((related) => (
              <li key={related.id}>
                <Link href={`/requester-agni/kb/${related.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3 text-sm font-medium text-[#00448E] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">
                  <span className="break-words">{related.title}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="mt-8 flex min-w-0 flex-col gap-4 rounded-xl border border-[#D9E2EF] bg-[#E6EEF8] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-[#0F1F33]">Still need help?</h2>
          <p className="mt-1 text-sm text-[#5B6B80]">Raise a ticket and our support team will be in touch.</p>
        </div>
        <Link href="/requester-agni/tickets/new" className={`${themeClasses.primaryButton} sm:w-auto`}>Raise a ticket</Link>
      </aside>
    </div>
  );
}
