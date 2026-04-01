import DuelEngine from "./engine.js";

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 15 + 5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = Math.random() * 6 + 2;
    this.life = 1.0;
    this.decay = Math.random() * 0.05 + 0.03;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.9;
    this.vy *= 0.9;
    this.life -= this.decay;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.fillStyle = `rgba(255, 255, 255, ${this.life})`;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

class Card {
  // NEW: Added Level property
  constructor(id, name, type, atk, def, desc, level = 0) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.atk = atk;
    this.def = def;
    this.desc = desc;
    this.level = level;
    this.location = "HAND";
    this.drawY = 0;
  }

  draw(ctx, x, y, size) {
    if (this.drawY === 0) this.drawY = y;
    this.drawY += (y - this.drawY) * 0.3;
    const currentY = this.drawY;

    ctx.fillStyle = "#000000";
    ctx.fillRect(x + 2, currentY + 2, size - 4, size - 4);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, currentY + 2, size - 4, size - 4);

    const artPad = 12;
    const artSize = size - artPad * 2;
    ctx.strokeStyle = "#888888";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + artPad, currentY + artPad, artSize, artSize);

    // --- UX UPGRADE: Draw Level Stars ---
    if (this.type === "Monster" && this.level > 0) {
      const starSize = Math.max(2, Math.floor(size / 25));
      const starSpacing = 3;
      const totalStarWidth =
        this.level * starSize + (this.level - 1) * starSpacing;
      let starX = x + size - artPad - totalStarWidth - 2; // Right aligned
      let starY = currentY + artPad + 4; // Inside top of art box

      ctx.fillStyle = "#FFFFFF";
      for (let i = 0; i < this.level; i++) {
        ctx.fillRect(
          starX + i * (starSize + starSpacing),
          starY,
          starSize,
          starSize,
        );
      }
    }

    ctx.beginPath();
    ctx.moveTo(x + artPad, currentY + artPad);
    ctx.lineTo(x + size - artPad, currentY + size - artPad);
    ctx.moveTo(x + size - artPad, currentY + artPad);
    ctx.lineTo(x + artPad, currentY + size - artPad);
    ctx.stroke();

    const centerPad = artPad + 10;
    const centerSize = size - centerPad * 2;
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + centerPad, currentY + centerPad, centerSize, centerSize);
    ctx.strokeRect(x + centerPad, currentY + centerPad, centerSize, centerSize);

    ctx.fillStyle = "#FFFFFF";
    let fontSize = Math.floor(centerSize * 0.6);
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.name.charAt(0), x + size / 2, currentY + size / 2 + 2);
  }
}

class Zone {
  constructor(
    x,
    y,
    size,
    label,
    isOpponent = false,
    type = "normal",
    id = null,
  ) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.label = label;
    this.isOpponent = isOpponent;
    this.type = type;
    this.id = id;
    this.card = null;
  }
  draw(ctx) {
    if (this.card) {
      this.card.draw(ctx, this.x, this.y, this.size);
      return;
    }
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#FFFFFF";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.size, this.size);
    ctx.shadowBlur = 0;

    const innerPadding = 6;
    const innerSize = this.size - innerPadding * 2;
    ctx.strokeStyle = "#666666";
    if (this.type === "st") ctx.setLineDash([4, 4]);
    else if (this.type === "deck") ctx.setLineDash([2, 2]);
    else ctx.setLineDash([]);
    ctx.strokeRect(
      this.x + innerPadding,
      this.y + innerPadding,
      innerSize,
      innerSize,
    );
    ctx.setLineDash([]);

    let fontSize = Math.max(8, Math.floor(this.size / 6));
    ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    const textWidth = ctx.measureText(this.label).width;
    ctx.fillRect(
      this.x + this.size / 2 - textWidth / 2 - 4,
      this.y + this.size / 2 - fontSize / 2 - 4,
      textWidth + 8,
      fontSize + 8,
    );
    ctx.fillStyle = this.isOpponent ? "#666666" : "#FFFFFF";
    ctx.fillText(
      this.label,
      this.x + this.size / 2,
      this.y + this.size / 2 + 1,
    );
  }
}

class Board {
  constructor() {
    this.zones = [];
    this.matBounds = null;
    this.uiOffset = 280; // Width of the Left Panel
  }

