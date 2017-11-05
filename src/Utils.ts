"use strict";

export class Utils {
    // a simple workaround for what appears to be a vscode.Uri bug
    // (inconsistent fsPath values for the same document, ex. ///foo/x.cpp and /foo/x.cpp)
    public static normalize(uri: string): string {
        return uri.replace("///", "/");
    }
}