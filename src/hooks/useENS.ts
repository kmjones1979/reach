"use client";

import { useState, useCallback } from "react";
import { createPublicClient, http, isAddress, type Address } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export type ENSResolution = {
  address: Address | null;
  ensName: string | null;
  avatar: string | null;
};

export function useENS() {
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveAddressOrENS = useCallback(
    async (input: string): Promise<ENSResolution | null> => {
      setIsResolving(true);
      setError(null);

      try {
        // Check if input is already an address
        if (isAddress(input)) {
          // Try to get ENS name for this address
          const ensName = await publicClient.getEnsName({
            address: input,
          });

          let avatar: string | null = null;
          if (ensName) {
            try {
              avatar = await publicClient.getEnsAvatar({
                name: normalize(ensName),
              });
            } catch {
              // Avatar fetch failed, continue without it
            }
          }

          return {
            address: input,
            ensName,
            avatar,
          };
        }

        // Input looks like an ENS name
        const normalizedName = input.endsWith(".eth") ? input : `${input}.eth`;

        try {
          const address = await publicClient.getEnsAddress({
            name: normalize(normalizedName),
          });

          if (!address) {
            setError("ENS name not found");
            return null;
          }

          let avatar: string | null = null;
          try {
            avatar = await publicClient.getEnsAvatar({
              name: normalize(normalizedName),
            });
          } catch {
            // Avatar fetch failed, continue without it
          }

          return {
            address,
            ensName: normalizedName,
            avatar,
          };
        } catch {
          setError("Invalid ENS name");
          return null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Resolution failed";
        setError(message);
        return null;
      } finally {
        setIsResolving(false);
      }
    },
    []
  );

  return {
    resolveAddressOrENS,
    isResolving,
    error,
    clearError: () => setError(null),
  };
}




