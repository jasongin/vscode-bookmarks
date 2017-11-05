"use strict";

import * as vscode from "vscode";
import fs = require("fs");
import path = require("path");
import { Bookmark, JUMP_DIRECTION, JUMP_FORWARD, NO_MORE_BOOKMARKS } from "./Bookmark";
import { BookmarkFolder } from "./BookmarkFolder";
import { Utils } from "./Utils";
import { relative } from "path";
import { Uri } from "vscode";

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

// export interface BookmarkList extends Array<Bookmark> {};

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

    // public bookmarks: Bookmark[];
    private context: vscode.ExtensionContext;
    public bookmarkFolders: BookmarkFolder[];
    public activeBookmark: Bookmark = undefined;

    constructor(ctx: vscode.ExtensionContext) {
        // this.bookmarks = [];
        this.bookmarkFolders = [];
        this.context = ctx;

        // create each 'folder' right at the beginning
        if (!vscode.workspace.workspaceFolders) {
            const bf: BookmarkFolder = new BookmarkFolder(undefined);
            this.bookmarkFolders.push(bf);
        } else {
            for (const workspaceFolder of vscode.workspace.workspaceFolders) {
                const bf: BookmarkFolder = new BookmarkFolder(workspaceFolder);
                this.bookmarkFolders.push(bf);
            }            
        }
    }

    public dispose() {
        this.zip();
    }

    // public loadFrom(jsonObject, relativePath?: boolean) {
    //     if (jsonObject === "") {
    //         return;
    //     }

    //     let jsonBookmarks = jsonObject.bookmarks;
    //     for (let idx = 0; idx < jsonBookmarks.length; idx++) {
    //         let jsonBookmark = jsonBookmarks[ idx ];

    //         // each bookmark (line)
    //         this.add(jsonBookmark.fsPath);
    //         // for (let index = 0; index < jsonBookmark.bookmarks.length; index++) {
    //         for (let element of jsonBookmark.bookmarks) {
    //             this.bookmarks[ idx ].bookmarks.push(element); // jsonBookmark.bookmarks[index]);
    //         }
    //     }

    //     if (relativePath) {
    //         for (let element of this.bookmarks) {
    //             element.fsPath = element.fsPath.replace("$ROOTPATH$", vscode.workspace.rootPath);
    //         }
    //     }
    // }

    public loadWorkspaceState(): boolean {
        let saveBookmarksInProject: boolean = vscode.workspace.getConfiguration("bookmarks").get("saveBookmarksInProject", false);

        if (!vscode.workspace.workspaceFolders || !saveBookmarksInProject) {
            let savedBookmarks = this.context.workspaceState.get("bookmarks", "");
            if (savedBookmarks !== "") {
                const bf: BookmarkFolder = new BookmarkFolder(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined);
                bf.loadFrom(JSON.parse(savedBookmarks));
                this.bookmarkFolders.push(bf);
            }
            return savedBookmarks !== "";
        } else {
            
        }

        // you can load from '.vscode\bookmarks.json' if you have e folder opened
        if (saveBookmarksInProject && vscode.workspace.workspaceFolders) {
            
            // for each one - check for '.vscode\bookmarks.json'
            for (const bf of this.bookmarkFolders) {
                let bookmarksFileInProject: string = path.join(bf.workspaceFolder.uri.fsPath, ".vscode", "bookmarks.json");
                if (fs.existsSync(bookmarksFileInProject)) {
                    try {
                        bf.loadFrom(JSON.parse(fs.readFileSync(bookmarksFileInProject).toString()), true);
                        return true;
                    } catch (error) {
                        vscode.window.showErrorMessage("Error loading Bookmarks: " + error.toString());
                        return false;
                    }
                }
                this.bookmarkFolders.push(bf);
            }
        } else {
            let savedBookmarks = this.context.workspaceState.get("bookmarks", "");
            if (savedBookmarks !== "") {
                const bf: BookmarkFolder = new BookmarkFolder(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined);
                bf.loadFrom(JSON.parse(savedBookmarks));
                this.bookmarkFolders.push(bf);
            }
            return savedBookmarks !== "";
        }        
    }
    // public loadWorkspaceState(): boolean {
    //     let saveBookmarksInProject: boolean = vscode.workspace.getConfiguration("bookmarks").get("saveBookmarksInProject", false);

    //     // you can load from '.vscode\bookmarks.json' if you have e folder opened
    //     if (vscode.workspace.workspaceFolders && saveBookmarksInProject) {

    //         // for each one
    //         for (const workspaceFolder of vscode.workspace.workspaceFolders) {

    //             const bf: BookmarkFolder = new BookmarkFolder(workspaceFolder);
                
    //             // has '.vscode\bookmarks.json'
    //             let bookmarksFileInProject: string = path.join(workspaceFolder.uri.fsPath, ".vscode", "bookmarks.json");
    //             if (fs.existsSync(bookmarksFileInProject)) {
    //                 try {
    //                     bf.loadFrom(JSON.parse(fs.readFileSync(bookmarksFileInProject).toString()), true);
    //                     return true;
    //                 } catch (error) {
    //                     vscode.window.showErrorMessage("Error loading Bookmarks: " + error.toString());
    //                     return false;
    //                 }
    //             }
    //             this.bookmarkFolders.push(bf);
    //         }
    //     } else {
    //         let savedBookmarks = this.context.workspaceState.get("bookmarks", "");
    //         if (savedBookmarks !== "") {
    //             const bf: BookmarkFolder = new BookmarkFolder(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined);
    //             bf.loadFrom(JSON.parse(savedBookmarks));
    //             this.bookmarkFolders.push(bf);
    //         }
    //         return savedBookmarks !== "";
    //     }        
    // }

    public saveWorkspaceState(context: vscode.ExtensionContext): void {
        return;
        // let saveBookmarksInProject: boolean = vscode.workspace.getConfiguration("bookmarks").get("saveBookmarksInProject", false);

        // // you can save to '.vscode\bookmarks.json' if you have e folder opened
        // if (vscode.workspace.workspaceFolders && saveBookmarksInProject) {
        //     // for each one
        //     for (const workspaceFolder of vscode.workspace.workspaceFolders) {

        //         let bookmarksFileInProject: string = path.join(workspaceFolder.uri.fsPath, ".vscode", "bookmarks.json");
        //         if (!fs.existsSync(path.dirname(bookmarksFileInProject))) {
        //             fs.mkdirSync(path.dirname(bookmarksFileInProject)); 
        //         }
        //         fs.writeFileSync(bookmarksFileInProject, JSON.stringify(this.zip(true), null, "\t"));   
        //     }
        // } else {
        //     context.workspaceState.update("bookmarks", JSON.stringify(this.bookmarkFolders[0].zip()));
        // }
    }

    public fromUri(uri: string) {
        uri = Utils.normalize(uri);

        for (const folder of this.bookmarkFolders) {
            for (let element of folder.bookmarks) {
                if (element.fsPath === uri) {
                    return element;
                }
            }
                
        }
        // // for (let index = 0; index < this.bookmarks.length; index++) {
        // for (let element of this.bookmarks) {
        //     // let element = this.bookmarks[index];

        //     if (element.fsPath === uri) {
        //         return element;
        //     }
        // }
    }

    public add(uri: string) {
        // console.log(`Adding bookmark/file: ${uri}`);
        uri = Utils.normalize(uri);

        let existing: Bookmark = this.fromUri(uri);
        if (typeof existing === "undefined") {
            // let bookmark = new Bookmark(uri);
            // this.bookmarks.push(bookmark);
            for (const folder of this.bookmarkFolders) {
                if (vscode.workspace.getWorkspaceFolder(Uri.file(uri)) === folder.workspaceFolder) {
                    let bookmark = new Bookmark(uri);
                    folder.bookmarks.push(bookmark);
                }
            }
        }
    }

    public nextDocumentWithBookmarks(active: Bookmark, direction: JUMP_DIRECTION = JUMP_FORWARD) {

        let currentBookmark: Bookmark = active;
        let currentBookmarkId: number;
        for (let index = 0; index < this.bookmarks.length; index++) {
            let element = this.bookmarks[ index ];
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

            currentBookmark = this.bookmarks[ currentBookmarkId ];

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
                if (fs.existsSync(currentBookmark.fsPath)) {
                    resolve(currentBookmark.fsPath);
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
            let element = this.bookmarks[ index ];
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
                    currentBookmark = this.bookmarks[ currentBookmarkId ];

                });

        });
    }


    /**
     * zip
     */
    public zip(relativePath?: boolean): void {
        for (const bookmarkFolder of this.bookmarkFolders) {
            bookmarkFolder.zip(relativePath);
        }
    }

    // public zip(relativePath?: boolean): Bookmarks {
    //     function isNotEmpty(book: Bookmark): boolean {
    //         return book.bookmarks.length > 0;
    //     }

    //     let newBookmarks: Bookmarks = new Bookmarks();
    //     //  newBookmarks.bookmarks = this.bookmarks.filter(isNotEmpty);
    //     newBookmarks.bookmarks = JSON.parse(JSON.stringify(this.bookmarks)).filter(isNotEmpty);

    //     if (!relativePath) {
    //         return newBookmarks;
    //     }

    //     for (let element of newBookmarks.bookmarks) {
    //         element.fsPath = element.fsPath.replace(vscode.workspace.rootPath, "$ROOTPATH$");
    //     }
    //     return newBookmarks;
    // }

    public clear(book?: Bookmark): void {
        let b: Bookmark = book ? book : this.activeBookmark;
        b.clear();
        this.onDidClearBookmarkEmitter.fire(b);
    }

    public clearAll(): void {
        // for (let element of this.bookmarks) {
        //     element.clear();
        // }
        for (const folder of this.bookmarkFolders) {
            for (const file of folder.bookmarks) {
                file.clear();
            }
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
        b.bookmarks[ index ] = newLine;
        this.onDidUpdateBookmarkEmitter.fire({
            bookmark: b,
            index: index,
            line: newLine + 1,
            preview: vscode.window.activeTextEditor.document.lineAt(newLine).text
        })
    }

    public bookmarks(): Bookmark[] {
        let b: Bookmark[];
        for (const folder of this.bookmarkFolders) {
            for (const bkm of folder.bookmarks) {
                b.push(bkm);
            }
        }
        return b;
    } 
}