  recalculateLayout(width, height) {
    this.zones = [];
    const padding = 15;
    const MAX_ZONE_SIZE = 110;

    // --- UX UPGRADE: Camera Offset Math ---
    // Calculate the available width *after* removing the UI panel
    const availableWidth = width - this.uiOffset;

    const maxZoneWidth = (availableWidth - padding * 9) / 8;
    const maxZoneHeight = (height - padding * 6) / 5;
    const size = Math.min(
      Math.floor(Math.min(maxZoneWidth, maxZoneHeight)),
      MAX_ZONE_SIZE,
    );

    const coreWidth = 7 * size + 6 * padding;

    // Shift the starting X coordinate completely over to the right
    const startX = this.uiOffset + (availableWidth - coreWidth) / 2;
    const startY = (height - (5 * size + 4 * padding)) / 2;

    this.matBounds = {
      x: startX - padding,
      y: startY - padding,
      w: coreWidth + padding * 2,
      h: 5 * size + 4 * padding + padding * 2,
    };

    const getX = (col) => startX + col * (size + padding);
    const getY = (row) => startY + row * (size + padding);

    // Opponent
    this.zones.push(new Zone(getX(0), getY(0), size, "DECK", true, "deck"));
    for (let i = 1; i <= 5; i++)
      this.zones.push(
        new Zone(getX(i), getY(0), size, "S/T" + (6 - i), true, "st"),
      );
    this.zones.push(new Zone(getX(6), getY(0), size, "EXTRA", true, "deck"));
    this.zones.push(new Zone(getX(-1), getY(1), size, "BANISH", true, "deck"));
    this.zones.push(new Zone(getX(0), getY(1), size, "GY", true, "deck"));
    for (let i = 1; i <= 5; i++)
      this.zones.push(
        new Zone(getX(i), getY(1), size, "M" + (6 - i), true, "monster"),
      );
    this.zones.push(new Zone(getX(6), getY(1), size, "FIELD", true, "monster"));

    // Player 1
    this.zones.push(
      new Zone(getX(0), getY(3), size, "FIELD", false, "monster", "p1_field"),
    );
    for (let i = 1; i <= 5; i++)
      this.zones.push(
        new Zone(getX(i), getY(3), size, "M" + i, false, "monster", "p1_m" + i),
      );
    this.zones.push(
      new Zone(getX(6), getY(3), size, "GY", false, "deck", "p1_gy"),
    );
    this.zones.push(
      new Zone(getX(7), getY(3), size, "BANISH", false, "deck", "p1_banish"),
    );
    this.zones.push(
      new Zone(getX(0), getY(4), size, "EXTRA", false, "deck", "p1_extra"),
    );
    for (let i = 1; i <= 5; i++)
      this.zones.push(
        new Zone(getX(i), getY(4), size, "S/T" + i, false, "st", "p1_st" + i),
      );
    this.zones.push(
      new Zone(getX(6), getY(4), size, "DECK", false, "deck", "p1_deck"),
    );
  }

  draw(ctx) {
    if (this.matBounds && ctx.roundRect) {
      ctx.fillStyle = "#000000";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(
        this.matBounds.x,
        this.matBounds.y,
        this.matBounds.w,
        this.matBounds.h,
        10,
      );
      ctx.fill();
      ctx.stroke();
    }
    this.zones.forEach((zone) => zone.draw(ctx));
  }
}

class Game {
  constructor() {
    this.renderer = new GameRenderer();
    this.board = new Board();
    this.engine = new DuelEngine(this.board);

    this.selectedCard = null;
    this.menuTargetCard = null;
    this.lastHoveredCard = null; // Changed from hoveredCard so UI persists
    this.handBounds = [];
    this.particles = [];

    // DOM Elements
    this.menuEl = document.getElementById("contextMenu");
    this.btnSummon = document.getElementById("btnNormalSummon");

    // UI HUD Elements
    this.uiName = document.getElementById("info-name");
    this.uiStats = document.getElementById("info-stats");
    this.uiDesc = document.getElementById("info-desc");
    this.uiArtPlaceholder = document.getElementById("info-art-placeholder");
    this.uiP1LP = document.getElementById("p1-lp");
    this.uiP2LP = document.getElementById("p2-lp");

    window.addEventListener("resize", () => this.resize());
    this.renderer.canvas.addEventListener("click", (e) => this.onClick(e));
    this.renderer.canvas.addEventListener("contextmenu", (e) =>
      this.onRightClick(e),
    );
    this.renderer.canvas.addEventListener("mousemove", (e) =>
      this.onMouseMove(e),
    );

    document.addEventListener("click", (e) => {
      if (e.target !== this.btnSummon) this.menuEl.style.display = "none";
    });

    this.btnSummon.addEventListener("click", () => {
      if (this.menuTargetCard) {
        this.selectedCard = this.menuTargetCard;
        this.menuEl.style.display = "none";
      }
    });

    this.resize();
    requestAnimationFrame((t) => this.loop(t));
  }

  spawnImpactParticles(x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    for (let i = 0; i < 30; i++)
      this.particles.push(new Particle(centerX, centerY));
  }

