"use client";

// Knowledge Base for agents: create / edit / publish articles (FR-30) and
// open drafts generated from resolved tickets (FR-32, via ?edit=<id>).

import { useCallback, useEffect, useState } from "react";
import Breadcrumb from "../components/Breadcrumb";
import {
  AGENT_BASE,
  api,
  errorMessage,
  formatDate,
  useSessionUser,
  type Article,
  type ArticleRow,
  type Category,
} from "../lib/api";

type Scope = "mine" | "published";

type Editor = {
  id: number | null; // null = new article
  title: string;
  content: string;
  categoryId: string;
  status: "Draft" | "Published";
  readOnly: boolean;
  authorName: string;
};

const emptyEditor = (categoryId: string): Editor => ({
  id: null,
  title: "",
  content: "",
  categoryId,
  status: "Draft",
  readOnly: false,
  authorName: "",
});

const articleStatusStyle = (status: string) =>
  status === "Published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800";

export default function AgentKnowledgeBasePage() {
  const me = useSessionUser();
  const myId = me?.user_id;
  const [scope, setScope] = useState<Scope>("mine");
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [kbSearch, setKbSearch] = useState("");
  const [kbCategory, setKbCategory] = useState("");

  const loadList = useCallback(async (which: Scope) => {
    try {
      setArticles(await api<ArticleRow[]>(`/kb?scope=${which}`));
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Could not load articles."));
    } finally {
      setLoading(false);
    }
  }, []);

  const openArticle = useCallback(async (id: number, myId: number | undefined) => {
    try {
      const article = await api<Article>(`/kb/${id}`);
      setEditor({
        id: article.article_id,
        title: article.title,
        content: article.content,
        categoryId: String(article.category_id),
        status: article.status === "Published" ? "Published" : "Draft",
        readOnly: article.author_id !== myId,
        authorName: article.author_name,
      });
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Could not open the article."));
    }
  }, []);

  useEffect(() => {
    api<Category[]>("/categories")
      .then(setCategories)
      .catch((err) => setError(errorMessage(err, "Could not load categories.")));
  }, []);

  // open the article named in ?edit=<id> (used by "Create Knowledge Base draft")
  useEffect(() => {
    const editId = Number(new URLSearchParams(window.location.search).get("edit"));
    if (!(Number.isInteger(editId) && editId > 0 && myId !== undefined)) return;

    const timer = setTimeout(() => void openArticle(editId, myId), 0);
    return () => clearTimeout(timer);
  }, [myId, openArticle]);

  useEffect(() => {
    const timer = setTimeout(() => void loadList(scope), 0);
    return () => clearTimeout(timer);
  }, [scope, loadList]);

  function switchScope(next: Scope) {
    setLoading(true);
    setScope(next);
  }

  async function save(status: "Draft" | "Published") {
    if (!editor) return;
    setNotice("");
    setSaving(true);
    try {
      const body = {
        title: editor.title,
        content: editor.content,
        category_id: Number(editor.categoryId),
        status,
      };
      if (editor.id === null) {
        await api("/kb", { method: "POST", body });
      } else {
        await api(`/kb/${editor.id}`, { method: "PUT", body });
      }
      setNotice(status === "Published" ? "Article published." : "Draft saved.");
      setEditor(null);
      setError("");
      if (scope !== "mine") setScope("mine");
      else await loadList("mine");
    } catch (err) {
      setError(errorMessage(err, "Could not save the article."));
    } finally {
      setSaving(false);
    }
  }

  const shown = articles.filter((a) => {
    if (kbCategory && String(a.category_id) !== kbCategory) return false;
    const query = kbSearch.toLowerCase().trim();
    return !query || `${a.title} ${a.category_name} ${a.author_name}`.toLowerCase().includes(query);
  });

  const canSave =
    editor !== null &&
    !editor.readOnly &&
    editor.title.trim() !== "" &&
    editor.content.trim() !== "" &&
    editor.categoryId !== "";

  return (
    <>
      <Breadcrumb items={[{ label: "Overview", href: AGENT_BASE }, { label: "Knowledge Base" }]} />
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mt-1 text-2xl font-bold">Knowledge Base</h1>
          <p className="mt-1 text-sm text-slate-500">
            Write self-help articles. Drafts are only visible to you until you publish them.
          </p>
        </div>
        <button
          onClick={() => {
            setNotice("");
            setEditor(emptyEditor(categories[0] ? String(categories[0].category_id) : ""));
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New article
        </button>
      </header>

      {notice && (
        <div role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {editor && (
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {editor.readOnly
              ? `Article by ${editor.authorName}`
              : editor.id === null
              ? "New article"
              : "Edit article"}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="kb-title" className="mb-1 block text-sm font-medium text-slate-700">
                Title *
              </label>
              <input
                id="kb-title"
                value={editor.title}
                maxLength={200}
                disabled={editor.readOnly}
                onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label htmlFor="kb-category" className="mb-1 block text-sm font-medium text-slate-700">
                Category *
              </label>
              <select
                id="kb-category"
                value={editor.categoryId}
                disabled={editor.readOnly}
                onChange={(e) => setEditor({ ...editor, categoryId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50 sm:w-72"
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="kb-content" className="mb-1 block text-sm font-medium text-slate-700">
                Content *
              </label>
              <textarea
                id="kb-content"
                rows={12}
                value={editor.content}
                disabled={editor.readOnly}
                onChange={(e) => setEditor({ ...editor, content: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {!editor.readOnly && (
                <>
                  <button
                    onClick={() => save("Draft")}
                    disabled={!canSave || saving}
                    className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save as draft"}
                  </button>
                  <button
                    onClick={() => save("Published")}
                    disabled={!canSave || saving}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Publish
                  </button>
                </>
              )}
              <button
                onClick={() => setEditor(null)}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm hover:bg-slate-50"
              >
                {editor.readOnly ? "Close" : "Cancel"}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-5">
          {(
            [
              ["mine", "My articles"],
              ["published", "All published"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => switchScope(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                scope === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
          <input
            type="search"
            value={kbSearch}
            onChange={(e) => setKbSearch(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 sm:ml-auto sm:w-64"
          />
          <select
            value={kbCategory}
            onChange={(e) => setKbCategory(e.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Title</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Author</th>
                <th className="px-5 py-4">Updated</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Loading articles…
                  </td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    {kbSearch || kbCategory
                      ? "No articles match your search."
                      : scope === "mine"
                      ? "You have not written any articles yet."
                      : "No articles have been published yet."}
                  </td>
                </tr>
              ) : (
                shown.map((a) => (
                  <tr key={a.article_id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">{a.title}</td>
                    <td className="px-5 py-4">{a.category_name}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${articleStatusStyle(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">{a.author_name}</td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(a.updated_at)}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openArticle(a.article_id, me?.user_id)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        {a.author_id === me?.user_id ? "Edit" : "View"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
