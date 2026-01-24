"use client";

import { useState, useEffect } from "react";
import { X, Plus, FileText, Image, Link as LinkIcon, MapPin, File, Upload, Video, Music, Headphones } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  tripId: string;
  sectionType?: string;
  editingCard?: {
    id: string;
    type: string;
    title: string | null;
    content: string | null;
    metadata: Record<string, any>;
  } | null;
  onCardAdded: (card?: any) => void;
  onCardUpdated?: (card: any) => void;
}

const ALL_CARD_TYPES = [
  { value: "text", label: "Text", icon: FileText, description: "Title and description" },
  { value: "image", label: "Image", icon: Image, description: "Upload image or URL" },
  { value: "link", label: "Link", icon: LinkIcon, description: "URL with title" },
  { value: "map", label: "Location", icon: MapPin, description: "Place name and address" },
  { value: "pdf", label: "File", icon: File, description: "PDF or document" },
  { value: "video", label: "Video", icon: Video, description: "YouTube, Spotify, or video URL" },
  { value: "audio", label: "Audio", icon: Headphones, description: "Upload audio file or URL" },
];

// Get card types based on section type
const getCardTypes = (sectionType?: string) => {
  if (sectionType === "playlist") {
    // For playlist sections, show all options including video and audio
    return ALL_CARD_TYPES;
  }
  // For other sections, show all except video and audio (or include video for photos)
  return ALL_CARD_TYPES.filter(type => 
    (type.value !== "video" && type.value !== "audio") || sectionType === "photos"
  );
};

