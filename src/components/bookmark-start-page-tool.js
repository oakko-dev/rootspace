"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";
import {
  exportBookmarkBoard,
  filterBookmarkBoard,
  getBookmarkFaviconUrl,
  getBookmarkHost,
  normalizeBookmarkUrl,
  parseBookmarkBoardExport,
  parseBookmarkLines,
} from "@/lib/bookmark-start-page";
import {
  clearBookmarkBoardCache,
  getBookmarkBoardCacheKey,
  parseBookmarkBoardCache,
  parseBookmarkBoardPayload,
  readBookmarkBoardCache,
  writeBookmarkBoardCache,
} from "@/lib/bookmark-board-cache";
import {
  BOOKMARK_BOARD_USER_KEY,
  announceBookmarkBoardUser,
  clearBookmarkBoardUser,
  parseBookmarkBoardUser,
  readBookmarkBoardUser,
  writeBookmarkBoardUser,
} from "@/lib/bookmark-board-user";
import {
  BOOKMARK_OPENING_NEW_TAB,
  getBookmarkLinkTarget,
  readBookmarkOpeningPreference,
  writeBookmarkOpeningPreference,
} from "@/lib/bookmark-opening-preference";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import BookmarkOpeningSettings from "@/components/bookmark-opening-settings";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const COLORS = ["#7dd3fc", "#86efac", "#fbbf24", "#f0abfc", "#f87171", "#a5b4fc"];

class BookmarkBoardRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function createClientId() {
  return globalThis.crypto?.randomUUID?.() || String(Date.now());
}

async function requestBookmarkBoard(url = "/api/bookmark-board", options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new BookmarkBoardRequestError(
      payload.message || "Bookmark board request failed.",
      response.status,
    );
  }
  return payload;
}

function postBookmarkBoardAction(action) {
  return requestBookmarkBoard("/api/bookmark-board", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action),
  });
}

function reorderWithin(list, sourceId, targetId) {
  const next = [...list];
  const sourceIndex = next.findIndex((item) => item.id === sourceId);
  const targetIndex = next.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return list;
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((item, index) => ({ ...item, position: index }));
}

