import { CARD_BY_ID, EVENT_CARDS, ITEM_CARDS, OMEN_CARDS } from "./cardData";
import type { Card, CardDecks, CardType, DeckType, GameState } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createShuffledCardDecks(): CardDecks {
  return {
    eventsDeck: shuffle(EVENT_CARDS.map((c) => c.id)),
    itemsDeck: shuffle(ITEM_CARDS.map((c) => c.id)),
    omensDeck: shuffle(OMEN_CARDS.map((c) => c.id)),
    eventsDiscard: [],
    itemsDiscard: [],
    omensDiscard: [],
  };
}

function deckKey(type: DeckType): keyof CardDecks {
  switch (type) {
    case "events":
      return "eventsDeck";
    case "items":
      return "itemsDeck";
    case "omens":
      return "omensDeck";
  }
}

function discardKey(type: DeckType): keyof CardDecks {
  switch (type) {
    case "events":
      return "eventsDiscard";
    case "items":
      return "itemsDiscard";
    case "omens":
      return "omensDiscard";
  }
}

function reshuffleIfEmpty(decks: CardDecks, type: DeckType): CardDecks {
  const deckField = deckKey(type);
  const discardField = discardKey(type);
  if (decks[deckField].length > 0) return decks;
  if (decks[discardField].length === 0) return decks;
  return {
    ...decks,
    [deckField]: shuffle([...decks[discardField]]),
    [discardField]: [],
  };
}

export function drawFromDeck(
  decks: CardDecks,
  type: DeckType
): { card: Card | null; decks: CardDecks } {
  let next = reshuffleIfEmpty(decks, type);
  const deckField = deckKey(type);
  const discardField = discardKey(type);
  const deck = [...next[deckField]];
  const id = deck.shift();
  if (!id) return { card: null, decks: next };
  const card = CARD_BY_ID[id];
  if (!card) return { card: null, decks: next };
  next = {
    ...next,
    [deckField]: deck,
    [discardField]: [...next[discardField], id],
  };
  return { card: { ...card }, decks: next };
}

export function drawCardType(): CardType {
  const roll = Math.random();
  if (roll < 0.42) return "event";
  if (roll < 0.72) return "item";
  return "omen";
}

export function drawRoomCard(state: GameState): {
  card: Card | null;
  cardDecks: CardDecks;
  type: CardType;
} {
  const type = drawCardType();
  const deckType: DeckType =
    type === "event" ? "events" : type === "item" ? "items" : "omens";
  const { card, decks } = drawFromDeck(state.cardDecks, deckType);
  return { card, cardDecks: decks, type };
}

/** @deprecated Use drawRoomCard */
export function drawCard(type: CardType): Card {
  const ids =
    type === "event"
      ? EVENT_CARDS.map((c) => c.id)
      : type === "item"
        ? ITEM_CARDS.map((c) => c.id)
        : OMEN_CARDS.map((c) => c.id);
  const id = ids[Math.floor(Math.random() * ids.length)];
  return { ...CARD_BY_ID[id] };
}
