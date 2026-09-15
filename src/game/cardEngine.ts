import { CARD_BY_ID, EVENT_CARDS, ITEM_CARDS, OMEN_CARDS } from "./cardData";
import type { Card, CardDecks, DeckType, GameState } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Unique 1-of-1 card decks — one instance per card id. */
export function createShuffledCardDecks(): CardDecks {
  return {
    eventDeck: shuffle(EVENT_CARDS.map((c) => c.id)),
    eventDiscardPile: [],
    itemDeck: shuffle(ITEM_CARDS.map((c) => c.id)),
    omenDeck: shuffle(OMEN_CARDS.map((c) => c.id)),
  };
}

function deckField(type: DeckType): "eventDeck" | "itemDeck" | "omenDeck" {
  switch (type) {
    case "events":
      return "eventDeck";
    case "items":
      return "itemDeck";
    case "omens":
      return "omenDeck";
  }
}

function reshuffleEventsIfNeeded(decks: CardDecks): CardDecks {
  if (decks.eventDeck.length > 0 || decks.eventDiscardPile.length === 0) {
    return decks;
  }
  return {
    ...decks,
    eventDeck: shuffle([...decks.eventDiscardPile]),
    eventDiscardPile: [],
  };
}

/**
 * Pop/splice the next playable card from the active deck.
 * Skips ids already in drawnCardIds. Items/omens leave the deck permanently.
 * Events reshuffle from eventDiscardPile only when eventDeck is empty.
 */
export function drawCard(
  state: GameState,
  type: DeckType
): { card: Card | null; state: GameState } {
  let cardDecks = type === "events" ? reshuffleEventsIfNeeded(state.cardDecks) : state.cardDecks;
  const field = deckField(type);
  const deck = [...cardDecks[field]];
  const drawn = new Set(state.drawnCardIds);

  let card: Card | null = null;
  const remaining: string[] = [];

  for (const id of deck) {
    if (card) {
      remaining.push(id);
      continue;
    }
    if (drawn.has(id)) continue;
    const found = CARD_BY_ID[id];
    if (!found) continue;
    card = { ...found };
    drawn.add(id);
  }

  return {
    card,
    state: {
      ...state,
      cardDecks: { ...cardDecks, [field]: remaining },
      drawnCardIds: [...drawn],
    },
  };
}

/** After an event is fully resolved, move it to the discard pile (reshuffled only when deck empty). */
export function discardResolvedEvent(
  cardDecks: CardDecks,
  cardId: string
): CardDecks {
  if (cardDecks.eventDiscardPile.includes(cardId)) return cardDecks;
  return {
    ...cardDecks,
    eventDiscardPile: [...cardDecks.eventDiscardPile, cardId],
  };
}

/** @deprecated Use drawCard */
export function drawFromDeck(
  decks: CardDecks,
  type: DeckType
): { card: Card | null; decks: CardDecks } {
  const field = deckField(type);
  const deck = [...decks[field]];
  const id = deck.shift();
  if (!id) return { card: null, decks };
  const card = CARD_BY_ID[id];
  if (!card) return { card: null, decks: { ...decks, [field]: deck } };
  return {
    card: { ...card },
    decks: { ...decks, [field]: deck },
  };
}

export function drawCardType(): "event" | "item" | "omen" {
  const roll = Math.random();
  if (roll < 0.42) return "event";
  if (roll < 0.72) return "item";
  return "omen";
}
