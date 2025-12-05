"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { type Address } from "viem";
import { useWalletClient } from "wagmi";

// Dynamic import for XMTP to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let XMTPClient: any = null;

type XMTPContextType = {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  userInboxId: string | null;
  initialize: () => Promise<boolean>;
  sendMessage: (peerAddress: string, content: string) => Promise<{ success: boolean; error?: string }>;
  getMessages: (peerAddress: string) => Promise<unknown[]>;
  streamMessages: (peerAddress: string, onMessage: (message: unknown) => void) => Promise<unknown>;
  canMessage: (address: string) => Promise<boolean>;
  close: () => void;
};

const XMTPContext = createContext<XMTPContextType | null>(null);

export function XMTPProvider({ children, userAddress }: { children: ReactNode; userAddress: Address | null }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInboxId, setUserInboxId] = useState<string | null>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);
  const { data: walletClient } = useWalletClient();

  // Load XMTP SDK dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !XMTPClient) {
      import("@xmtp/browser-sdk").then((module) => {
        XMTPClient = module.Client;
        console.log("[XMTP] SDK loaded");
      });
    }
  }, []);

  // Initialize XMTP client
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!userAddress || !walletClient) {
      setError("Wallet not connected");
      return false;
    }

    if (!XMTPClient) {
      setError("XMTP SDK not loaded yet. Please try again.");
      return false;
    }

    if (clientRef.current) {
      return true; // Already initialized
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Create signer from wallet client
      const signer = {
        type: "EOA" as const,
        getIdentifier: () => ({
          identifier: userAddress,
          identifierKind: "Ethereum" as const,
        }),
        signMessage: async (message: string) => {
          const signature = await walletClient.signMessage({
            message,
          });
          // Convert hex string to Uint8Array
          const bytes = new Uint8Array(
            signature
              .slice(2)
              .match(/.{1,2}/g)!
              .map((byte: string) => parseInt(byte, 16))
          );
          return bytes;
        },
      };

      // Create XMTP client - using 'dev' environment for testing
      const client = await XMTPClient.create(signer, {
        env: "dev",
      });

      clientRef.current = client;
      
      console.log("[XMTP] Client created successfully");
      console.log("[XMTP] Inbox ID:", client.inboxId);
      
      setUserInboxId(client.inboxId);
      setIsInitialized(true);
      setIsInitializing(false);
      setError(null);
      return true;
    } catch (err) {
      console.error("[XMTP] Failed to initialize:", err);
      setIsInitialized(false);
      setIsInitializing(false);
      setError(err instanceof Error ? err.message : "Failed to initialize XMTP");
      return false;
    }
  }, [userAddress, walletClient]);

  // Check if an address is on XMTP
  const canMessage = useCallback(async (address: string): Promise<boolean> => {
    if (!XMTPClient) {
      console.log("[XMTP] canMessage: SDK not loaded");
      return false;
    }

    try {
      console.log("[XMTP] Checking if can message:", address);
      
      const identifier = {
        identifier: address.toLowerCase(),
        identifierKind: "Ethereum" as const,
      };
      
      const result = await XMTPClient.canMessage([identifier]);
      console.log("[XMTP] canMessage result:", result);
      
      const canMsg = result.get(address.toLowerCase());
      console.log("[XMTP] Can message", address, ":", canMsg);
      return !!canMsg;
    } catch (err) {
      console.error("[XMTP] canMessage error:", err);
      return false;
    }
  }, []);

  // Get or create DM conversation with an address
  const getOrCreateDm = useCallback(
    async (peerAddress: string) => {
      if (!clientRef.current || !XMTPClient) {
        throw new Error("XMTP not initialized. Please click 'Enable Chat' first.");
      }

      try {
        console.log("[XMTP] getOrCreateDm for:", peerAddress);
        
        // Check if peer can be messaged using static canMessage
        const identifier = {
          identifier: peerAddress.toLowerCase(),
          identifierKind: "Ethereum" as const,
        };
        
        const canMessageResult = await XMTPClient.canMessage([identifier]);
        console.log("[XMTP] canMessage result:", canMessageResult);
        
        const canMsg = canMessageResult.get(peerAddress.toLowerCase());
        if (!canMsg) {
          throw new Error("Peer is not on XMTP network yet. They need to enable XMTP first.");
        }

        // Find peer's inbox ID
        console.log("[XMTP] Finding inbox ID for peer...");
        const inboxId = await clientRef.current.findInboxIdByIdentifier(identifier);
        console.log("[XMTP] Inbox ID result:", inboxId);
        
        if (!inboxId) {
          throw new Error("Could not find peer's inbox ID");
        }

        // Check for existing DM by inbox ID
        console.log("[XMTP] Checking for existing DM...");
        const existingDm = await clientRef.current.conversations.getDmByInboxId(inboxId);
        if (existingDm) {
          console.log("[XMTP] Found existing DM");
          return existingDm;
        }

        // Create new DM
        console.log("[XMTP] Creating new DM with inbox:", inboxId);
        const dm = await clientRef.current.conversations.newDm(inboxId);
        console.log("[XMTP] New DM created successfully");
        return dm;
      } catch (err) {
        console.error("[XMTP] Error getting/creating DM:", err);
        throw err;
      }
    },
    []
  );

  // Send a message
  const sendMessage = useCallback(
    async (peerAddress: string, content: string): Promise<{ success: boolean; error?: string }> => {
      console.log("[XMTP] sendMessage called, client:", !!clientRef.current, "XMTPClient:", !!XMTPClient);
      
      if (!clientRef.current || !XMTPClient) {
        return { success: false, error: "XMTP client not initialized. Please click 'Enable Chat' first." };
      }

      try {
        console.log("[XMTP] Sending message to:", peerAddress);
        const dm = await getOrCreateDm(peerAddress);
        console.log("[XMTP] Got DM conversation, sending...");
        await dm.send(content);
        console.log("[XMTP] Message sent successfully!");
        return { success: true };
      } catch (err) {
        console.error("[XMTP] Failed to send message:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return { success: false, error: errorMessage };
      }
    },
    [getOrCreateDm]
  );

  // Get messages from a conversation
  const getMessages = useCallback(
    async (peerAddress: string) => {
      if (!clientRef.current) {
        return [];
      }

      try {
        const dm = await getOrCreateDm(peerAddress);
        console.log("[XMTP] Syncing DM...");
        await dm.sync();
        console.log("[XMTP] Getting messages...");
        const messages = await dm.messages();
        console.log("[XMTP] Got", messages.length, "messages");
        return messages;
      } catch (err) {
        console.error("[XMTP] Failed to get messages:", err);
        return [];
      }
    },
    [getOrCreateDm]
  );

  // Stream all messages (filters to specific peer in callback)
  const streamMessages = useCallback(
    async (peerAddress: string, onMessage: (message: unknown) => void) => {
      if (!clientRef.current) {
        return null;
      }

      try {
        console.log("[XMTP] Starting message stream for peer:", peerAddress);
        
        // Get the DM to know its ID for filtering
        const dm = await getOrCreateDm(peerAddress);
        const dmId = dm.id;
        console.log("[XMTP] DM ID for filtering:", dmId);
        
        // Stream all messages and filter to this conversation
        const stream = await clientRef.current.conversations.streamAllMessages({
          onValue: (message: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const msg = message as any;
            // Only process messages from this conversation
            if (msg.conversationId === dmId) {
              console.log("[XMTP] New message in DM:", msg);
              onMessage(message);
            }
          },
          onError: (error: unknown) => {
            console.error("[XMTP] Stream error:", error);
          },
        });

        return stream;
      } catch (err) {
        console.error("[XMTP] Failed to stream messages:", err);
        return null;
      }
    },
    [getOrCreateDm]
  );

  // Close client
  const close = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.close();
      clientRef.current = null;
      setIsInitialized(false);
      setIsInitializing(false);
      setError(null);
      setUserInboxId(null);
    }
  }, []);

  return (
    <XMTPContext.Provider
      value={{
        isInitialized,
        isInitializing,
        error,
        userInboxId,
        initialize,
        sendMessage,
        getMessages,
        streamMessages,
        canMessage,
        close,
      }}
    >
      {children}
    </XMTPContext.Provider>
  );
}

export function useXMTPContext() {
  const context = useContext(XMTPContext);
  if (!context) {
    throw new Error("useXMTPContext must be used within an XMTPProvider");
  }
  return context;
}

