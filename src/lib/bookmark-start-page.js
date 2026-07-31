const URL_PATTERN = /^https?:\/\//i;
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i;

export function normalizeBookmarkUrl(value) {
  const input = String(value || "").trim();
  if (!input) {
    throw new Error("URL is required.");
  }

  if (SCHEME_PATTERN.test(input) && !URL_PATTERN.test(input)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const candidate = URL_PATTERN.test(input) ? input : `https://${input}`;
  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Enter a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  parsed.hash = parsed.hash;
  return parsed.toString();
}

export function getBookmarkHost(url) {
  try {
    return new URL(normalizeBookmarkUrl(url)).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function getBookmarkFaviconUrl(url) {
  try {
    return new URL("/favicon.ico", normalizeBookmarkUrl(url)).toString();
  } catch {
    return "";
  }
}

export function createBookmarkTitleFallback(url) {
  return getBookmarkHost(url) || "Untitled bookmark";
}

function decodeHtmlEntity(entity) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: "\"",
  };
  const value = entity.slice(1, -1);

  if (value.startsWith("#x")) {
    return String.fromCodePoint(Number.parseInt(value.slice(2), 16));
  }

  if (value.startsWith("#")) {
    return String.fromCodePoint(Number.parseInt(value.slice(1), 10));
  }

  return namedEntities[value] || entity;
}

export function extractHtmlTitle(html) {
  const titleMatch = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return "";

  return titleMatch[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|apos|gt|lt|quot|#\d+|#x[\da-f]+);/gi, decodeHtmlEntity)
    .replace(/\s+/g, " ")
    .trim();
}

function getHtmlAttribute(tag, attribute) {
  const match = String(tag).match(
    new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  return (match?.[1] || match?.[2] || match?.[3] || "").replace(/&amp;/gi, "&");
}

export function extractHtmlFaviconUrl(html, pageUrl) {
  const linkTags = String(html || "").match(/<link\b[^>]*>/gi) || [];

  for (const tag of linkTags) {
    const rel = getHtmlAttribute(tag, "rel");
    if (!/(?:^|\s)(?:icon|shortcut|apple-touch-icon)(?:\s|$)/i.test(rel)) continue;

    const href = getHtmlAttribute(tag, "href");
    if (!href) continue;

    try {
      const faviconUrl = new URL(href, normalizeBookmarkUrl(pageUrl));
      if (["http:", "https:"].includes(faviconUrl.protocol)) return faviconUrl.toString();
    } catch {
      // Try the next declared icon.
    }
  }

  return getBookmarkFaviconUrl(pageUrl);
}

export function sortCollections(collections) {
  return [...(collections || [])].sort((a, b) => {
    const positionDiff = Number(a.position || 0) - Number(b.position || 0);
    if (positionDiff !== 0) return positionDiff;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export function sortBookmarks(bookmarks) {
  return [...(bookmarks || [])].sort((a, b) => {
    if (Boolean(a.isFavorite) !== Boolean(b.isFavorite)) {
      return a.isFavorite ? -1 : 1;
    }

    const positionDiff = Number(a.position || 0) - Number(b.position || 0);
    if (positionDiff !== 0) return positionDiff;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function textMatches(value, query) {
  return String(value || "").toLowerCase().includes(query);
}

export function filterBookmarkBoard(collections, bookmarks, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const sortedCollections = sortCollections(collections);
  const bookmarksByCollection = new Map();

  for (const bookmark of sortBookmarks(bookmarks)) {
    const list = bookmarksByCollection.get(bookmark.collectionId) || [];
    list.push(bookmark);
    bookmarksByCollection.set(bookmark.collectionId, list);
  }

  if (!normalizedQuery) {
    return sortedCollections.map((collection) => ({
      ...collection,
      bookmarks: bookmarksByCollection.get(collection.id) || [],
    }));
  }

  return sortedCollections
    .map((collection) => {
      const collectionMatches =
        textMatches(collection.name, normalizedQuery) ||
        textMatches(collection.description, normalizedQuery);
      const collectionBookmarks = bookmarksByCollection.get(collection.id) || [];
      const bookmarksForCollection = collectionMatches
        ? collectionBookmarks
        : collectionBookmarks.filter(
            (bookmark) =>
              textMatches(bookmark.title, normalizedQuery) ||
              textMatches(bookmark.url, normalizedQuery) ||
              textMatches(bookmark.description, normalizedQuery),
          );

      return {
        ...collection,
        bookmarks: bookmarksForCollection,
      };
    })
    .filter((collection) => collection.bookmarks.length > 0 || textMatches(collection.name, normalizedQuery));
}

export function parseBookmarkLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const normalizedUrl = normalizeBookmarkUrl(line);
      return {
        title: createBookmarkTitleFallback(normalizedUrl),
        url: normalizedUrl,
        faviconUrl: getBookmarkFaviconUrl(normalizedUrl),
        description: "",
        position: index,
        isFavorite: false,
      };
    });
}

export function exportBookmarkBoard(collections, bookmarks) {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      collections: sortCollections(collections).map((collection) => ({
        id: collection.id,
        name: collection.name,
        description: collection.description || "",
        color: collection.color || "#7dd3fc",
        position: Number(collection.position || 0),
      })),
      bookmarks: sortBookmarks(bookmarks).map((bookmark) => ({
        id: bookmark.id,
        collectionId: bookmark.collectionId,
        title: bookmark.title,
        url: normalizeBookmarkUrl(bookmark.url),
        faviconUrl: bookmark.faviconUrl || getBookmarkFaviconUrl(bookmark.url),
        description: bookmark.description || "",
        position: Number(bookmark.position || 0),
        isFavorite: Boolean(bookmark.isFavorite),
      })),
    },
    null,
    2,
  );
}

export function parseBookmarkBoardExport(value) {
  let parsed;

  try {
    parsed = JSON.parse(String(value || ""));
  } catch {
    throw new Error("Import must be valid JSON.");
  }

  if (!Array.isArray(parsed.collections) || !Array.isArray(parsed.bookmarks)) {
    throw new Error("Import must include collections and bookmarks arrays.");
  }

  const collectionIds = new Set();
  const collections = parsed.collections.map((collection, index) => {
    const id = String(collection.id || `collection-${index}`).trim();
    const name = String(collection.name || "").trim();
    if (!name) {
      throw new Error("Every collection needs a name.");
    }
    collectionIds.add(id);
    return {
      id,
      name,
      description: String(collection.description || ""),
      color: String(collection.color || "#7dd3fc"),
      position: Number.isFinite(Number(collection.position)) ? Number(collection.position) : index,
    };
  });

  const bookmarks = parsed.bookmarks.map((bookmark, index) => {
    const collectionId = String(bookmark.collectionId || "").trim();
    if (!collectionIds.has(collectionId)) {
      throw new Error("Every bookmark must reference an imported collection.");
    }

    const url = normalizeBookmarkUrl(bookmark.url);
    return {
      id: String(bookmark.id || `bookmark-${index}`).trim(),
      collectionId,
      title: String(bookmark.title || createBookmarkTitleFallback(url)).trim(),
      url,
      faviconUrl: String(bookmark.faviconUrl || getBookmarkFaviconUrl(url)),
      description: String(bookmark.description || ""),
      position: Number.isFinite(Number(bookmark.position)) ? Number(bookmark.position) : index,
      isFavorite: Boolean(bookmark.isFavorite),
    };
  });

  return {
    collections: sortCollections(collections),
    bookmarks: sortBookmarks(bookmarks),
  };
}
