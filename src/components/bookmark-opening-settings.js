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
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Bookmark settings</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="bookmark-opening-preference">Open bookmarks in</Label>
						<Select value={preference} onValueChange={onPreferenceChange}>
							<SelectTrigger id="bookmark-opening-preference">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={BOOKMARK_OPENING_NEW_TAB}>New tab</SelectItem>
								<SelectItem value={BOOKMARK_OPENING_CURRENT_TAB}>Current tab</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs leading-5 text-muted-foreground">
							Applies to normal clicks. Browser shortcuts still control modified clicks.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
