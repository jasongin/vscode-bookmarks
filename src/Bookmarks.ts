"use strict";

import * as vscode from "vscode";
import fs = require("fs");
import {Bookmark, JUMP_DIRECTION, JUMP_FORWARD, NO_MORE_BOOKMARKS} from "./Bookmark";

interface BookmarkAdded {
    bookmark: Bookmark;
    line: number;
    preview: string;
}

interface BookmarkRemoved {
    bookmark: Bookmark;
    line: number;
}

interface BookmarkUpdated {
    bookmark: Bookmark;
    index: number;
    line: number;
    preview: string;
}

export class Bookmarks {

    private onDidClearBookmarkEmitter = new vscode.EventEmitter<Bookmark>();
    get onDidClearBookmark(): vscode.Event<Bookmark> { return this.onDidClearBookmarkEmitter.event; }

    private onDidClearAllBookmarksEmitter = new vscode.EventEmitter<Bookmark>();
    get onDidClearAllBookmarks(): vscode.Event<Bookmark> { return this.onDidClearAllBookmarksEmitter.event; }

    private onDidAddBookmarkEmitter = new vscode.EventEmitter<BookmarkAdded>();
    get onDidAddBookmark(): vscode.Event<BookmarkAdded> { return this.onDidAddBookmarkEmitter.event; }

    private onDidRemoveBookmarkEmitter = new vscode.EventEmitter<BookmarkRemoved>();
    get onDidRemoveBookmark(): vscode.Event<BookmarkRemoved> { return this.onDidRemoveBookmarkEmitter.event; }

    private onDidUpdateBookmarkEmitter = new vscode.EventEmitter<BookmarkUpdated>();
    get onDidUpdateBookmark(): vscode.Event<BookmarkUpdated> { return this.onDidUpdateBookmarkEmitter.event; }

    public bookmarks: Bookmark[];
    public activeBookmark: Bookmark = undefined;

    constructor(jsonObject) {
        this.bookmarks = [];
    }

    public dispose() {
        this.zip();
    }
    
    public loadFrom(jsonObject, relativePath?: boolean) {
        if (jsonObject === "") {
            return;
        }
        
        let jsonBookmarks = jsonObject.bookmarks;
        for (let idx = 0; idx < jsonBookmarks.length; idx++) {
            let jsonBookmark = jsonBookmarks[idx];
            
            // each bookmark (line)
            this.add(jsonBookmark.uri || (relativePath ?
                jsonBookmark.fsPath : vscode.Uri.file(jsonBookmark.fsPath).toString()));
            for (let element of jsonBookmark.bookmarks) {
                this.bookmarks[idx].bookmarks.push(element);
            }
        }

        // it replaced $ROOTPATH$ for the rootPath itself 
        if (relativePath) {
            const root = vscode.workspace.workspaceFolders[0].uri.toString();
            for (let element of this.bookmarks) {
                element.uri = element.uri.replace("$ROOTPATH$", root);
            }
        }
    }

    public fromUri(uri: vscode.Uri) {
        for (let element of this.bookmarks) {
            if (element.uri === uri.toString()) {
                return element;
            }
        }
    }

    public add(uri: vscode.Uri) {
        let existing: Bookmark = this.fromUri(uri);
        if (typeof existing === "undefined") {
            let bookmark = new Bookmark(uri.toString());
            this.bookmarks.push(bookmark);
        }
    }

