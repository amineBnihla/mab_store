import Form from "next/form";

import { SearchIcon } from "@/components/icons";

type SearchFormProps = {
  /** Current query, prefilled on the results page. */
  defaultValue?: string;
  autoFocus?: boolean;
  /** Called on submit, e.g. to close the header panel. */
  onSubmit?: () => void;
};

/** Underlined search field that navigates to `/search?q=…`. */
export function SearchForm({ defaultValue, autoFocus, onSubmit }: SearchFormProps) {
  return (
    <Form action="/search" role="search" className="relative" onSubmit={onSubmit}>
      <label htmlFor="search-query" className="sr-only">
        Search products
      </label>
      <input
        // Remount when the query changes so the field reflects the URL.
        key={defaultValue}
        id="search-query"
        type="search"
        name="q"
        required
        maxLength={100}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        placeholder="Search for a piece, category or material"
        className="field pr-10 [&::-webkit-search-cancel-button]:appearance-none"
      />
      <button type="submit" className="btn-icon absolute right-0 bottom-0.5" aria-label="Search">
        <SearchIcon width={16} height={16} />
      </button>
    </Form>
  );
}