export function AddCardModal({
  isOpen,
  onClose,
  sectionId,
  tripId,
  sectionType,
  editingCard,
  onCardAdded,
  onCardUpdated,
}: AddCardModalProps) {
  const cardTypes = getCardTypes(sectionType);
  const defaultType = sectionType === "playlist" ? "audio" : "text";
  const isEditing = !!editingCard;
  
  const [cardType, setCardType] = useState<string>(defaultType);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Load editing card data when modal opens
  useEffect(() => {
    if (isOpen && editingCard) {
      const actualType = editingCard.type === "video" && editingCard.metadata?.isAudio ? "audio" : editingCard.type;
      setCardType(actualType);
      setTitle(editingCard.title || "");
      setContent(editingCard.content || "");
      
      // Reset all fields first
      setUrl("");
      setImageUrl("");
      setAudioUrl("");
      setPlaceName("");
      setAddress("");
      setImageFile(null);
      setFile(null);
      setAudioFile(null);
      
      // Load metadata based on actual card type
      if (actualType === "image") {
        setImageUrl(editingCard.metadata?.url || "");
      } else if (actualType === "link") {
        setUrl(editingCard.metadata?.url || "");
      } else if (actualType === "video") {
        setUrl(editingCard.metadata?.url || "");
      } else if (actualType === "audio") {
        setAudioUrl(editingCard.metadata?.url || "");
      } else if (actualType === "map") {
        setPlaceName(editingCard.metadata?.placeName || "");
        setAddress(editingCard.metadata?.address || "");
      }
    } else if (isOpen && !editingCard) {
      // Reset form for new card
      setCardType(defaultType);
      setTitle("");
      setContent("");
      setUrl("");
      setPlaceName("");
      setAddress("");
      setImageFile(null);
      setImageUrl("");
      setFile(null);
      setAudioFile(null);
      setAudioUrl("");
    }
  }, [isOpen, editingCard, defaultType]);

  const resetForm = () => {
    setCardType(defaultType);
    setTitle("");
    setContent("");
    setUrl("");
    setPlaceName("");
    setAddress("");
    setImageFile(null);
    setImageUrl("");
    setFile(null);
    setAudioFile(null);
    setAudioUrl("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const uploadImage = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `cards/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { data, error: uploadError } = await supabase.storage
        .from("trip-covers") // Using existing bucket for now
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("trip-covers").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `cards/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { data, error: uploadError } = await supabase.storage
        .from("trip-covers") // Using existing bucket for now
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("trip-covers").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const uploadAudio = async (file: File): Promise<string> => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `audio/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { data, error: uploadError } = await supabase.storage
        .from("trip-covers") // Using existing bucket for now
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("trip-covers").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading audio:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let metadata: Record<string, any> = {};

      // Handle different card types
      if (cardType === "image") {
        let imageUrlToUse = imageUrl;
        if (imageFile) {
          imageUrlToUse = await uploadImage(imageFile);
        }
        if (!imageUrlToUse) {
          throw new Error("Please provide an image URL or upload a file");
        }
        metadata.url = imageUrlToUse;
        if (content) {
          metadata.caption = content;
        }
      } else if (cardType === "link") {
        const linkUrl = url || "";
        if (!linkUrl.trim()) {
          throw new Error("URL is required");
        }
        metadata.url = linkUrl;
        // Description is stored in content field for link cards
      } else if (cardType === "map") {
        if (!placeName) {
          throw new Error("Place name is required");
        }
        metadata.placeName = placeName;
        metadata.address = address;
        // TODO: Add map coordinates later
      } else if (cardType === "pdf") {
        if (!file) {
          throw new Error("Please upload a file");
        }
        const fileUrl = await uploadFile(file);
        metadata.url = fileUrl;
        metadata.fileName = file.name;
      } else if (cardType === "video") {
        if (!url) {
          throw new Error("Video URL is required (YouTube, Spotify, or video link)");
        }
        metadata.url = url;
        // Detect platform
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
          metadata.platform = "youtube";
        } else if (url.includes("spotify.com")) {
          metadata.platform = "spotify";
        } else if (url.includes("vimeo.com")) {
          metadata.platform = "vimeo";
        }
      } else if (cardType === "audio") {
        let audioUrlToUse = audioUrl;
        if (audioFile) {
          audioUrlToUse = await uploadAudio(audioFile);
        }
        if (!audioUrlToUse) {
          throw new Error("Please provide an audio URL or upload a file");
        }
        metadata.url = audioUrlToUse;
        metadata.fileName = audioFile?.name || "audio";
        metadata.isAudio = true;
        // Store as "video" type in DB but with audio metadata
      }

      const apiUrl = isEditing && editingCard
        ? `/api/trips/${tripId}/sections/${sectionId}/cards/${editingCard.id}`
        : `/api/trips/${tripId}/sections/${sectionId}/cards`;
      
      const response = await fetch(apiUrl, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
            // Store audio as "video" type in DB (since audio isn't in schema)
            // but we'll use metadata.isAudio to distinguish
            type: cardType === "audio" ? "video" : cardType,
            title: title || null,
            // Content is used for: text cards, audio cards, and link cards (description)
            content: (cardType === "text" || cardType === "audio" || cardType === "link") ? content : null,
            metadata,
          }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create card");
      }

      // Close modal first for better UX
      handleClose();

      // Optimistically update UI with new/updated card
      if (isEditing && editingCard && onCardUpdated && data.card) {
        onCardUpdated(data.card);
      } else if (data.card) {
        onCardAdded(data.card);
      } else {
        // Fallback: refresh if card data not in response
        onCardAdded();
      }
    } catch (err) {
      console.error("Error creating card:", err);
      setError(err instanceof Error ? err.message : "Failed to create card");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? "Edit Card" : "Add Card"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Card Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Card Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {cardTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setCardType(type.value)}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      cardType === type.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 mx-auto mb-2 ${
                        cardType === type.value
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {type.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title (for all types) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title {cardType !== "text" && "(optional)"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter title"
            />
          </div>

          {/* Content fields based on card type */}
          {cardType === "text" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter description or notes"
              />
            </div>
          )}

          {cardType === "image" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL (or upload file below)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Caption (optional)
                </label>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Image caption"
                />
              </div>
            </>
          )}

          {cardType === "link" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Link description"
                />
              </div>
            </>
          )}

          {cardType === "map" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Place Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Eiffel Tower"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address (optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Champ de Mars, 5 Avenue Anatole France, 75007 Paris"
                />
              </div>
            </>
          )}

          {cardType === "pdf" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {cardType === "video" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://youtube.com/watch?v=... or https://open.spotify.com/track/..."
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Supports YouTube, Spotify, Vimeo, or any video URL
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a note about this song/video"
                />
              </div>
            </>
          )}

          {cardType === "audio" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Audio URL (or upload file below)
                </label>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/audio.mp3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or Upload Audio File
                </label>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Supports MP3, WAV, M4A, OGG, FLAC formats
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a note about this song/audio"
                />
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Card" : "Add Card")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