    public nextDocumentWithBookmarks(active: Bookmark, direction: JUMP_DIRECTION = JUMP_FORWARD) {

        let currentBookmark: Bookmark = active;
        let currentBookmarkId: number;
        for (let index = 0; index < this.bookmarks.length; index++) {
            let element = this.bookmarks[index];
            if (element === active) {
                currentBookmarkId = index;
            }
        }

        return new Promise((resolve, reject) => {

            if (direction === JUMP_FORWARD) {
                currentBookmarkId++;
                if (currentBookmarkId === this.bookmarks.length) {
                    currentBookmarkId = 0;
                }
            } else {
                currentBookmarkId--;
                if (currentBookmarkId === -1) {
                    currentBookmarkId = this.bookmarks.length - 1;
                }
            }
            
            currentBookmark = this.bookmarks[currentBookmarkId];
            
            if (currentBookmark.bookmarks.length === 0) {                    
                if (currentBookmark === this.activeBookmark) {
                    resolve(NO_MORE_BOOKMARKS);
                    return;
                } else {
                    this.nextDocumentWithBookmarks(currentBookmark, direction)
                        .then((nextDocument) => {
                            resolve(nextDocument);
                            return;
                        })
                        .catch((error) => {
                            reject(error);
                            return;
                        });
                }                   
            } else {
                if (fs.existsSync(currentBookmark.uri)) {
                    resolve(currentBookmark.uri);
                    return;
                } else {
                    this.nextDocumentWithBookmarks(currentBookmark, direction)
                        .then((nextDocument) => {
                            resolve(nextDocument);
                            return;
                        })
                        .catch((error) => {
                            reject(error);
                            return;
                        });
                }
            }

        });

    }

    public nextBookmark(active: Bookmark, currentLine: number) {

        let currentBookmark: Bookmark = active;
        let currentBookmarkId: number;
        for (let index = 0; index < this.bookmarks.length; index++) {
            let element = this.bookmarks[index];
            if (element === active) {
                currentBookmarkId = index;
            }
        }

        return new Promise((resolve, reject) => {

            currentBookmark.nextBookmark(currentLine)
                .then((newLine) => {
                    resolve(newLine);
                    return;
                })
                .catch((error) => {
                    // next document                  
                    currentBookmarkId++;
                    if (currentBookmarkId === this.bookmarks.length) {
                        currentBookmarkId = 0;
                    }
                    currentBookmark = this.bookmarks[currentBookmarkId];

                });

        });
    }
    
    public zip(relativePath?: boolean): Bookmarks {
        function isNotEmpty(book: Bookmark): boolean {
            return book.bookmarks.length > 0;
        }
        
        let newBookmarks: Bookmarks = new Bookmarks("");
        newBookmarks.bookmarks = JSON.parse(JSON.stringify(this.bookmarks)).filter(isNotEmpty);

        if (!relativePath) {
            return newBookmarks;
        }

        for (let element of newBookmarks.bookmarks) {
            element.uri = element.uri.replace(vscode.workspace.getWorkspaceFolder(
                vscode.Uri.parse(element.uri)).uri.toString(), "$ROOTPATH$");
        }
        return newBookmarks;
    }

    public clear(book?: Bookmark): void {
        let b: Bookmark = book ? book : this.activeBookmark;
        b.clear();
        this.onDidClearBookmarkEmitter.fire(b);
    }

    public clearAll(): void {
        for (let element of this.bookmarks) {
            element.clear();
        }     
        this.onDidClearAllBookmarksEmitter.fire();       
    }

    public addBookmark(aline: number): void {
        this.activeBookmark.bookmarks.push(aline);
        this.onDidAddBookmarkEmitter.fire({
            bookmark: this.activeBookmark, 
            line: aline + 1,
            preview: vscode.window.activeTextEditor.document.lineAt(aline).text
        });
    }

    public removeBookmark(index, aline: number, book?: Bookmark): void {
        let b: Bookmark = book ? book : this.activeBookmark;
        b.bookmarks.splice(index, 1);
        this.onDidRemoveBookmarkEmitter.fire({
            bookmark: b, 
            line: aline + 1
        });
    }

    public updateBookmark(index, oldLine, newLine: number, book?: Bookmark): void {
        let b: Bookmark = book ? book : this.activeBookmark;
        b.bookmarks[index] = newLine;
        this.onDidUpdateBookmarkEmitter.fire({
            bookmark: b,
            index: index,
            line: newLine + 1,
            preview: vscode.window.activeTextEditor.document.lineAt(newLine).text
        })
    }
}
