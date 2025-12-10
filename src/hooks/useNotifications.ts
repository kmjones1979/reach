"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type NotificationPermission = "granted" | "denied" | "default";

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Generate a gentle "blerp" notification sound
function playMessageSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Gentle two-tone blerp
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6
    
    oscillator.type = "sine";
    
    // Quick fade in and out
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.08);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.warn("[Notifications] Could not play message sound:", err);
  }
}

// Generate a gentle ringing sound for calls
function playRingSound(stop?: { current: boolean }) {
  try {
    const ctx = getAudioContext();
    
    const playRing = (startTime: number) => {
      if (stop?.current) return;
      
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Classic two-tone ring (like a phone)
      oscillator1.frequency.setValueAtTime(440, startTime); // A4
      oscillator2.frequency.setValueAtTime(480, startTime); // ~B4
      
      oscillator1.type = "sine";
      oscillator2.type = "sine";
      
      // Ring pattern: on for 1s, off for 2s
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gainNode.gain.setValueAtTime(0.15, startTime + 0.8);
      gainNode.gain.linearRampToValueAtTime(0, startTime + 1);

      oscillator1.start(startTime);
      oscillator1.stop(startTime + 1);
      oscillator2.start(startTime);
      oscillator2.stop(startTime + 1);
    };

    // Play initial ring
    playRing(ctx.currentTime);
    
    // Return a function to play another ring (for looping)
    return () => {
      if (!stop?.current) {
        playRing(ctx.currentTime);
      }
    };
  } catch (err) {
    console.warn("[Notifications] Could not play ring sound:", err);
    return () => {};
  }
}

// Play a short ring once (for outgoing call feedback)
function playOutgoingCallSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.warn("[Notifications] Could not play outgoing call sound:", err);
  }
}

// Play call connected sound
function playCallConnectedSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Rising tone to indicate connection
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.15);
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.warn("[Notifications] Could not play connected sound:", err);
  }
}

// Play call ended sound
function playCallEndedSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Falling tone to indicate disconnection
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.15);
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.warn("[Notifications] Could not play ended sound:", err);
  }
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopRingRef = useRef(false);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("[Notifications] Browser doesn't support notifications");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result === "granted";
    } catch (err) {
      console.error("[Notifications] Permission request failed:", err);
      return false;
    }
  }, []);

  // Show a browser notification
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== "granted") {
      console.log("[Notifications] Permission not granted");
      return null;
    }

    // Don't show if tab is focused
    if (document.hasFocus()) {
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Focus window when clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (err) {
      console.error("[Notifications] Failed to show notification:", err);
      return null;
    }
  }, [permission]);

  // Notify for new message
  const notifyMessage = useCallback((senderName: string, message: string) => {
    playMessageSound();
    showNotification(`Message from ${senderName}`, {
      body: message.length > 100 ? message.slice(0, 100) + "..." : message,
      tag: `message-${Date.now()}`, // Unique tag to ensure each message shows
    });
  }, [showNotification]);

  // Start ringing for incoming call
  const startRinging = useCallback((callerName: string) => {
    stopRingRef.current = false;
    
    // Play initial ring
    const playNext = playRingSound(stopRingRef);
    
    // Continue ringing every 3 seconds
    ringIntervalRef.current = setInterval(() => {
      if (!stopRingRef.current) {
        playNext?.();
      }
    }, 3000);

    // Show notification
    showNotification(`Incoming call from ${callerName}`, {
      body: "Tap to answer",
      tag: `call-${Date.now()}`,
      requireInteraction: true,
    });
  }, [showNotification]);

  // Stop ringing
  const stopRinging = useCallback(() => {
    stopRingRef.current = true;
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  }, []);

  // Notify for outgoing call
  const notifyOutgoingCall = useCallback(() => {
    playOutgoingCallSound();
  }, []);

  // Notify call connected
  const notifyCallConnected = useCallback(() => {
    stopRinging();
    playCallConnectedSound();
  }, [stopRinging]);

  // Notify call ended
  const notifyCallEnded = useCallback(() => {
    stopRinging();
    playCallEndedSound();
  }, [stopRinging]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRinging();
    };
  }, [stopRinging]);

  return {
    permission,
    requestPermission,
    showNotification,
    notifyMessage,
    startRinging,
    stopRinging,
    notifyOutgoingCall,
    notifyCallConnected,
    notifyCallEnded,
    playMessageSound,
  };
}

