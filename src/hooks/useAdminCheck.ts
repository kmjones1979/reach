"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/config/supabase";

type AdminStatus = {
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isLoading: boolean;
};

/**
 * Lightweight hook to check if a wallet address is an admin.
 * Does not require SIWE - just checks the database.
 */
export function useAdminCheck(walletAddress: string | null): AdminStatus {
    const [status, setStatus] = useState<AdminStatus>({
        isAdmin: false,
        isSuperAdmin: false,
        isLoading: true,
    });

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!walletAddress || !supabase) {
                setStatus({ isAdmin: false, isSuperAdmin: false, isLoading: false });
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("shout_admins")
                    .select("is_super_admin")
                    .eq("wallet_address", walletAddress.toLowerCase())
                    .single();

                if (error || !data) {
                    setStatus({ isAdmin: false, isSuperAdmin: false, isLoading: false });
                    return;
                }

                setStatus({
                    isAdmin: true,
                    isSuperAdmin: data.is_super_admin || false,
                    isLoading: false,
                });
            } catch (err) {
                console.error("[AdminCheck] Error checking admin status:", err);
                setStatus({ isAdmin: false, isSuperAdmin: false, isLoading: false });
            }
        };

        checkAdminStatus();
    }, [walletAddress]);

    return status;
}

