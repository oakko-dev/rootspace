import { Settings } from "lucide-react";
// Presents the browser-local bookmark navigation preference without owning persistence.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	BOOKMARK_OPENING_CURRENT_TAB,
	BOOKMARK_OPENING_NEW_TAB,
} from "@/lib/bookmark-opening-preference";

export default function BookmarkOpeningSettings({ preference, onPreferenceChange }) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
				<Settings aria-hidden="true" className="h-4 w-4" />
				Settings
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-lg p-6">
					<DialogHeader>
						<DialogTitle className="pr-8">Bookmark settings</DialogTitle>
						<p className="text-sm leading-6 text-muted-foreground">
							Choose how a normal click should open a bookmark.
						</p>
					</DialogHeader>
					<div className="rounded-lg border border-border/80 bg-background/40 p-4">
						<div className="space-y-3">
							<div className="space-y-1">
								<Label htmlFor="bookmark-opening-preference">Open bookmarks in</Label>
								<p className="text-xs leading-5 text-muted-foreground">
									Applies to normal clicks. Browser shortcuts still control modified clicks.
								</p>
							</div>
							<Select value={preference} onValueChange={onPreferenceChange}>
								<SelectTrigger id="bookmark-opening-preference" className="bg-card">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={BOOKMARK_OPENING_NEW_TAB}>New tab</SelectItem>
									<SelectItem value={BOOKMARK_OPENING_CURRENT_TAB}>Current tab</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
