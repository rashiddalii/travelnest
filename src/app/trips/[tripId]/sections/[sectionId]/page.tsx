"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth-store";
import { AddCardModal } from "@/components/trips/add-card-modal";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ShoppingBag,
  FileText,
  Camera,
  StickyNote,
  Music,
  MapPin,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";

interface Section {
  id: string;
  trip_id: string;
  type: string;
  title: string;
  position: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface Card {
  id: string;
  section_id: string;
  type: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, any>;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Trip {
  id: string;
  title: string;
  slug: string;
}

interface SectionPageProps {
  params: Promise<{
    tripId: string;
    sectionId: string;
  }>;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  overview: <MapPin className="w-5 h-5" />,
  itinerary: <Calendar className="w-5 h-5" />,
  budget: <DollarSign className="w-5 h-5" />,
  expenses: <DollarSign className="w-5 h-5" />,
  packing: <ShoppingBag className="w-5 h-5" />,
  documents: <FileText className="w-5 h-5" />,
  photos: <Camera className="w-5 h-5" />,
  notes: <StickyNote className="w-5 h-5" />,
  playlist: <Music className="w-5 h-5" />,
};

export default function SectionPage({ params }: SectionPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [section, setSection] = useState<Section | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Unwrap params Promise using React.use()
  const { tripId, sectionId } = use(params);

  useEffect(() => {
    // Only redirect if auth is done loading and no user
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    // Only fetch once when we have user and params, and haven't loaded yet
    if (user && tripId && sectionId && !hasLoadedRef.current && !authLoading) {
      hasLoadedRef.current = true;
      fetchSection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, tripId, sectionId]);

  const fetchSection = async () => {
    if (!tripId || !sectionId) return;
    
    // Don't fetch if we already have section data
    if (section) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/trips/${tripId}/sections/${sectionId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch section");
      }

      setSection(data.section);
      setCards(data.cards || []);
      setTrip(data.trip);
      setUserRole(data.userRole);
    } catch (err) {
      console.error("Error fetching section:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load section"
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshCards = async () => {
    if (!tripId || !sectionId) return;

    try {
      const response = await fetch(
        `/api/trips/${tripId}/sections/${sectionId}`
      );
      const data = await response.json();

      if (response.ok) {
        setCards(data.cards || []);
        setUserRole(data.userRole);
      }
    } catch (err) {
      console.error("Error refreshing cards:", err);
      // Don't show error to user, just log it
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!tripId || !sectionId) return;

    setLoading(true);
    const originalCards = [...cards];
    
    // Optimistic update
    setCards(cards.filter(card => card.id !== cardId));
    setDeletingCardId(null);

    try {
      const response = await fetch(
        `/api/trips/${tripId}/sections/${sectionId}/cards/${cardId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete card");
      }

      // Refresh to ensure consistency
      await refreshCards();
    } catch (err) {
      console.error("Error deleting card:", err);
      // Revert optimistic update on error
      setCards(originalCards);
      alert(err instanceof Error ? err.message : "Failed to delete card");
    } finally {
      setLoading(false);
    }
  };

  // Only show loading screen on initial load when we don't have data yet
  if ((authLoading || loading) && !section) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link
            href={trip ? `/trips/${tripId}` : "/dashboard"}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {trip ? trip.title : "Dashboard"}
          </Link>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {error}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You may not have access to this section, or it may not exist.
              </p>
              <Link
                href={trip ? `/trips/${tripId}` : "/dashboard"}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                Go Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!section) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Navigation */}
        <div className="mb-8">
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {trip?.title || "Trip"}
          </Link>
        </div>

        {/* Section Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
              {SECTION_ICONS[section.type] || <FileText className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {section.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {section.type}
              </p>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-6">
          {cards.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                {SECTION_ICONS[section.type] || (
                  <FileText className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No cards yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This section is empty. Add your first card to get started!
              </p>
              <button
                onClick={() => setIsAddCardModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                <Plus className="w-5 h-5" />
                Add Card
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Cards ({cards.length})
                </h2>
                <button
                  onClick={() => setIsAddCardModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  <Plus className="w-5 h-5" />
                  Add Card
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow relative group"
                  >
                    {/* Edit/Delete buttons - only show for editors/owners */}
                    {(userRole === "owner" || userRole === "editor") && (
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingCard(card)}
                          className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          title="Edit card"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCardId(card.id)}
                          className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          title="Delete card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                        {card.type === "video" && card.metadata?.isAudio ? "audio" : card.type}
                      </span>
                    </div>
                    {card.title && (
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {card.title}
                      </h3>
                    )}
                    {card.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        {card.content}
                      </p>
                    )}
                    {card.type === "image" && card.metadata?.url && (
                      <div className="mt-4 rounded-lg overflow-hidden">
                        <img
                          src={card.metadata.url}
                          alt={card.title || card.metadata.caption || "Image"}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        {card.metadata.caption && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {card.metadata.caption}
                          </p>
                        )}
                      </div>
                    )}
                    {card.type === "link" && card.metadata?.url && (
                      <div className="mt-4">
                        <a
                          href={card.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {card.metadata.url}
                        </a>
                      </div>
                    )}
                    {card.type === "map" && (
                      <div className="mt-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            {card.metadata?.placeName && (
                              <p className="font-medium text-gray-900 dark:text-white">
                                {card.metadata.placeName}
                              </p>
                            )}
                            {card.metadata?.address && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {card.metadata.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {card.type === "pdf" && card.metadata?.url && (
                      <div className="mt-4">
                        <a
                          href={card.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <FileText className="w-5 h-5" />
                          <span className="text-sm">
                            {card.metadata.fileName || "View File"}
                          </span>
                        </a>
                      </div>
                    )}
                    {card.type === "video" && card.metadata?.url && (
                      <div className="mt-4">
                        {card.metadata.isAudio ? (
                          // Audio player
                          <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-purple-600 dark:to-indigo-600 text-white rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                              <Music className="w-6 h-6" />
                              <div className="flex-1 min-w-0">
                                {card.title && (
                                  <p className="font-semibold truncate">{card.title}</p>
                                )}
                                <p className="text-sm text-white/90 truncate">
                                  🎵 Audio
                                </p>
                              </div>
                            </div>
                            <audio
                              controls
                              className="w-full mt-2"
                              src={card.metadata.url}
                            >
                              Your browser does not support the audio element.
                            </audio>
                            {card.content && (
                              <p className="text-xs text-white/80 mt-2">
                                {card.content}
                              </p>
                            )}
                          </div>
                        ) : (
                          // Video link
                          <a
                            href={card.metadata.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 bg-gradient-to-r from-red-500 to-pink-500 dark:from-red-600 dark:to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-600 dark:hover:from-red-700 dark:hover:to-pink-700 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <Music className="w-6 h-6" />
                              <div className="flex-1 min-w-0">
                                {card.title && (
                                  <p className="font-semibold truncate">{card.title}</p>
                                )}
                                <p className="text-sm text-white/90 truncate">
                                  {card.metadata.platform === "youtube" && "▶️ YouTube"}
                                  {card.metadata.platform === "spotify" && "🎵 Spotify"}
                                  {card.metadata.platform === "vimeo" && "▶️ Vimeo"}
                                  {!card.metadata.platform && "▶️ Video"}
                                </p>
                              </div>
                            </div>
                          </a>
                        )}
                        {!card.metadata.isAudio && card.content && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {card.content}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Card Modal */}
      <AddCardModal
        isOpen={isAddCardModalOpen || !!editingCard}
        onClose={() => {
          setIsAddCardModalOpen(false);
          setEditingCard(null);
        }}
        sectionId={sectionId}
        tripId={tripId}
        sectionType={section?.type}
        editingCard={editingCard}
        onCardAdded={(newCard) => {
          setIsAddCardModalOpen(false);
          setEditingCard(null);
          // Optimistic update - add card immediately
          if (newCard) {
            setCards([...cards, newCard]);
          }
          // Refresh in background to ensure consistency
          refreshCards();
        }}
        onCardUpdated={(updatedCard) => {
          setEditingCard(null);
          // Optimistic update - update card immediately
          if (updatedCard) {
            setCards(cards.map(card => 
              card.id === updatedCard.id ? updatedCard : card
            ));
          }
          // Refresh in background to ensure consistency
          refreshCards();
        }}
      />

      {/* Delete Confirmation Dialog */}
      {deletingCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Delete Card?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this card? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingCardId(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCard(deletingCardId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
