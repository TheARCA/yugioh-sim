// cardRegistry.js
import { CardDatabase } from "./database.js";
import triHornedDragonScript from "./scripts/39111158.js";

const CardRegistry = {};

// Helper function to merge stats + script into one usable template
function register(id, scriptData) {
  const stats = CardDatabase[id];
  if (stats) {
    // Merge the static data with the script logic
    CardRegistry[id] = { ...stats, ...scriptData };
  } else {
    console.error(
      `Attempted to register script for ${id}, but no stats exist in database.`,
    );
  }
}

// Register our first card!
register("39111158", triHornedDragonScript);

export default CardRegistry;
