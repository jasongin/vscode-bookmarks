//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//
'use strict';
//
// Type definitions for Live Share for VS Code extension public API (no implementations)
//

import { CancellationToken, Event, Uri } from 'vscode';

/**
 * Root API that enables other VS Code extensions to access Live Share capabilities.
 *
 * An implementation of this interface is returned by the Live Share extension's
 * activation function.
 *
 * @example To access this API from another extension:
 * 
 *     let liveshareExtension = vscode.extensions.getExtension('ms-vsliveshare.vsliveshare');
 *     if (liveshareExtension) {
 *         this.liveshareApi = await liveshareExtension.activate();
 *     }
 */
export interface LiveShare {
    /** Role in the current sharing session, if any. */
    readonly role: Role;
    readonly onDidChangeRole: Event<Role>;

    /** List of peers connected to the current sharing session, including oneself. */
    readonly peers: Peer[];
    /** Event that notifies listeners when peers join or leave the session. */
    readonly onDidChangePeers: Event<PeersChangeEvent>;

    /**
     * Provides a named service to peers.
     * 
     * The caller must add request and/or notification handlers to the returned
     * `SharedService` instance in order to receive messages from peers.
     *
     * Throws an error if a service with the same name is already shared by this peer.
     *
     * It is valid for multiple peers to share a service with the same name;
     * in that case _requests_ to the named service will fail (due to ambiguity)
     * but _notifications_ are valid and are effectively broadcast to all peers
     * that provide or use the named service.
     */
    shareService(name: string): Promise<SharedService>;

    /**
     * Gets a proxy for a named service provided by a peer.
     * 
     * The caller must add a notification handler to the returned `SharedService`
     * instance in order to receive notifications from peers. (Service proxies
     * cannot receive requests, only send them.)
     * 
     * A `SharedServiceProxy` instance is returned even if the service is
     * not currently available (either because there is no active sharing session
     * or because no peer has provided the service.) Listen to the event on the
     * instance to be notified when the service becomes available or unavailable.
     */
    getSharedService(name: string): Promise<SharedServiceProxy>;

    /** Converts a local absolute path to a vsls:// URI. */
    convertLocalPathToSharedUri(localPath: string): Uri;

    /** Converts a vsls:// URI to a local absolute path.
     *  (Returns null for guest role because files are remote.) */
    convertSharedUriToLocalPath(sharedUri: Uri): string;
}

export enum Role {
    None = 0,
    Host = 1,
    Guest = 2,
}

/** This is just a placeholder for a richer access control model to be added later. */
export enum Access {
    None = 0,
    ReadOnly = 1,
    ReadWrite = 3,
    Full = 0xFF,
}

export interface Peer {
    readonly peerNumber: number; 
    readonly role: Role;
    readonly access: Access;
    readonly isSelf: boolean;

    // User profile info is withheld for privacy reasons, at least for now.
}

export interface PeersChangeEvent {
    readonly added: Peer[];
    readonly removed: Peer[];
}

export interface RequestHandler {
    (args: any[], cancellation?: CancellationToken): any | Promise<any>;
}

export interface NotificationHandler {
    (args: any): void;
}

export interface SharedService {
    /**
     * Registers a callback to be invoked when a request is sent to the service.
     */
    handleRequest(name: string, handler: RequestHandler): void;

    /**
     * Registers a callback to be invoked when a notification is sent to the service.
     */
    handleNotification(name: string, handler: NotificationHandler): void;

    /**
     * Sends a notification (event) from the service.
     * 
     * If no sharing session is active, this method does nothing.
     */
    notify(name: string, args: any): void;
}

export interface SharedServiceProxy {
    readonly isServiceAvailable: boolean;
    readonly onDidChangeIsServiceAvailable: Event<boolean>;

    /**
     * Registers a callback to be invoked when a notification is sent by the service.
     */
    handleNotification(name: string, handler: NotificationHandler): void;

    /**
     * Sends a request (method call) to the service and waits for a response.
     * 
     * @returns a promise that waits asynchronously for a response
     *
     * @throws SharedServiceProxyError (via rejected promise) if the service is
     * not currently available (either because there is no active sharing session
     * or because no peer has provided the service).
     *
     * @throws SharedServiceResponseError (via rejected promise) if the service's
     * request handler throws an error.
     */
    request(name: string, args: any[], cancellation?: CancellationToken): Promise<any>;

    /**
     * Sends a notification (event) to the service. (Does not wait for a response.)
     * 
     * If the service is not currently available (either because there is
     * no active sharing session or because no peer has provided the service)
     * then this method does nothing.
     */
    notify(name: string, args: any): void;
}

/**
 * Error details for a failure to proxy a request to a shared service.
 */
export interface SharedServiceProxyError extends Error {
    // TODO: proxy error details
}

/**
 * Error details for a failed request to a shared service.
 */
export interface SharedServiceResponseError extends Error {
    // TODO: remote error details
}

