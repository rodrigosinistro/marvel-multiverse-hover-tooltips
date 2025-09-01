// Marvel Multiverse – Hover Tooltips
// Foundry VTT v13 compatible

const MODULE_ID = "marvel-multiverse-hover-tooltips";
const MODULE_VER = "1.0.3";
const DEFAULT_SYSTEM_ID = "marvel-multiverse";

const SETTINGS = {
  ENABLED: "enabled",
  SYSTEM_ID: "systemId",
  TYPES: "types"
};

const DEFAULT_TYPES = {
  power: true,
  trait: true,
  tag: true,
  occupation: true,
  origin: true,
  item: true
};

Hooks.once("init", function() {
  game.settings.register(MODULE_ID, SETTINGS.ENABLED, {
    name: game.i18n.localize("MMHT.Settings.Enable"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.SYSTEM_ID, {
    name: game.i18n.localize("MMHT.Settings.SystemId"),
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_SYSTEM_ID
  });

  game.settings.register(MODULE_ID, SETTINGS.TYPES, {
    name: game.i18n.localize("MMHT.Settings.Types"),
    scope: "world",
    config: true,
    type: Object,
    default: DEFAULT_TYPES,
    onChange: v => { MMHT._types = v; }
  });
});

Hooks.once("ready", async function() {
  console.log(`[MMHT] v${MODULE_VER} ready`);
  MMHT.init();
});

const MMHT = {
  _cleanParagraphs(html) { return String(html).replace(/<\/?p>/g, '').trim(); },

  _tooltipEl: null,
  _moveHandler: null,
  _types: null,

  init() {
    const enabled = game.settings.get(MODULE_ID, SETTINGS.ENABLED);
    if (!enabled) return;

    this._types = foundry.utils.duplicate(game.settings.get(MODULE_ID, SETTINGS.TYPES) || DEFAULT_TYPES);

    const targetSystemId = game.settings.get(MODULE_ID, SETTINGS.SYSTEM_ID) || DEFAULT_SYSTEM_ID;
    if (game.system.id !== targetSystemId) {
      console.warn(`[${MODULE_ID}] System id mismatch. Current: ${game.system.id} / Target: ${targetSystemId}. Tooltips inactive.`);
      return;
    }

    this._createTooltip();
    this._bindGlobal();
    Hooks.on("renderActorSheet", (app, html, data) => this._bindActorSheet(app, html, data));
    Hooks.on("renderItemDirectory", (app, html, data) => this._bindItemDirectory(app, html));
    Hooks.on("renderCompendium", (app, html) => this._bindCompendium(app, html));
  },

  _createTooltip() {
    if (this._tooltipEl) return;
    const el = document.createElement("div");
    el.className = "mmht-tooltip mmht-hidden";
    el.dataset.mmhtVersion = MODULE_VER;
    el.style.position = "fixed";
    el.style.bottom = "auto";
    el.style.right = "auto";
    el.style.pointerEvents = "none";
    el.style.zIndex = 10000;
    document.body.appendChild(el);
    this._tooltipEl = el;
  },

  _bindGlobal() {
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") this._hide();
    });
  },

  _bindActorSheet(app, html) {
    const $el = html instanceof jQuery ? html : $(html);

    $el.on("mouseenter", "li.item[data-item-id], .item[data-item-id]", async (ev) => {
      const li = ev.currentTarget;
      const itemId = li.dataset.itemId;
      if (!itemId) return;
      const item = app.actor?.items?.get(itemId);
      if (!item) return;
      await this._showForItem(ev, item);
    });

    $el.on("mouseleave", "li.item[data-item-id], .item[data-item-id]", () => this._hide());
  },

  _bindItemDirectory(app, html) {
    const $el = html instanceof jQuery ? html : $(html);
    $el.on("mouseenter", 'li.document[data-document-id][data-document-type="Item"]', async (ev) => {
      const itemId = ev.currentTarget.dataset.documentId;
      const item = game.items?.get(itemId);
      if (!item) return;
      await this._showForItem(ev, item);
    });
    $el.on("mouseleave", 'li.document[data-document-id][data-document-type="Item"]', () => this._hide());
  },

  _bindCompendium(app, html) {
    if (app.collection?.documentName !== "Item") return;
    const $el = html instanceof jQuery ? html : $(html);
    $el.on("mouseenter", "li.directory-item.document[data-document-id]", async (ev) => {
      const docId = ev.currentTarget.dataset.documentId;
      if (!docId) return;
      const item = await app.collection?.getDocument(docId);
      if (!item) return;
      await this._showForItem(ev, item);
    });
    $el.on("mouseleave", "li.directory-item.document[data-document-id]", () => this._hide());
  },

  async _showForItem(ev, item) {
    const type = String(item.type || "").toLowerCase();
    const allowed =
      (type === "power" && this._types.power) ||
      (type === "trait" && this._types.trait) ||
      (type === "tag" && this._types.tag) ||
      (type === "occupation" && this._types.occupation) ||
      (type === "origin" && this._types.origin) ||
      (this._types.item);

    if (!allowed) return;

    const html = await this._buildTooltipHTML(item);
    if (!html) return;

    this._tooltipEl.innerHTML = html;
    this._tooltipEl.classList.remove("mmht-hidden");

    const move = (e) => {
      // ALWAYS above-right of cursor, with viewport clamping (no flipping)
      const rect = this._tooltipEl.getBoundingClientRect();
      let x = e.clientX + 12;
      let y = e.clientY - rect.height - 12;

      const maxX = window.innerWidth - rect.width - 8;
      if (x > maxX) x = maxX;
      if (x < 8) x = 8;
      if (y < 8) y = 8;

      this._tooltipEl.style.left = x + "px";
      this._tooltipEl.style.top = y + "px";
      this._tooltipEl.style.bottom = "auto";
      this._tooltipEl.style.right = "auto";
    };
    this._moveHandler = move;
    document.addEventListener("mousemove", move);
    move(ev); // initial position
  },

  _hide() {
    if (!this._tooltipEl) return;
    this._tooltipEl.classList.add("mmht-hidden");
    this._tooltipEl.innerHTML = "";
    if (this._moveHandler) {
      document.removeEventListener("mousemove", this._moveHandler);
      this._moveHandler = null;
    }
  },

  _label(key) {
    try {
      const localized = game.i18n?.localize?.(key);
      if (localized && localized !== key) return localized;
    } catch (e) {}
    const last = (key?.split?.(".")?.pop?.() ?? key ?? "").toString();
    return last.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
  },

  async _buildTooltipHTML(item) {
    const sys = item.system ?? {};
    const type = String(item.type || "").toLowerCase();

    const get = (paths, fallback = "") => {
      for (const p of paths) {
        const v = foundry.utils.getProperty(sys, p);
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
      return fallback;
    };

    const description = get(["description", "details.description", "system.description", "desc"]);
    const range = get(["range", "details.range"]);
    const action = get(["action", "details.action"]);
    const trigger = get(["trigger", "details.trigger"]);
    const duration = get(["duration", "details.duration"]);
    const cost = get(["cost", "details.cost"]);
    const effect = get(["effect", "details.effect", "effectsText"]);

    const title = foundry.utils.escapeHTML(item.name ?? "—");

    let rows = [];
    if (type === "power") {
      const blocks = [
        ["MMHT.Tooltip.Description", description, true],
        ["MMHT.Tooltip.Action", action],
        ["MMHT.Tooltip.Trigger", trigger],
        ["MMHT.Tooltip.Duration", duration],
        ["MMHT.Tooltip.Cost", cost],
        ["MMHT.Tooltip.Effect", effect, true],
        ["MMHT.Tooltip.Range", range]
      ];
      for (const [labelKey, value, rich] of blocks) {
        if (!value) continue;
        const label = MMHT._label(labelKey);
        const content = rich ? MMHT._cleanParagraphs(await TextEditor.enrichHTML(String(value), { async: true })) : foundry.utils.escapeHTML(String(value));
        rows.push(`<div class="mmht-row"><div class="mmht-label">${label}</div><div class="mmht-desc">${content}</div></div>`);
      }
    } else {
      if (description) {
        const descHTML = await TextEditor.enrichHTML(String(description), { async: true });
        rows.push(`<div class="mmht-row"><div class="mmht-label">${MMHT._label("MMHT.Tooltip.Description")}</div><div class="mmht-desc">${descHTML}</div></div>`);
      }
      if (range) {
        rows.push(`<div class="mmht-row"><div class="mmht-label">${MMHT._label("MMHT.Tooltip.Range")}</div><div class="mmht-desc">${foundry.utils.escapeHTML(String(range))}</div></div>`);
      }
    }
    if (!rows.length) return "";
    return `<h3>${title}</h3>${rows.join("")}`;
  }
};
