"use strict";

import { WorkspaceFolder } from "vscode";
import fs = require("fs");

import { Bookmark } from "./Bookmark";
import { Utils } from "./Utils";

export interface BookmarkList extends Array<Bookmark> {};

export class BookmarkFolder  {
    public workspaceFolder: WorkspaceFolder;
    public bookmarks: Bookmark[];

    constructor(wf: WorkspaceFolder) {
        this.bookmarks = [];
    }

    public loadFrom(jsonObject, relativePath?: boolean) {
        if (jsonObject === "") {
            return;
        }

        let jsonBookmarks = jsonObject.bookmarks;
        for (let idx = 0; idx < jsonBookmarks.length; idx++) {
            let jsonBookmark = jsonBookmarks[ idx ];

            // each bookmark (line)
            this.add(jsonBookmark.fsPath);
            for (let element of jsonBookmark.bookmarks) {
                this.bookmarks[ idx ].bookmarks.push(element); 
            }
        }

        if (relativePath) {
            for (let element of this.bookmarks) {                         //??
                element.fsPath = element.fsPath.replace("$ROOTPATH$", this.workspaceFolder.uri.fsPath);
            }
        }
    }

    public fromUri(uri: string) {
        uri = Utils.normalize(uri);
        for (let element of this.bookmarks) {
            if (element.fsPath === uri) {
                return element;
            }
        }
    }

    public add(uri: string) {
        uri = Utils.normalize(uri);
        let existing: Bookmark = this.fromUri(uri);
        if (typeof existing === "undefined") {
            let bookmark = new Bookmark(uri);
            this.bookmarks.push(bookmark);
        }
    }

    public zip(relativePath?: boolean): BookmarkList {
        function isNotEmpty(book: Bookmark): boolean {
            return book.bookmarks.length > 0;
        }

        let newBookmarks: BookmarkList = <BookmarkList> [];
        newBookmarks = JSON.parse(JSON.stringify(this.bookmarks)).filter(isNotEmpty);

        if (!relativePath) {
            return newBookmarks;
        }

        for (const element of newBookmarks) {
            element.fsPath = element.fsPath.replace(this.workspaceFolder.uri.fsPath, "$ROOTPATH$");
        }

        return newBookmarks;
    }
}