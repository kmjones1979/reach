"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { STATUS_PRESETS, type UserSettings } from "@/hooks/useUserSettings";

type StatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: UserSettings;
  onSave: (emoji: string, text: string) => Promise<boolean>;
  onToggleDnd: () => void;
  onToggleSound: () => void;
};

// Emoji categories for picker
const EMOJI_CATEGORIES = {
  "Status": ["💬", "👋", "😊", "🎉", "🎧", "🏠", "🚗", "🍕", "🏃", "🌴", "🤒", "🔨", "📵", "🎮", "📚", "☕"],
  "Mood": ["😀", "😎", "🥳", "😴", "🤔", "😤", "🥺", "😇", "🤩", "😌", "🙃", "😏", "🫡", "🤫", "🫠", "😵‍💫"],
  "Activity": ["🏋️", "🧘", "🎵", "🎯", "💻", "📱", "✈️", "🚀", "🎨", "📷", "🎬", "🎸", "⚽", "🏀", "🎾", "🏊"],
  "Nature": ["🌙", "⭐", "🔥", "💪", "🌈", "☀️", "🌧️", "❄️", "🌺", "🌻", "🍀", "🌊", "⛰️", "🏖️", "🌅", "🌌"],
};

export function StatusModal({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  onToggleDnd,
  onToggleSound,
}: StatusModalProps) {
  const [selectedEmoji, setSelectedEmoji] = useState(currentSettings.statusEmoji);
  const [statusText, setStatusText] = useState(currentSettings.statusText);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>("Status");
  const [customEmojiInput, setCustomEmojiInput] = useState("");

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedEmoji(currentSettings.statusEmoji);
      setStatusText(currentSettings.statusText);
      setShowEmojiPicker(false);
    }
  }, [isOpen, currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(selectedEmoji, statusText);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const handlePresetClick = (emoji: string, text: string) => {
    setSelectedEmoji(emoji);
    setStatusText(text);
  };

  const handleClear = async () => {
    setIsSaving(true);
    const success = await onSave("💬", "Available to chat");
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Set Your Status</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Current Status Preview */}
              <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-12 h-12 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-2xl transition-colors"
                  >
                    {selectedEmoji}
                  </button>
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value.slice(0, 80))}
                    placeholder="What's your status?"
                    className="flex-1 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none text-lg"
                    maxLength={80}
                  />
                </div>
                
                {/* Emoji Picker */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-zinc-700 overflow-hidden"
                    >
                      {/* Custom emoji input */}
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={customEmojiInput}
                          onChange={(e) => setCustomEmojiInput(e.target.value)}
                          placeholder="Type or paste emoji..."
                          className="flex-1 py-2 px-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                          maxLength={4}
                        />
                        <button
                          onClick={() => {
                            if (customEmojiInput) {
                              setSelectedEmoji(customEmojiInput);
                              setCustomEmojiInput("");
                              setShowEmojiPicker(false);
                            }
                          }}
                          disabled={!customEmojiInput}
                          className="py-2 px-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          Use
                        </button>
                      </div>
                      
                      {/* Category tabs */}
                      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                        {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setEmojiCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                              emojiCategory === cat 
                                ? "bg-violet-600 text-white" 
                                : "bg-zinc-700 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      
                      {/* Emoji grid */}
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJI_CATEGORIES[emojiCategory].map((emoji, idx) => (
                          <button
                            key={`${emoji}-${idx}`}
                            onClick={() => {
                              setSelectedEmoji(emoji);
                              setShowEmojiPicker(false);
                            }}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl hover:bg-zinc-600 transition-colors ${
                              selectedEmoji === emoji ? "bg-violet-600" : ""
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Preset Statuses */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Quick Status</h3>
                <div className="space-y-1">
                  {STATUS_PRESETS.slice(1).map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetClick(preset.emoji, preset.text)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        selectedEmoji === preset.emoji && statusText === preset.text
                          ? "bg-violet-600/20 text-violet-300"
                          : "hover:bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      <span className="text-xl">{preset.emoji}</span>
                      <span className="text-sm">{preset.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings Toggles */}
              <div className="border-t border-zinc-800 pt-4 mb-6 space-y-3">
                {/* Do Not Disturb */}
                <button
                  onClick={onToggleDnd}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔕</span>
                    <div className="text-left">
                      <p className="text-white font-medium">Do Not Disturb</p>
                      <p className="text-zinc-500 text-xs">Block incoming calls</p>
                    </div>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      currentSettings.isDnd ? "bg-red-500" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        currentSettings.isDnd ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>

                {/* Sound Effects */}
                <button
                  onClick={onToggleSound}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{currentSettings.soundEnabled ? "🔊" : "🔇"}</span>
                    <div className="text-left">
                      <p className="text-white font-medium">Sound Effects</p>
                      <p className="text-zinc-500 text-xs">Message and call sounds</p>
                    </div>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      currentSettings.soundEnabled ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        currentSettings.soundEnabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClear}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

