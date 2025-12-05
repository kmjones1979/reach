"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { type Address } from "viem";
import { useFriendRequests, type Friend } from "@/hooks/useFriendRequests";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { useCallSignaling } from "@/hooks/useCallSignaling";
import { useENS } from "@/hooks/useENS";
import { FriendsList } from "./FriendsList";
import { FriendRequests } from "./FriendRequests";
import { AddFriendModal } from "./AddFriendModal";
import { VoiceCallUI } from "./VoiceCallUI";
import { IncomingCallModal } from "./IncomingCallModal";
import { ChatModal } from "./ChatModal";
import { XMTPProvider, useXMTPContext } from "@/context/XMTPProvider";
import { isAgoraConfigured } from "@/config/agora";

type DashboardProps = {
  userAddress: Address;
  onLogout: () => void;
};

// Convert Friend from useFriendRequests to the format FriendsList expects
type FriendsListFriend = {
  id: string;
  address: Address;
  ensName: string | null;
  avatar: string | null;
  nickname: string | null;
  addedAt: string;
  isOnline?: boolean;
};

function DashboardContent({ userAddress, onLogout }: DashboardProps) {
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [currentCallFriend, setCurrentCallFriend] = useState<FriendsListFriend | null>(null);
  const [chatFriend, setChatFriend] = useState<FriendsListFriend | null>(null);
  const [userENS, setUserENS] = useState<{ ensName: string | null; avatar: string | null }>({
    ensName: null,
    avatar: null,
  });

  const { resolveAddressOrENS } = useENS();

  const {
    incomingRequests,
    outgoingRequests,
    friends,
    isLoading: isFriendsLoading,
    error: friendsError,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    clearError: clearFriendsError,
    isConfigured: isSupabaseConfigured,
    refresh: refreshFriends,
  } = useFriendRequests(userAddress);

  // Resolve user's ENS
  useEffect(() => {
    async function resolveUserENS() {
      const resolved = await resolveAddressOrENS(userAddress);
      if (resolved) {
        setUserENS({
          ensName: resolved.ensName,
          avatar: resolved.avatar,
        });
      }
    }
    resolveUserENS();
  }, [userAddress, resolveAddressOrENS]);

  const {
    callState,
    isMuted,
    duration,
    error: callError,
    joinCall,
    leaveCall,
    toggleMute,
    formatDuration,
    isConfigured: isCallConfigured,
  } = useVoiceCall();

  const {
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall: endCallSignaling,
  } = useCallSignaling(userAddress);

  const {
    isInitialized: isXMTPInitialized,
    isInitializing: isXMTPInitializing,
    error: xmtpError,
    initialize: initializeXMTP,
  } = useXMTPContext();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Convert friends to the format FriendsList expects
  const friendsListData: FriendsListFriend[] = friends.map((f) => ({
    id: f.id,
    address: f.friend_address as Address,
    ensName: f.ensName || null,
    avatar: f.avatar || null,
    nickname: f.nickname,
    addedAt: f.created_at,
  }));

  // Find caller info from friends list
  const incomingCallFriend = incomingCall
    ? friendsListData.find(
        (f) => f.address.toLowerCase() === incomingCall.caller_address.toLowerCase()
      )
    : null;

  const handleSendFriendRequest = async (addressOrENS: string): Promise<boolean> => {
    return await sendFriendRequest(addressOrENS);
  };

  const handleCall = async (friend: FriendsListFriend) => {
    if (!isCallConfigured) {
      alert("Voice calling not configured. Please set NEXT_PUBLIC_AGORA_APP_ID.");
      return;
    }

    setCurrentCallFriend(friend);
    
    // Generate a unique channel name based on both addresses (sorted for consistency)
    const addresses = [userAddress.toLowerCase(), friend.address.toLowerCase()].sort();
    const channelName = `shout_${addresses[0].slice(2, 10)}_${addresses[1].slice(2, 10)}`;
    
    // Create signaling record to notify the callee
    await startCall(friend.address, channelName);
    
    // Join the Agora channel
    await joinCall(channelName);
  };

  const handleAcceptCall = async () => {
    const channelName = await acceptCall();
    if (channelName) {
      // Find the caller friend to show in the call UI
      if (incomingCallFriend) {
        setCurrentCallFriend(incomingCallFriend);
      }
      // Join the Agora channel
      await joinCall(channelName);
    }
  };

  const handleRejectCall = async () => {
    await rejectCall();
  };

  const handleEndCall = async () => {
    await leaveCall();
    await endCallSignaling();
    setCurrentCallFriend(null);
  };

  const handleRemoveFriend = async (friendId: string) => {
    await removeFriend(friendId);
  };

  const handleChat = (friend: FriendsListFriend) => {
    setChatFriend(friend);
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950">
        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-lg sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* User Avatar or App Icon */}
                {userENS.avatar ? (
                  <img
                    src={userENS.avatar}
                    alt="Avatar"
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <h1 className="text-white font-bold">
                    {userENS.ensName || "Shout"}
                  </h1>
                  <p className="text-zinc-500 text-sm font-mono">
                    {formatAddress(userAddress)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refreshFriends}
                  disabled={isFriendsLoading}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <svg
                    className={`w-5 h-5 ${isFriendsLoading ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  onClick={onLogout}
                  className="py-2 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Status Banners */}
          {!isSupabaseConfigured && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-400 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-amber-200 font-medium">Database Not Connected</p>
                  <p className="text-amber-200/70 text-sm mt-1">
                    Set Supabase environment variables to enable friend requests.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {!isAgoraConfigured && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-400 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-amber-200 font-medium">Voice Calling Not Configured</p>
                  <p className="text-amber-200/70 text-sm mt-1">
                    Set <code className="bg-amber-500/20 px-1 rounded">NEXT_PUBLIC_AGORA_APP_ID</code> to enable voice calls.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* XMTP Status Banner */}
          {!isXMTPInitialized && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-400 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <div>
                    <p className="text-blue-200 font-medium">Enable XMTP Chat</p>
                    <p className="text-blue-200/70 text-sm mt-1">
                      Sign a message to enable encrypted messaging. Your friends also need to enable XMTP to chat.
                    </p>
                    {xmtpError && (
                      <p className="text-red-400 text-sm mt-1">{xmtpError}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={initializeXMTP}
                  disabled={isXMTPInitializing}
                  className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isXMTPInitializing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing...
                    </>
                  ) : (
                    "Enable Chat"
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* XMTP Enabled Success */}
          {isXMTPInitialized && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-emerald-200 font-medium">
                  XMTP Chat Enabled! You can now send and receive encrypted messages.
                </p>
              </div>
            </motion.div>
          )}

          {/* Friend Requests Section */}
          {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
              <div className="p-6">
                <FriendRequests
                  incomingRequests={incomingRequests}
                  outgoingRequests={outgoingRequests}
                  onAccept={acceptRequest}
                  onReject={rejectRequest}
                  isLoading={isFriendsLoading}
                />
              </div>
            </div>
          )}

          {/* Friends Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Friends</h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    {friends.length} {friends.length === 1 ? "friend" : "friends"}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddFriendOpen(true)}
                  disabled={!isSupabaseConfigured}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Friend
                </button>
              </div>
            </div>

            <div className="p-6">
              <FriendsList
                friends={friendsListData}
                onCall={handleCall}
                onChat={handleChat}
                onRemove={handleRemoveFriend}
                isCallActive={callState !== "idle"}
              />
            </div>
          </div>

          {/* Call Error */}
          <AnimatePresence>
            {callError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
              >
                <p className="text-red-400">{callError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Friends Error */}
          <AnimatePresence>
            {friendsError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
              >
                <p className="text-red-400">{friendsError}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Add Friend Modal */}
      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => {
          setIsAddFriendOpen(false);
          clearFriendsError();
        }}
        onAdd={handleSendFriendRequest}
        isLoading={isFriendsLoading}
        error={friendsError}
      />

      {/* Voice Call UI */}
      <AnimatePresence>
        {callState !== "idle" && currentCallFriend && (
          <VoiceCallUI
            friend={{
              id: currentCallFriend.id,
              address: currentCallFriend.address,
              ensName: currentCallFriend.ensName,
              avatar: currentCallFriend.avatar,
              nickname: currentCallFriend.nickname,
              addedAt: currentCallFriend.addedAt,
            }}
            callState={callState}
            isMuted={isMuted}
            duration={duration}
            formatDuration={formatDuration}
            onToggleMute={toggleMute}
            onEndCall={handleEndCall}
          />
        )}
      </AnimatePresence>

      {/* Incoming Call Modal */}
      {incomingCall && callState === "idle" && (
        <IncomingCallModal
          callerAddress={incomingCall.caller_address}
          callerName={incomingCallFriend?.ensName || incomingCallFriend?.nickname}
          callerAvatar={incomingCallFriend?.avatar}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Chat Modal */}
      <ChatModal
        isOpen={!!chatFriend}
        onClose={() => setChatFriend(null)}
        userAddress={userAddress}
        peerAddress={chatFriend?.address || ("0x" as Address)}
        peerName={chatFriend?.ensName || chatFriend?.nickname}
        peerAvatar={chatFriend?.avatar}
      />
    </>
  );
}

// Wrapper that provides XMTP context
export function Dashboard({ userAddress, onLogout }: DashboardProps) {
  return (
    <XMTPProvider userAddress={userAddress}>
      <DashboardContent userAddress={userAddress} onLogout={onLogout} />
    </XMTPProvider>
  );
}
