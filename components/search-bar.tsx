"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");

  return (
    <form
      className="search-bar"
      onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams(params.toString());
        next.delete("imported");
        next.delete("import_status");
        next.delete("selected");
        next.delete("sort");
        if (query.trim()) {
          next.set("q", query.trim());
        } else {
          next.delete("q");
        }
        router.push(`/?${next.toString()}`);
      }}
    >
      <input
        aria-label="Search glossary"
        placeholder="Search headings, body text, or hashtags; use -term to exclude"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
