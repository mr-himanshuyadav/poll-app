"use client";

import {
    useEffect,
    useRef,
} from "react";

import { supabase } from "@/lib/supabase";

interface UseLiveRecoveryOptions {
    onRecover: () => Promise<void> | void;
    debounceMs?: number;
}

/**
 * Makes a live surface resilient to background-tab suspension and
 * temporary network loss.
 *
 * Realtime is used for low-latency updates, while the supplied refetch
 * callback reconciles the UI with the database whenever the page becomes
 * visible again or the network returns.
 */
export function useLiveRecovery({
    onRecover,
    debounceMs = 750,
}: UseLiveRecoveryOptions): void {
    const onRecoverRef =
        useRef(onRecover);

    const recoveringRef =
        useRef(false);

    const lastRecoveryRef =
        useRef(0);

    useEffect(() => {
        onRecoverRef.current =
            onRecover;
    }, [onRecover]);

    useEffect(() => {
        const recover = async () => {
            if (
                document.visibilityState !==
                "visible"
            ) {
                return;
            }

            if (
                typeof navigator !== "undefined" &&
                !navigator.onLine
            ) {
                return;
            }

            const now = Date.now();

            if (
                recoveringRef.current ||
                now - lastRecoveryRef.current <
                    debounceMs
            ) {
                return;
            }

            recoveringRef.current = true;
            lastRecoveryRef.current = now;

            try {
                // Ask the shared Realtime client to reconnect before the
                // authoritative database reconciliation.
                supabase.realtime.connect();

                await onRecoverRef.current();
            } finally {
                recoveringRef.current = false;
            }
        };

        const handleVisibilityChange = () => {
            if (
                document.visibilityState ===
                "visible"
            ) {
                void recover();
            }
        };

        const handleOnline = () => {
            void recover();
        };

        const handlePageShow = () => {
            void recover();
        };

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );

        window.addEventListener(
            "online",
            handleOnline,
        );

        window.addEventListener(
            "pageshow",
            handlePageShow,
        );

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );

            window.removeEventListener(
                "online",
                handleOnline,
            );

            window.removeEventListener(
                "pageshow",
                handlePageShow,
            );
        };
    }, [debounceMs]);
}
