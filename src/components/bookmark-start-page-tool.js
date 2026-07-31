"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
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
  getBookmarkBoardCacheKey,
  parseBookmarkBoardCache,
  parseBookmarkBoardPayload,
  readBookmarkBoardCache,
  writeBookmarkBoardCache,
} from "@/lib/bookmark-board-cache";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const COLORS = ["#7dd3fc", "#86efac", "#fbbf24", "#f0abfc", "#f87171", "#a5b4fc"];

function createClientId() {
  return globalThis.crypto?.randomUUID?.() || String(Date.now());
}

async function requestBookmarkBoard(url = "/api/bookmark-board", options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Bookmark board request failed.");
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
    return <Icons.Globe2 aria-hidden="true" className="size-4 shrink-0 text-[#777985]" />;
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

export default function BookmarkStartPageTool({ currentUser }) {
  const user = currentUser;
  const mutationRevision = useRef(0);
  const [collections, setCollections] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [syncState, setSyncState] = useState("idle");
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
  const [bookmarkMenu, setBookmarkMenu] = useState({ open: false, x: 0, y: 0, bookmark: null });

  const board = useMemo(
    () => filterBookmarkBoard(collections, bookmarks, ""),
    [collections, bookmarks],
  );
  const hasBoardData = collections.length > 0;

  async function upsertCollections(nextCollections) {
    if (!user || nextCollections.length === 0) return;
    await postBookmarkBoardAction({
      action: "upsert-collections",
      collections: nextCollections,
    });
  }

  async function upsertBookmarks(nextBookmarks) {
    if (!user || nextBookmarks.length === 0) return;
    await postBookmarkBoardAction({
      action: "upsert-bookmarks",
      bookmarks: nextBookmarks,
    });
  }

  async function mutateBoard(callback, nextBoard) {
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
    async function loadBoard() {
      const revisionAtStart = mutationRevision.current;
      const cachedBoard = readBookmarkBoardCache(user.id);
      const hasCachedBoard = Boolean(cachedBoard);

      if (cachedBoard) {
        setCollections(cachedBoard.collections);
        setBookmarks(cachedBoard.bookmarks);
        setLoading(false);
        setSyncState("syncing");
      }

      try {
        if (!hasCachedBoard) setLoading(true);
        const payload = await requestBookmarkBoard();
        const freshBoard = parseBookmarkBoardPayload(payload, user.id);
        if (!freshBoard) throw new Error("Bookmark board response was invalid.");

        if (mutationRevision.current === revisionAtStart) {
          setCollections(freshBoard.collections);
          setBookmarks(freshBoard.bookmarks);
          writeBookmarkBoardCache(user.id, freshBoard);
          setSyncState("idle");
        }
        setDbError(null);
      } catch (error) {
        if (hasCachedBoard) {
          setSyncState("error");
        } else {
          setDbError(`Database error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, [user.id]);

  useEffect(() => {
    function syncCachedBoard(event) {
      if (event.key !== getBookmarkBoardCacheKey(user.id) || !event.newValue) return;
      const cachedBoard = parseBookmarkBoardCache(event.newValue, user.id);
      if (!cachedBoard) return;
      setCollections(cachedBoard.collections);
      setBookmarks(cachedBoard.bookmarks);
    }

    window.addEventListener("storage", syncCachedBoard);
    return () => window.removeEventListener("storage", syncCachedBoard);
  }, [user.id]);

  useEffect(() => {
    if (!bookmarkMenu.open) return undefined;

    function closeBookmarkMenu() {
      setBookmarkMenu({ open: false, x: 0, y: 0, bookmark: null });
    }

    function closeBookmarkMenuOnEscape(event) {
      if (event.key === "Escape") closeBookmarkMenu();
    }

    window.addEventListener("click", closeBookmarkMenu);
    window.addEventListener("scroll", closeBookmarkMenu, true);
    window.addEventListener("keydown", closeBookmarkMenuOnEscape);

    return () => {
      window.removeEventListener("click", closeBookmarkMenu);
      window.removeEventListener("scroll", closeBookmarkMenu, true);
      window.removeEventListener("keydown", closeBookmarkMenuOnEscape);
    };
  }, [bookmarkMenu.open]);

  function openCollectionDialog(collection = null) {
    setFormError("");
    setCollectionForm({
      name: collection?.name || "",
      description: collection?.description || "",
      color: collection?.color || COLORS[collections.length % COLORS.length],
    });
    setCollectionDialog({ open: true, item: collection });
  }

  function openBookmarkDialog(bookmark = null, collectionId = "") {
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

  function openPasteImportDialog() {
    setFormError("");
    setImportText("");
    setImportDialog({ open: true, mode: "paste" });
  }

  function openJsonImportDialog() {
    setFormError("");
    setImportText("");
    setImportDialog({ open: true, mode: "json" });
  }

  function closeDialogs() {
    setCollectionDialog({ open: false, item: null });
    setBookmarkDialog({ open: false, item: null, collectionId: "" });
    setImportDialog({ open: false, mode: "paste" });
  }

  function openBookmarkContextMenu(event, bookmark) {
    event.preventDefault();
    event.stopPropagation();
    setBookmarkMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      bookmark,
    });
  }

  function runBookmarkMenuAction(callback) {
    setBookmarkMenu({ open: false, x: 0, y: 0, bookmark: null });
    callback();
  }

  async function saveCollection(event) {
    event.preventDefault();
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
    if (!confirm(`Delete "${bookmark.title}"?`)) return;
    const nextBookmarks = bookmarks.filter((item) => item.id !== bookmark.id);
    setBookmarks(nextBookmarks);
    await mutateBoard(
      () => postBookmarkBoardAction({ action: "delete-bookmark", bookmarkId: bookmark.id }),
      { collections, bookmarks: nextBookmarks },
    );
  }

  async function toggleFavorite(bookmark) {
    const nextBookmark = { ...bookmark, isFavorite: !bookmark.isFavorite };
    const nextBookmarks = bookmarks.map((item) => (item.id === bookmark.id ? nextBookmark : item));
    setBookmarks(nextBookmarks);
    await mutateBoard(
      () => upsertBookmarks([nextBookmark]),
      { collections, bookmarks: nextBookmarks },
    );
  }

  async function reorderCollections(sourceId, targetId) {
    const nextCollections = reorderWithin(collections, sourceId, targetId);
    setCollections(nextCollections);
    await mutateBoard(
      () => upsertCollections(nextCollections),
      { collections: nextCollections, bookmarks },
    );
  }

  async function moveCollection(collectionId, offset) {
    const nextCollections = moveByOffset(collections, collectionId, offset);
    setCollections(nextCollections);
    await mutateBoard(
      () => upsertCollections(nextCollections),
      { collections: nextCollections, bookmarks },
    );
  }

  async function reorderBookmark(sourceBookmark, targetCollectionId, targetBookmarkId = "") {
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
  if (loading) return <section className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Loading bookmarks...</section>;

  return (
    <div className="min-h-full overflow-hidden text-foreground">
      <div className="min-h-full">
        <section className="min-w-0 px-4 py-6 sm:px-8 lg:px-12">
          <PageHeader
            eyebrow="rootspace / bookmarks"
            title="Bookmark start page"
            description="Organize synced collections and links for your browser start page."
          />

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" onClick={() => openBookmarkDialog()}>
              <Icons.Plus size={16} />
              Bookmark
            </Button>
            <Button type="button" variant="secondary" onClick={() => openCollectionDialog()}>
              <Icons.FolderPlus size={16} />
              Collection
            </Button>
            <Button type="button" variant="outline" onClick={openPasteImportDialog}>
              <Icons.ClipboardPaste size={16} />
              Paste
            </Button>
            <Button type="button" variant="outline" onClick={openJsonImportDialog}>
              <Icons.Upload size={16} />
              Import
            </Button>
            <Button type="button" variant="outline" onClick={exportBoard}>
              <Icons.Download size={16} />
              Export
            </Button>
            <Badge variant={syncState === "error" ? "destructive" : syncState === "idle" ? "secondary" : "success"}>
              {syncState}
            </Badge>
          </div>

          {!hasBoardData ? (
            <section className="mt-16 max-w-xl rounded-xl border border-[#25262b] bg-[#191a1d] p-6">
              <p className="text-xl font-bold text-[#f4f4f5]">No collections yet</p>
              <p className="mt-2 text-sm leading-6 text-[#999ba3]">
                Create a collection or paste URLs to start your browser board.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" onClick={() => openCollectionDialog()}>
                  <Icons.FolderPlus size={16} />
                  Collection
                </Button>
                <Button type="button" variant="secondary" onClick={openPasteImportDialog}>
                  <Icons.ClipboardPaste size={16} />
                  Paste URLs
                </Button>
              </div>
            </section>
          ) : (
            <section className="mt-12 grid min-h-[420px] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {board.map((collection, collectionIndex) => (
                <div key={collection.id} className="contents">
                  {collectionDropPreviewId === collection.id && draggedCollectionId !== collection.id ? (
                    <div className="min-h-[412px] rounded-lg border border-dashed border-[#8b5cf6] bg-[#8b5cf6]/10" />
                  ) : null}
                  <div
              className={cn(
                "group/collection flex min-h-[412px] flex-col rounded-lg border border-border bg-card px-0 py-6 text-card-foreground shadow-sm",
                draggedCollectionId === collection.id && "opacity-40",
              )}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
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
              onDrop={() => {
                if (draggedCollectionId && !draggedBookmark) reorderCollections(draggedCollectionId, collection.id);
                clearDragState();
              }}
            >
              <div className="flex items-start justify-between gap-3 px-7">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full opacity-90" style={{ backgroundColor: collection.color }} />
                    <h2 className="truncate text-xl font-extrabold tracking-normal text-[#e9e9ec]">{collection.name}</h2>
                  </div>
                  {collection.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#777985]">{collection.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/collection:opacity-100">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#777985] hover:text-white" onClick={() => moveCollection(collection.id, -1)} disabled={collectionIndex === 0} aria-label="Move collection left">
                    <Icons.ArrowLeft size={16} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#777985] hover:text-white" onClick={() => moveCollection(collection.id, 1)} disabled={collectionIndex === collections.length - 1} aria-label="Move collection right">
                    <Icons.ArrowRight size={16} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#777985] hover:text-white" onClick={() => openCollectionDialog(collection)} aria-label="Edit collection">
                    <Icons.Edit3 size={16} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#777985] hover:text-red-300" onClick={() => deleteCollection(collection)} aria-label="Delete collection">
                    <Icons.Trash2 size={16} />
                  </Button>
                </div>
              </div>

              <div
                className="mt-7 flex flex-1 flex-col gap-2 px-7"
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
                onDrop={() => {
                  if (draggedBookmark) reorderBookmark(draggedBookmark, collection.id);
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
                      draggable
                      onContextMenu={(event) => openBookmarkContextMenu(event, bookmark)}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", bookmark.id);
                        setDraggedCollectionId("");
                        setDraggedBookmark(bookmark);
                        setBookmarkDropPreview({ collectionId: collection.id, bookmarkId: bookmark.id });
                      }}
                      onDragEnter={(event) => {
                        event.stopPropagation();
                        if (draggedBookmark) {
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
                        event.stopPropagation();
                        if (draggedBookmark) reorderBookmark(draggedBookmark, collection.id, bookmark.id);
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
                            target="_blank"
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

      {bookmarkMenu.open && bookmarkMenu.bookmark ? (
        <div
          className="fixed z-[60] min-w-44 overflow-hidden rounded-lg border border-[#2a2b31] bg-[#1b1c20] py-1 text-sm text-[#e7e7ea] shadow-2xl shadow-black/40"
          style={{
            left:
              typeof window === "undefined"
                ? bookmarkMenu.x
                : Math.min(bookmarkMenu.x, window.innerWidth - 190),
            top:
              typeof window === "undefined"
                ? bookmarkMenu.y
                : Math.min(bookmarkMenu.y, window.innerHeight - 190),
          }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-[#282930]"
            onClick={() => runBookmarkMenuAction(() => window.open(bookmarkMenu.bookmark.url, "_blank", "noreferrer"))}
            role="menuitem"
          >
            Open
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-[#282930]"
            onClick={() => runBookmarkMenuAction(() => navigator.clipboard.writeText(bookmarkMenu.bookmark.url))}
            role="menuitem"
          >
            Copy URL
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-[#282930]"
            onClick={() => runBookmarkMenuAction(() => toggleFavorite(bookmarkMenu.bookmark))}
            role="menuitem"
          >
            {bookmarkMenu.bookmark.isFavorite ? "Remove favorite" : "Add favorite"}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-[#282930]"
            onClick={() => runBookmarkMenuAction(() => openBookmarkDialog(bookmarkMenu.bookmark))}
            role="menuitem"
          >
            Edit
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-red-300 hover:bg-red-400/10"
            onClick={() => runBookmarkMenuAction(() => deleteBookmark(bookmarkMenu.bookmark))}
            role="menuitem"
          >
            Delete
          </button>
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
            <Button type="submit" className="w-full">
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
            <Button type="submit" className="w-full">
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
            <Button type="submit" className="w-full">
              {importDialog.mode === "json" ? "Import JSON" : "Import URLs"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
