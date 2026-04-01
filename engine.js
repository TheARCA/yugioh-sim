export default class DuelEngine {
  constructor(board) {
    this.board = board;

    // Initialize Player States
    this.p1 = { id: "p1", lp: 8000, hand: [], deck: [], grave: [] };
    this.p2 = { id: "p2", lp: 8000, hand: [], deck: [], grave: [] };

    this.turnPlayer = this.p1;
    this.currentPhase = "MAIN_PHASE_1";
    this.eventListeners = [];
  }

  // --- ENGINE API ---

  addCardToHand(player, card) {
    player.hand.push(card);
    card.location = "HAND";
  }

  normalSummon(player, card, zoneId) {
    // 1. Ask the board for the specific zone the player clicked
    const targetZone = this.board.zones.find((z) => z.id === zoneId);

    // 2. Validation Checks
    if (!targetZone) return false; // Zone doesn't exist
    if (targetZone.card !== null) return false; // Zone is full
    if (targetZone.type !== "monster") return false; // Can't summon to Spell/Trap zone

    // 3. Remove card from player's hand
    const handIndex = player.hand.indexOf(card);
    if (handIndex > -1) {
      player.hand.splice(handIndex, 1);
    }

    // 4. Update the card's state and snap it to the zone
    card.location = "FIELD";
    targetZone.card = card;

    // (Later we will emit a "SUMMON_SUCCESS" event here for Trap Hole!)
    return true;
  }

  // --- THE MECHANICS API ---

  // Cards will call this instead of moving themselves
  destroy(targetCard, reason, sourceCard) {
    // 1. Physically move the card from FIELD to GY in the data structure
    const owner = targetCard.owner;
    this.board.moveCard(targetCard, "FIELD", "GY");

    // 2. Trigger an event so other cards can react (e.g., "When a monster is destroyed...")
    this.emitEvent("EVENT_CARD_DESTROYED", {
      card: targetCard,
      reason: reason,
      source: sourceCard,
    });
  }

  draw(player, amount) {
    for (let i = 0; i < amount; i++) {
      // 1. Pop from the top (end) of the deck array
      const card = player.deck.pop();

      // 2. Check for Deck Out win condition
      if (!card) {
        console.log("DECK OUT!");
        // this.triggerWin(this.getOpponent(player), "Deck Out");
        return;
      }

      // 3. Move it to the hand
      this.addCardToHand(player, card);
    }
  }

  changeLP(player, amount, reason) {
    player.lp += amount;
    if (player.lp <= 0) {
      this.triggerWin(this.getOpponent(player), "Life Points reached 0");
    }
  }

  // A helper for cards to easily grab targets
  getOpponentsMonsters(requestingPlayer) {
    const opponent = this.getOpponent(requestingPlayer);
    return this.board.getMonsters(opponent);
  }
}