function moveByOffset(list, id, offset) {
  const index = list.findIndex((item) => item.id === id);
  const targetIndex = index + offset;
  if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(index, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((item, position) => ({ ...item, position }));
}

function BookmarkFavicon({ faviconUrl, title }) {
  const [hasFavicon, setHasFavicon] = useState(true);

  if (!faviconUrl || !hasFavicon) {
    return <Globe2 aria-hidden="true" className="size-4 shrink-0 text-[#777985]" />;
  }

  return (
    // Favicons come from user-defined bookmark origins.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faviconUrl}
      alt=""
      title={`${title} favicon`}
      width="16"
      height="16"
      loading="lazy"
      className="size-4 shrink-0 rounded-[3px] object-contain"
      onError={() => setHasFavicon(false)}
    />
  );
}

export default function BookmarkStartPageTool() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [verifiedUserId, setVerifiedUserId] = useState("");
  const boardRequestRevision = useRef(0);
  const mutationRevision = useRef(0);
  const [collections, setCollections] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [syncState, setSyncState] = useState("idle");
  const [bookmarkOpeningPreference, setBookmarkOpeningPreference] = useState(
    BOOKMARK_OPENING_NEW_TAB,
  );
  const [collectionDialog, setCollectionDialog] = useState({ open: false, item: null });
  const [bookmarkDialog, setBookmarkDialog] = useState({ open: false, item: null, collectionId: "" });
  const [importDialog, setImportDialog] = useState({ open: false, mode: "paste" });
  const [collectionForm, setCollectionForm] = useState({ name: "", description: "", color: COLORS[0] });
  const [bookmarkForm, setBookmarkForm] = useState({
    title: "",
    url: "",
    faviconUrl: "",
    description: "",
    collectionId: "",
  });
  const [importText, setImportText] = useState("");
  const [formError, setFormError] = useState("");
  const [titleLookupState, setTitleLookupState] = useState("idle");
  const [titleEdited, setTitleEdited] = useState(false);
  const [draggedCollectionId, setDraggedCollectionId] = useState("");
  const [draggedBookmark, setDraggedBookmark] = useState(null);
  const [collectionDropPreviewId, setCollectionDropPreviewId] = useState("");
  const [bookmarkDropPreview, setBookmarkDropPreview] = useState({ collectionId: "", bookmarkId: "" });
  const [contextMenu, setContextMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    type: "board",
    collection: null,
    bookmark: null,
  });

  const board = useMemo(
    () => filterBookmarkBoard(collections, bookmarks, ""),
    [collections, bookmarks],
  );
  const hasBoardData = collections.length > 0;
  const canEdit = Boolean(user?.id && verifiedUserId === user.id);

  useEffect(() => {
    const restorePreference = window.setTimeout(() => {
      setBookmarkOpeningPreference(readBookmarkOpeningPreference());
    }, 0);
    return () => window.clearTimeout(restorePreference);
  }, []);

  // Updates navigation immediately while the storage utility handles persistence failures.
  function changeBookmarkOpeningPreference(preference) {
    const saved = writeBookmarkOpeningPreference(preference);
    setBookmarkOpeningPreference(saved ? preference : BOOKMARK_OPENING_NEW_TAB);
  }

  async function upsertCollections(nextCollections) {
    if (!canEdit || nextCollections.length === 0) return;
    await postBookmarkBoardAction({
      action: "upsert-collections",
      collections: nextCollections,
    });
  }

  async function upsertBookmarks(nextBookmarks) {
    if (!canEdit || nextBookmarks.length === 0) return;
    await postBookmarkBoardAction({
      action: "upsert-bookmarks",
      bookmarks: nextBookmarks,
    });
  }

  async function mutateBoard(callback, nextBoard) {
    if (!canEdit) return;
    const revision = mutationRevision.current + 1;
    mutationRevision.current = revision;
    setSyncState("saving");
    try {
      await callback();
      if (mutationRevision.current === revision) {
        if (nextBoard) writeBookmarkBoardCache(user.id, nextBoard);
        setSyncState("saved");
        setTimeout(() => {
          if (mutationRevision.current === revision) setSyncState("idle");
        }, 1800);
      }
    } catch (error) {
      if (mutationRevision.current === revision) {
        setSyncState("error");
        setTimeout(() => {
          if (mutationRevision.current === revision) setSyncState("idle");
        }, 3000);
      }
      alert(error instanceof Error ? error.message : "Failed to sync bookmark board.");
    }
  }

  useEffect(() => {
    let disposed = false;

    async function loadBoard(hintedUserId = "") {
      const requestRevision = boardRequestRevision.current + 1;
      boardRequestRevision.current = requestRevision;
      const revisionAtStart = mutationRevision.current;
      const cachedBoard = hintedUserId ? readBookmarkBoardCache(hintedUserId) : null;
      const hasCachedBoard = Boolean(cachedBoard);

      if (cachedBoard) {
        setUser({ id: hintedUserId, cached: true });
        setVerifiedUserId("");
        setCollections(cachedBoard.collections);
        setBookmarks(cachedBoard.bookmarks);
        setLoading(false);
        setSyncState("syncing");
      } else {
        setUser(hintedUserId ? { id: hintedUserId, cached: true } : null);
        setVerifiedUserId("");
        setCollections([]);
        setBookmarks([]);
        setLoading(true);
        setSyncState("syncing");
      }

      try {
        const payload = await requestBookmarkBoard();
        const authenticatedUser = payload.user;
        if (!authenticatedUser || typeof authenticatedUser.id !== "string") {
          throw new Error("Bookmark board user was invalid.");
        }
        const freshBoard = parseBookmarkBoardPayload(payload, authenticatedUser.id);
        if (!freshBoard) throw new Error("Bookmark board response was invalid.");

        if (
          !disposed &&
          boardRequestRevision.current === requestRevision &&
          mutationRevision.current === revisionAtStart
        ) {
          setUser(authenticatedUser);
          setVerifiedUserId(authenticatedUser.id);
          setCollections(freshBoard.collections);
          setBookmarks(freshBoard.bookmarks);
          writeBookmarkBoardCache(authenticatedUser.id, freshBoard);
          writeBookmarkBoardUser(authenticatedUser.id);
          announceBookmarkBoardUser(authenticatedUser);
          setSyncState("idle");
          setDbError(null);
        }
      } catch (error) {
        if (disposed || boardRequestRevision.current !== requestRevision) return;

        if (error instanceof BookmarkBoardRequestError && error.status === 401) {
          if (hintedUserId) clearBookmarkBoardCache(hintedUserId);
          clearBookmarkBoardUser();
          announceBookmarkBoardUser(null);
          setUser(null);
          setVerifiedUserId("");
          setCollections([]);
          setBookmarks([]);
          router.replace("/login?next=/");
        } else if (hasCachedBoard) {
          setSyncState("error");
        } else {
          setDbError(`Database error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      } finally {
        if (!disposed && boardRequestRevision.current === requestRevision) setLoading(false);
      }
    }

    const cachedUser = readBookmarkBoardUser();
    loadBoard(cachedUser?.userId);

    function syncActiveUser(event) {
      if (event.key !== BOOKMARK_BOARD_USER_KEY) return;
      const nextUser = event.newValue ? parseBookmarkBoardUser(event.newValue) : null;
      if (!nextUser) {
        boardRequestRevision.current += 1;
        setUser(null);
        setVerifiedUserId("");
        setCollections([]);
        setBookmarks([]);
        router.replace("/login?next=/");
        return;
      }
      loadBoard(nextUser.userId);
    }

    window.addEventListener("storage", syncActiveUser);
    return () => {
      disposed = true;
      window.removeEventListener("storage", syncActiveUser);
    };
  }, [router]);

  useEffect(() => {
    if (!user?.id) return undefined;

    function syncCachedBoard(event) {
      if (event.key !== getBookmarkBoardCacheKey(user.id) || !event.newValue) return;
      const cachedBoard = parseBookmarkBoardCache(event.newValue, user.id);
      if (!cachedBoard) return;
      setCollections(cachedBoard.collections);
      setBookmarks(cachedBoard.bookmarks);
    }

    window.addEventListener("storage", syncCachedBoard);
    return () => window.removeEventListener("storage", syncCachedBoard);
  }, [user?.id]);

  useEffect(() => {
    if (!contextMenu.open) return undefined;

    function closeContextMenu() {
      setContextMenu((current) => ({ ...current, open: false }));
    }

    function closeContextMenuOnEscape(event) {
      if (event.key === "Escape") closeContextMenu();
    }

    window.addEventListener("click", closeContextMenu);
    window.addEventListener("scroll", closeContextMenu, true);
    window.addEventListener("keydown", closeContextMenuOnEscape);

    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("scroll", closeContextMenu, true);
      window.removeEventListener("keydown", closeContextMenuOnEscape);
    };
  }, [contextMenu.open]);

  function openCollectionDialog(collection = null) {
    if (!canEdit) return;
    setFormError("");
    setCollectionForm({
      name: collection?.name || "",
      description: collection?.description || "",
      color: collection?.color || COLORS[collections.length % COLORS.length],
    });
    setCollectionDialog({ open: true, item: collection });
  }

  function openBookmarkDialog(bookmark = null, collectionId = "") {
    if (!canEdit) return;
    const targetCollectionId = bookmark?.collectionId || collectionId || collections[0]?.id || "";
    setFormError("");
    setTitleLookupState("idle");
    setTitleEdited(Boolean(bookmark?.title));
    setBookmarkForm({
      title: bookmark?.title || "",
      url: bookmark?.url || "",
      faviconUrl: bookmark?.faviconUrl || "",
      description: bookmark?.description || "",
      collectionId: targetCollectionId,
    });
    setBookmarkDialog({ open: true, item: bookmark, collectionId: targetCollectionId });
  }

  async function fetchBookmarkMetadata(urlValue) {
    const normalizedUrl = normalizeBookmarkUrl(urlValue);
    const response = await fetch("/api/bookmark-title", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: normalizedUrl }),
    });

    if (!response.ok) {
      return { title: "", faviconUrl: getBookmarkFaviconUrl(normalizedUrl) };
    }

    const payload = await response.json();
    return {
      title: String(payload.title || "").trim(),
      faviconUrl: String(payload.faviconUrl || getBookmarkFaviconUrl(normalizedUrl)),
    };
  }

  async function lookupTitleForNewBookmark(urlValue) {
    try {
      if (
        bookmarkDialog.item &&
        normalizeBookmarkUrl(urlValue) === normalizeBookmarkUrl(bookmarkDialog.item.url) &&
        bookmarkForm.faviconUrl
      ) {
        return;
      }

      setTitleLookupState("loading");
      const metadata = await fetchBookmarkMetadata(urlValue);
      setBookmarkForm((current) => ({
        ...current,
        title: current.title.trim() || titleEdited ? current.title : metadata.title,
        faviconUrl: metadata.faviconUrl,
      }));
      setTitleLookupState(metadata.title ? "found" : "empty");
    } catch {
      setTitleLookupState("empty");
    }
  }

  function openPasteImportDialog(collectionId = "") {
    if (!canEdit) return;
    setFormError("");
    setImportText("");
    setBookmarkForm((current) => ({
      ...current,
      collectionId: collectionId || current.collectionId || collections[0]?.id || "",
    }));
    setImportDialog({ open: true, mode: "paste" });
  }

  function openJsonImportDialog() {
    if (!canEdit) return;
    setFormError("");
    setImportText("");
    setImportDialog({ open: true, mode: "json" });
  }

  function closeDialogs() {
    setCollectionDialog({ open: false, item: null });
    setBookmarkDialog({ open: false, item: null, collectionId: "" });
    setImportDialog({ open: false, mode: "paste" });
  }

  function openContextMenu(event, type, { collection = null, bookmark = null } = {}) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      type,
      collection,
      bookmark,
    });
  }

  function runContextMenuAction(callback) {
    setContextMenu((current) => ({ ...current, open: false }));
    callback();
  }

  async function saveCollection(event) {
    event.preventDefault();
    if (!canEdit) return;
    const name = collectionForm.name.trim();
    if (!name) {
      setFormError("Collection name is required.");
      return;
    }

    const nextCollection = {
      id: collectionDialog.item?.id || createClientId(),
      name,
      description: collectionForm.description.trim(),
      color: collectionForm.color,
      position: collectionDialog.item?.position ?? collections.length,
    };

    const nextCollections = collectionDialog.item
      ? collections.map((collection) => (collection.id === nextCollection.id ? nextCollection : collection))
      : [...collections, nextCollection];

    setCollections(nextCollections);
    closeDialogs();
    await mutateBoard(
      () => upsertCollections([nextCollection]),
      { collections: nextCollections, bookmarks },
    );
  }

  async function deleteCollection(collection) {
    if (!canEdit) return;
    if (collections.length <= 1) {
      alert("Keep at least one collection on the board.");
      return;
    }
    if (!confirm(`Delete "${collection.name}" and its bookmarks?`)) return;

    const nextCollections = collections
      .filter((item) => item.id !== collection.id)
      .map((item, position) => ({ ...item, position }));
    const nextBookmarks = bookmarks.filter((bookmark) => bookmark.collectionId !== collection.id);

    setCollections(nextCollections);
    setBookmarks(nextBookmarks);
    await mutateBoard(
      () =>
        postBookmarkBoardAction({
          action: "delete-collection",
          collectionId: collection.id,
          collections: nextCollections,
        }),
      { collections: nextCollections, bookmarks: nextBookmarks },
    );
  }

  async function saveBookmark(event) {
    event.preventDefault();
    if (!canEdit) return;
    let normalizedUrl;
    let title = bookmarkForm.title.trim();
    let faviconUrl = bookmarkForm.faviconUrl;

    try {
      normalizedUrl = normalizeBookmarkUrl(bookmarkForm.url);
      const urlChanged =
        !bookmarkDialog.item ||
        normalizeBookmarkUrl(bookmarkDialog.item.url) !== normalizedUrl;
      if (urlChanged || !title || !faviconUrl) {
        const metadata = await fetchBookmarkMetadata(normalizedUrl);
        title ||= metadata.title;
        faviconUrl = metadata.faviconUrl;
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Enter a valid URL.");
      return;
    }

    const nextBookmark = {
      id: bookmarkDialog.item?.id || createClientId(),
      collectionId: bookmarkForm.collectionId || collections[0]?.id,
      title: title || getBookmarkHost(normalizedUrl),
      url: normalizedUrl,
      faviconUrl: faviconUrl || getBookmarkFaviconUrl(normalizedUrl),
      description: bookmarkForm.description.trim(),
      position: bookmarkDialog.item?.position ?? bookmarks.filter((item) => item.collectionId === bookmarkForm.collectionId).length,
      isFavorite: Boolean(bookmarkDialog.item?.isFavorite),
    };

    const nextBookmarks = bookmarkDialog.item
      ? bookmarks.map((bookmark) => (bookmark.id === nextBookmark.id ? nextBookmark : bookmark))
      : [...bookmarks, nextBookmark];

    setBookmarks(nextBookmarks);
    closeDialogs();
    await mutateBoard(
      () => upsertBookmarks([nextBookmark]),
      { collections, bookmarks: nextBookmarks },
    );
  }

  async function deleteBookmark(bookmark) {
    if (!canEdit) return;
    if (!confirm(`Delete "${bookmark.title}"?`)) return;
    const nextBookmarks = bookmarks.filter((item) => item.id !== bookmark.id);
    setBookmarks(nextBookmarks);
    await mutateBoard(
      () => postBookmarkBoardAction({ action: "delete-bookmark", bookmarkId: bookmark.id }),
      { collections, bookmarks: nextBookmarks },
    );
  }

  async function toggleFavorite(bookmark) {
    if (!canEdit) return;
    const nextBookmark = { ...bookmark, isFavorite: !bookmark.isFavorite };
    const nextBookmarks = bookmarks.map((item) => (item.id === bookmark.id ? nextBookmark : item));
    setBookmarks(nextBookmarks);
    await mutateBoard(
      () => upsertBookmarks([nextBookmark]),
      { collections, bookmarks: nextBookmarks },
    );
  }

  async function reorderCollections(sourceId, targetId) {
    if (!canEdit) return;
    const nextCollections = reorderWithin(collections, sourceId, targetId);
    setCollections(nextCollections);
    await mutateBoard(
      () => upsertCollections(nextCollections),
      { collections: nextCollections, bookmarks },
    );
  }

  async function moveCollection(collectionId, offset) {
    if (!canEdit) return;
    const nextCollections = moveByOffset(collections, collectionId, offset);
    setCollections(nextCollections);
    await mutateBoard(
      () => upsertCollections(nextCollections),
      { collections: nextCollections, bookmarks },
    );
  }

  async function reorderBookmark(sourceBookmark, targetCollectionId, targetBookmarkId = "") {
    if (!canEdit) return;
    if (sourceBookmark.id === targetBookmarkId) return;

    const remainingBookmarks = bookmarks.filter((bookmark) => bookmark.id !== sourceBookmark.id);
    const collectionBookmarks = remainingBookmarks.filter((bookmark) => bookmark.collectionId === targetCollectionId);
    const insertIndex = targetBookmarkId
      ? Math.max(
          0,
          collectionBookmarks.findIndex((bookmark) => bookmark.id === targetBookmarkId),
        )
      : collectionBookmarks.length;
    const movedBookmark = { ...sourceBookmark, collectionId: targetCollectionId };
    collectionBookmarks.splice(insertIndex, 0, movedBookmark);

    const reorderedIds = new Set(collectionBookmarks.map((bookmark) => bookmark.id));
    const nextBookmarks = [
      ...remainingBookmarks.filter((bookmark) => bookmark.collectionId !== targetCollectionId),
      ...collectionBookmarks.map((bookmark, position) => ({ ...bookmark, position })),
    ].map((bookmark) => {
      if (reorderedIds.has(bookmark.id)) return bookmark;
      const siblings = remainingBookmarks.filter((item) => item.collectionId === bookmark.collectionId);
      return { ...bookmark, position: siblings.findIndex((item) => item.id === bookmark.id) };
    });

    setBookmarks(nextBookmarks);
    await mutateBoard(
      () => upsertBookmarks(nextBookmarks),
      { collections, bookmarks: nextBookmarks },
    );
  }

  function clearDragState() {
    setDraggedCollectionId("");
    setDraggedBookmark(null);
    setCollectionDropPreviewId("");
    setBookmarkDropPreview({ collectionId: "", bookmarkId: "" });
  }

  async function importPastedUrls(event) {
    event.preventDefault();
    if (!canEdit) return;
    try {
      const targetCollectionId = bookmarkForm.collectionId || collections[0]?.id;
      const currentCount = bookmarks.filter((bookmark) => bookmark.collectionId === targetCollectionId).length;
      const importedBookmarks = parseBookmarkLines(importText).map((bookmark, index) => ({
        ...bookmark,
        id: createClientId(),
        collectionId: targetCollectionId,
        position: currentCount + index,
      }));
      if (importedBookmarks.length === 0) {
        setFormError("Paste at least one URL.");
        return;
      }

      const nextBookmarks = [...bookmarks, ...importedBookmarks];
      setBookmarks(nextBookmarks);
      closeDialogs();
      await mutateBoard(
        () => upsertBookmarks(importedBookmarks),
        { collections, bookmarks: nextBookmarks },
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not import pasted URLs.");
    }
  }

  async function importJson(event) {
    event.preventDefault();
    if (!canEdit) return;
    try {
      const imported = parseBookmarkBoardExport(importText);
      const collectionIdMap = new Map();
      const importedCollections = imported.collections.map((collection, index) => {
        const id = createClientId();
        collectionIdMap.set(collection.id, id);
        return {
          ...collection,
          id,
          name: `${collection.name}${collections.some((item) => item.name === collection.name) ? " import" : ""}`,
          position: collections.length + index,
        };
      });
      const importedBookmarks = imported.bookmarks.map((bookmark, index) => ({
        ...bookmark,
        id: createClientId(),
        collectionId: collectionIdMap.get(bookmark.collectionId),
        position: index,
      }));

      const nextCollections = [...collections, ...importedCollections];
      const nextBookmarks = [...bookmarks, ...importedBookmarks];
      setCollections(nextCollections);
      setBookmarks(nextBookmarks);
      closeDialogs();
      await mutateBoard(
        () =>
          postBookmarkBoardAction({
            action: "upsert-board",
            collections: importedCollections,
            bookmarks: importedBookmarks,
          }),
        { collections: nextCollections, bookmarks: nextBookmarks },
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not import JSON.");
    }
  }

  async function exportBoard() {
    const json = exportBookmarkBoard(collections, bookmarks);
    await navigator.clipboard.writeText(json);
    setSyncState("exported");
    setTimeout(() => setSyncState("idle"), 1800);
  }

  if (dbError) return <Alert variant="destructive">{dbError}</Alert>;

  return (
    <div className="min-h-full overflow-hidden text-foreground">
      <div className="min-h-full">
        <section
          className="min-w-0 px-4 py-6 sm:px-8 lg:px-12"
          onContextMenu={(event) => openContextMenu(event, "board")}
        >
          <PageHeader
            eyebrow="rootspace / bookmarks"
            title="Bookmark start page"
            description="Organize synced collections and links for your browser start page."
          />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Right-click the page, a collection, or a bookmark for commands.
            </p>
            <div className="flex items-center gap-2">
              <BookmarkOpeningSettings
                preference={bookmarkOpeningPreference}
                onPreferenceChange={changeBookmarkOpeningPreference}
              />
              <Badge variant={syncState === "error" ? "destructive" : syncState === "idle" ? "secondary" : "success"}>
                {syncState}
              </Badge>
            </div>
          </div>

          {loading ? (
            <section className="mt-12 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
              Loading bookmarks...
            </section>
          ) : !hasBoardData ? (
            <section className="mt-16 max-w-xl rounded-xl border border-[#25262b] bg-[#191a1d] p-6">
              <p className="text-xl font-bold text-[#f4f4f5]">No collections yet</p>
              <p className="mt-2 text-sm leading-6 text-[#999ba3]">
                Right-click here to create a collection or import a board.
              </p>
            </section>
          ) : (
            <section className="mt-12 columns-1 gap-4 md:columns-2 xl:columns-4">
              {board.map((collection) => (
                <div key={collection.id} className="mb-4 break-inside-avoid">
                  <div
              className={cn(
                "flex h-fit flex-col rounded-lg border border-border bg-card px-0 py-6 text-card-foreground shadow-sm",
                draggedCollectionId === collection.id && "opacity-40",
                collectionDropPreviewId === collection.id &&
                  draggedCollectionId &&
                  draggedCollectionId !== collection.id &&
                  "border-[#8b5cf6] bg-[#8b5cf6]/10 ring-2 ring-[#8b5cf6]/60",
              )}
              draggable={canEdit}
              onContextMenu={(event) => openContextMenu(event, "collection", { collection })}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", collection.id);
                setDraggedCollectionId(collection.id);
                setCollectionDropPreviewId(collection.id);
              }}
              onDragEnter={() => {
                if (draggedCollectionId && !draggedBookmark) {
                  setCollectionDropPreviewId(collection.id);
                }
              }}
              onDragEnd={clearDragState}
              onDragOver={(event) => {
                if (draggedCollectionId && !draggedBookmark) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setCollectionDropPreviewId(collection.id);
                }
              }}
              onDrop={(event) => {
                if (!draggedCollectionId || draggedBookmark) return;
                event.preventDefault();
                event.stopPropagation();
                reorderCollections(draggedCollectionId, collection.id);
                clearDragState();
              }}
            >
              <div className="flex items-start gap-3 px-7">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full opacity-90" style={{ backgroundColor: collection.color }} />
                    <h2 className="truncate text-xl font-extrabold tracking-normal text-[#e9e9ec]">{collection.name}</h2>
                  </div>
                  {collection.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#777985]">{collection.description}</p>
                  ) : null}
                </div>
              </div>

              <div
                className="mt-7 flex flex-col gap-2 px-7"
                onDragEnter={() => {
                  if (draggedBookmark) {
                    setBookmarkDropPreview({ collectionId: collection.id, bookmarkId: "" });
                  }
                }}
                onDragOver={(event) => {
                  if (draggedBookmark) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setBookmarkDropPreview({ collectionId: collection.id, bookmarkId: "" });
                  }
                }}
                onDrop={(event) => {
                  if (!draggedBookmark) return;
                  event.stopPropagation();
                  reorderBookmark(draggedBookmark, collection.id);
                  clearDragState();
                }}
              >
                {collection.bookmarks.map((bookmark) => (
                  <div key={bookmark.id}>
                    <div
                      className={cn(
                        "group/link -mx-2 rounded-lg px-2 py-2 transition-colors hover:bg-[#1d1e22]",
                        bookmark.isFavorite && "bg-[#1b1c21]",
                        draggedBookmark?.id === bookmark.id && "opacity-40",
                        bookmarkDropPreview.collectionId === collection.id &&
                          bookmarkDropPreview.bookmarkId === bookmark.id &&
                          draggedBookmark?.id !== bookmark.id &&
                          "bg-[#8b5cf6]/10 shadow-[inset_0_2px_0_#8b5cf6]",
                      )}
                      draggable={canEdit}
                      onContextMenu={(event) => openContextMenu(event, "bookmark", { collection, bookmark })}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", bookmark.id);
                        setDraggedCollectionId("");
                        setDraggedBookmark(bookmark);
                        setBookmarkDropPreview({ collectionId: collection.id, bookmarkId: bookmark.id });
                      }}
                      onDragEnter={(event) => {
                        if (draggedBookmark) {
                          event.stopPropagation();
                          setBookmarkDropPreview({ collectionId: collection.id, bookmarkId: bookmark.id });
                        }
                      }}
                      onDragOver={(event) => {
                        if (draggedBookmark) {
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "move";
                          setBookmarkDropPreview({ collectionId: collection.id, bookmarkId: bookmark.id });
                        }
                      }}
                      onDragEnd={clearDragState}
                      onDrop={(event) => {
                        if (!draggedBookmark) return;
                        event.stopPropagation();
                        reorderBookmark(draggedBookmark, collection.id, bookmark.id);
                        clearDragState();
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                          <BookmarkFavicon
                            key={bookmark.faviconUrl}
                            faviconUrl={bookmark.faviconUrl}
                            title={bookmark.title}
                          />
                          <a
                            href={bookmark.url}
                            target={getBookmarkLinkTarget(bookmarkOpeningPreference)}
                            rel="noreferrer"
                            draggable={false}
                            className="min-w-0 truncate text-sm font-bold text-[#dedee3] hover:text-white"
                          >
                          {bookmark.title}
                        </a>
                      </div>
                      {bookmark.description ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#777985]">{bookmark.description}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
                {bookmarkDropPreview.collectionId === collection.id &&
                !bookmarkDropPreview.bookmarkId &&
                draggedBookmark ? (
                  <div className="h-10 rounded-lg border border-dashed border-[#8b5cf6] bg-[#8b5cf6]/10" />
                ) : null}
              </div>
                </div>
                </div>
              ))}
            </section>
          )}
        </section>
      </div>

      {contextMenu.open ? (
        <div
          className="fixed z-[60] min-w-52 overflow-hidden rounded-lg border border-[#2a2b31] bg-[#1b1c20] py-1 text-sm text-[#e7e7ea] shadow-2xl shadow-black/40"
          style={{
            left:
              typeof window === "undefined"
                ? contextMenu.x
                : Math.max(8, Math.min(contextMenu.x, window.innerWidth - 220)),
            top:
              typeof window === "undefined"
                ? contextMenu.y
                : Math.max(8, Math.min(contextMenu.y, window.innerHeight - 330)),
          }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.type === "bookmark" && contextMenu.bookmark ? (
            <>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930]"
                onClick={() => runContextMenuAction(() => window.open(contextMenu.bookmark.url, "_blank", "noreferrer"))}
                role="menuitem"
              >
                Open in new tab
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930]"
                onClick={() => runContextMenuAction(() => navigator.clipboard.writeText(contextMenu.bookmark.url))}
                role="menuitem"
              >
                Copy URL
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => toggleFavorite(contextMenu.bookmark))}
                disabled={!canEdit}
                role="menuitem"
              >
                {contextMenu.bookmark.isFavorite ? "Remove favorite" : "Add favorite"}
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => openBookmarkDialog(contextMenu.bookmark))}
                disabled={!canEdit}
                role="menuitem"
              >
                Edit bookmark
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-red-300 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => deleteBookmark(contextMenu.bookmark))}
                disabled={!canEdit}
                role="menuitem"
              >
                Delete bookmark
              </button>
            </>
          ) : null}

          {contextMenu.type === "collection" && contextMenu.collection ? (
            <>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => openBookmarkDialog(null, contextMenu.collection.id))}
                disabled={!canEdit}
                role="menuitem"
              >
                Add bookmark
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => openPasteImportDialog(contextMenu.collection.id))}
                disabled={!canEdit}
                role="menuitem"
              >
                Paste URLs
              </button>
              <div className="my-1 border-t border-[#2a2b31]" role="separator" />
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => openCollectionDialog(contextMenu.collection))}
                disabled={!canEdit}
                role="menuitem"
              >
                Edit collection
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => moveCollection(contextMenu.collection.id, -1))}
                disabled={!canEdit || collections.findIndex((item) => item.id === contextMenu.collection.id) === 0}
                role="menuitem"
              >
                Move left
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => moveCollection(contextMenu.collection.id, 1))}
                disabled={!canEdit || collections.findIndex((item) => item.id === contextMenu.collection.id) === collections.length - 1}
                role="menuitem"
              >
                Move right
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-red-300 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => deleteCollection(contextMenu.collection))}
                disabled={!canEdit}
                role="menuitem"
              >
                Delete collection
              </button>
            </>
          ) : null}

          {contextMenu.type === "board" ? (
            <>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => openBookmarkDialog())}
                disabled={!canEdit || collections.length === 0}
                role="menuitem"
              >
                Add bookmark
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => openCollectionDialog())}
                disabled={!canEdit}
                role="menuitem"
              >
                Add collection
              </button>
              <div className="my-1 border-t border-[#2a2b31]" role="separator" />
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(() => openPasteImportDialog())}
                disabled={!canEdit || collections.length === 0}
                role="menuitem"
              >
                Paste URLs
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(openJsonImportDialog)}
                disabled={!canEdit}
                role="menuitem"
              >
                Import board JSON
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-[#282930] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => runContextMenuAction(exportBoard)}
                disabled={!hasBoardData}
                role="menuitem"
              >
                Export board JSON
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <Dialog open={collectionDialog.open} onOpenChange={(open) => setCollectionDialog({ open, item: open ? collectionDialog.item : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{collectionDialog.item ? "Edit collection" : "Add collection"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveCollection}>
            {formError ? <Alert variant="destructive">{formError}</Alert> : null}
            <div className="space-y-2">
              <Label htmlFor="collection-name">Name</Label>
              <Input id="collection-name" value={collectionForm.name} onChange={(event) => setCollectionForm({ ...collectionForm, name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-description">Description</Label>
              <Textarea id="collection-description" value={collectionForm.description} onChange={(event) => setCollectionForm({ ...collectionForm, description: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn("h-8 w-8 rounded-md border border-border", collectionForm.color === color && "ring-2 ring-ring")}
                    style={{ backgroundColor: color }}
                    onClick={() => setCollectionForm({ ...collectionForm, color })}
                    aria-label={`Use color ${color}`}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={!canEdit}>
              Save collection
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bookmarkDialog.open} onOpenChange={(open) => setBookmarkDialog({ open, item: open ? bookmarkDialog.item : null, collectionId: bookmarkDialog.collectionId })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bookmarkDialog.item ? "Edit bookmark" : "Add bookmark"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveBookmark}>
            {formError ? <Alert variant="destructive">{formError}</Alert> : null}
            <div className="space-y-2">
              <Label htmlFor="bookmark-url">URL</Label>
              <Input
                id="bookmark-url"
                value={bookmarkForm.url}
                onBlur={(event) => lookupTitleForNewBookmark(event.target.value)}
                onChange={(event) => {
                  setTitleLookupState("idle");
                  setBookmarkForm({ ...bookmarkForm, url: event.target.value, faviconUrl: "" });
                }}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookmark-title">Title</Label>
              <Input
                id="bookmark-title"
                value={bookmarkForm.title}
                onChange={(event) => {
                  setTitleEdited(true);
                  setBookmarkForm({ ...bookmarkForm, title: event.target.value });
                }}
                placeholder={titleLookupState === "loading" ? "Fetching page title..." : "Uses page title or host if empty"}
              />
              {titleLookupState === "loading" ? (
                <p className="text-xs text-muted-foreground">Fetching page title...</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookmark-collection">Collection</Label>
              <Select value={bookmarkForm.collectionId} onValueChange={(collectionId) => setBookmarkForm({ ...bookmarkForm, collectionId })}>
                <SelectTrigger id="bookmark-collection">
                  <SelectValue placeholder="Choose collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookmark-description">Description</Label>
              <Textarea id="bookmark-description" value={bookmarkForm.description} onChange={(event) => setBookmarkForm({ ...bookmarkForm, description: event.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={!canEdit}>
              Save bookmark
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialog.open} onOpenChange={(open) => setImportDialog({ open, mode: importDialog.mode })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{importDialog.mode === "json" ? "Import board JSON" : "Paste URLs"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={importDialog.mode === "json" ? importJson : importPastedUrls}>
            {formError ? <Alert variant="destructive">{formError}</Alert> : null}
            {importDialog.mode === "paste" ? (
              <div className="space-y-2">
                <Label htmlFor="import-collection">Collection</Label>
                <Select value={bookmarkForm.collectionId || collections[0]?.id} onValueChange={(collectionId) => setBookmarkForm({ ...bookmarkForm, collectionId })}>
                  <SelectTrigger id="import-collection">
                    <SelectValue placeholder="Choose collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="import-text">{importDialog.mode === "json" ? "JSON" : "One URL per line"}</Label>
              <Textarea
                id="import-text"
                className="min-h-52 font-mono"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!canEdit}>
              {importDialog.mode === "json" ? "Import JSON" : "Import URLs"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