  onMouseMove(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let foundCard = null;

    for (let bound of this.handBounds) {
      if (
        mouseX >= bound.x &&
        mouseX <= bound.x + bound.w &&
        mouseY >= bound.y &&
        mouseY <= bound.y + bound.h
      ) {
        foundCard = bound.card;
        break;
      }
    }
    if (!foundCard) {
      for (let zone of this.board.zones) {
        if (
          zone.card &&
          mouseX >= zone.x &&
          mouseX <= zone.x + zone.size &&
          mouseY >= zone.y &&
          mouseY <= zone.y + zone.size
        ) {
          foundCard = zone.card;
          break;
        }
      }
    }

    // --- UX UPGRADE: Update the Static Left Panel ---
    if (foundCard && foundCard !== this.lastHoveredCard) {
      this.lastHoveredCard = foundCard;

      this.uiName.innerText = foundCard.name;
      this.uiDesc.innerText = foundCard.desc;
      this.uiArtPlaceholder.innerText = foundCard.name.charAt(0);

      if (foundCard.type === "Monster") {
        this.uiStats.innerText = `[${foundCard.type}]\nLVL: ${foundCard.level}\nATK: ${foundCard.atk}\nDEF: ${foundCard.def}`;
      } else {
        this.uiStats.innerText = `[${foundCard.type}]`;
      }
    }
    // We intentionally don't clear the panel if mouse leaves a card.
    // In YGO sims, it feels much better if the last looked-at card stays visible in the panel.
  }

  onRightClick(e) {
    e.preventDefault();
    const rect = this.renderer.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (let bound of this.handBounds) {
      if (
        mouseX >= bound.x &&
        mouseX <= bound.x + bound.w &&
        mouseY >= bound.y &&
        mouseY <= bound.y + bound.h
      ) {
        this.menuTargetCard = bound.card;
        this.menuEl.style.left = `${e.clientX}px`;
        this.menuEl.style.top = `${e.clientY}px`;
        this.menuEl.style.display = "block";
        return;
      }
    }
    this.menuEl.style.display = "none";
  }

  onClick(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.selectedCard) {
      for (let zone of this.board.zones) {
        if (zone.id && zone.id.startsWith("p1_m")) {
          if (
            mouseX >= zone.x &&
            mouseX <= zone.x + zone.size &&
            mouseY >= zone.y &&
            mouseY <= zone.y + zone.size
          ) {
            const success = this.engine.normalSummon(
              this.engine.p1,
              this.selectedCard,
              zone.id,
            );
            if (success) {
              this.renderer.triggerImpact(25, 0.9);
              this.spawnImpactParticles(zone.x, zone.y, zone.size);
              this.selectedCard = null;
            }
            return;
          }
        }
      }
      this.selectedCard = null;
    }
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);
    this.board.recalculateLayout(width, height);
  }

  drawHand() {
    const hand = this.engine.p1.hand;
    if (hand.length === 0) return;

    const cardSize = this.board.zones[0].size;
    const spacing = 10;
    const totalWidth = hand.length * cardSize + (hand.length - 1) * spacing;

    // Shift Hand Math to account for the UI Panel
    const availableWidth = this.renderer.canvas.width - this.board.uiOffset;
    const startX = this.board.uiOffset + (availableWidth - totalWidth) / 2;
    const y = this.renderer.canvas.height - cardSize - 20;

    this.handBounds = [];

    hand.forEach((card, index) => {
      const x = startX + index * (cardSize + spacing);
      let targetY = y;

      if (card === this.selectedCard) targetY = y - 40;
      else if (card === this.lastHoveredCard) targetY = y - 10; // Use lastHoveredCard so the focus sticks slightly

      card.draw(this.renderer.ctx, x, targetY, cardSize);
      this.handBounds.push({
        card: card,
        x: x,
        y: targetY,
        w: cardSize,
        h: cardSize,
      });
    });
  }

  loop(time) {
    // --- HUD DATA BINDING ---
    // Actively pull the data from the Engine so the UI is always accurate
    this.uiP1LP.innerText = `LP: ${this.engine.p1.lp}`;
    this.uiP2LP.innerText = `LP: ${this.engine.p2.lp}`;

    this.renderer.beginFrame(time);

    this.board.draw(this.renderer.ctx);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      p.draw(this.renderer.ctx);
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.drawHand();

    this.renderer.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.onload = () => {
  const game = new Game();
  const description =
    "An unworthy dragon with three sharp horns sprouting from its head.";

  // Notice the "8" passed in to initialize the Level!
  for (let i = 0; i < 3; i++) {
    const triHorned = new Card(
      "39111158",
      "Tri-Horned Dragon",
      "Monster",
      2850,
      2350,
      description,
      8,
    );
    game.engine.addCardToHand(game.engine.p1, triHorned);
  }
};
