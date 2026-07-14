const SUPABASE_CONFIG = { url: "https://idzleetkaubrpdlretoq.supabase.co", anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkemxlZXRrYXVicnBkbHJldG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTI2NTMsImV4cCI6MjA5OTUyODY1M30.zWF4bPsuKBPUrJn-vjtHajEx3EV8TraaG2FIfPQJzt0" };

const App = (() => {
  const REQUEST_LABELS = {
    waiter: "Llamar mesero",
    bill: "Pedir la cuenta",
    other: "Necesito ayuda"
  };

  const REQUEST_ICONS = {
    waiter: "bell-ring",
    bill: "receipt-text",
    other: "message-circle-question"
  };

  const DEFAULT_CURRENCY = "COP";
  const ASSISTANT_MENU = [
    { name: "Camarón Tradicional", prices: { 8: 24000, 12: 26000, 16: 31000 }, detail: "Camarón, cebolla, ajo, aceite de oliva, salsa de tomate, mayonesa, syrup, limón y cilantro." },
    { name: "Camarón Crema de Maíz", prices: { 8: 24000, 12: 27000, 16: 31000 }, detail: "Camarón, cebolla, ajo, crema de maíz, granos de maíz tiernos, syrup, limón y cilantro." },
    { name: "Camarón Crema de Aguacate", prices: { 8: 24000, 12: 27000, 16: 31000 }, detail: "Camarón, cebolla, ajo, mayonesa, crema de aguacate, syrup y limón." },
    { name: "Salsa Chipotle", prices: { 8: 24000, 12: 27000, 16: 31000 }, detail: "Camarón, cebolla, granos de maíz, limón, cilantro y salsa chipotle." },
    { name: "Flor de Jamaica", prices: { 8: 26000, 12: 28000, 16: 34000 }, detail: "Camarón, pepino, cebolla, granos de maíz, limón, cilantro, aguacate, salsa jamaica y salsa inglesa." },
    { name: "Mixto Tradicional", prices: { 8: 26000, 12: 29000, 16: 34000 }, detail: "Camarón, caracol, palmitos, pulpo, cebolla, ajo, salsa de tomate, mayonesa, syrup, limón y cilantro." },
    { name: "Camarón Hawái", prices: { 8: 24000, 12: 27000, 16: 31000 }, detail: "Camarón, mango, cebolla roja, ajo, salsa de tomate, mayonesa, trozos de aguacate, syrup, limón y cilantro." },
    { name: "Camarón al Pastor", prices: { 8: 24000, 12: 27000, 16: 31000 }, detail: "Camarón, pimiento, cebolla roja, tomate, aguacate, syrup, limón y cilantro." },
    { name: "Mixto Chipotle", prices: { 8: 26000, 12: 29000, 16: 34000 }, detail: "Camarón, caracol, palmitos, pulpo, cebolla, ajo, salsa chipotle, syrup, limón y cilantro." },
    { name: "Mixto Crema de Maíz", prices: { 8: 27000, 12: 30000, 16: 34000 }, detail: "Camarón, caracol, palmitos, pulpo, cebolla, ajo, crema de maíz, syrup, limón y cilantro." },
    { name: "Mixto Crema de Aguacate", prices: { 8: 27000, 12: 30000, 16: 34000 }, detail: "Camarón, caracol, palmitos, pulpo, cebolla, ajo, crema de aguacate, syrup, limón y cilantro." },
    { name: "Camarón al Ajillo", prices: { 16: 34000 }, detail: "Camarón, cebolla, ajo, vino blanco, salsa inglesa, reducción de salsa de la casa y patacones." },
    { name: "Trío Pacarón", prices: { 16: 29000 }, detail: "Plátano criollo, queso costeño, suero y acompañamiento de rellenos de camarón." },
    { name: "Dúo Mix", prices: { 8: 27000, 12: 30000, 16: 34000 }, detail: "Camarón, pulpo, cebolla, ajo, salsa de tomate, mayonesa, syrup, limón y cilantro." },
    { name: "Bomba Tradicional", prices: { 8: 27000, 12: 30000, 16: 34000 }, detail: "Camarón, caracol, palmitos, pulpo, ropa ahumada, cebolla, ajo, salsa de tomate, mayonesa y syrup." }
  ];
  const state = {
    sb: null,
    page: "",
    business: null,
    tables: [],
    categories: [],
    items: [],
    activeCategory: "all",
    currentTable: null,
    currentSession: null,
    sessionItems: [],
    clientRequests: [],
    requests: [],
    sessions: [],
    soundEnabled: false,
    lastAlertSignature: "",
    alertRenderSignature: null,
    alarmTimer: null,
    alarmStopTimer: null,
    adminPollTimer: null,
    activeAdminSection: "dashboard",
    qrCache: new Map(),
    tableRenderSignature: "",
    assistantMessages: [],
    tableLocked: false,
    clientChannel: null,
    subscriptions: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const icon = (name, size = 18) => `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;

  const money = (value, currency = state.business?.currency || DEFAULT_CURRENCY) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  const toast = (message, type = "ok") => {
    let box = $(".system-modal-stack");
    if (!box) {
      box = document.createElement("div");
      box.className = "system-modal-stack";
      document.body.appendChild(box);
    }
    const item = document.createElement("div");
    item.className = `system-modal ${type}`;
    const iconName = type === "error" ? "circle-alert" : "badge-check";
    item.innerHTML = `
      <div class="system-modal-icon">${icon(iconName, 24)}</div>
      <div>
        <strong>${type === "error" ? "Atencion" : "Listo"}</strong>
        <p>${message}</p>
      </div>
    `;
    box.appendChild(item);
    refreshIcons();
    setTimeout(() => {
      item.classList.add("leaving");
      setTimeout(() => item.remove(), 220);
    }, type === "error" ? 5600 : 3600);
  };

  const isConfigured = () =>
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.anonKey &&
    !SUPABASE_CONFIG.url.includes("TU_") &&
    !SUPABASE_CONFIG.anonKey.includes("TU_");

  const uid = () =>
    crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const refreshIcons = () => {
    if (window.lucide) window.lucide.createIcons();
  };

  const setLoading = (isLoading) => {
    document.body.classList.toggle("is-loading", isLoading);
  };

  const connect = () => {
    if (!isConfigured()) return false;
    if (!window.supabase) {
      toast("No se cargo Supabase CDN. Revisa tu conexion.", "error");
      return false;
    }
    state.sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return true;
  };

  const db = async (builder, fallback = null) => {
    try {
      const { data, error } = await builder;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(error);
      toast(error.message || "Error de Supabase", "error");
      return fallback;
    }
  };

  const loadBusiness = async () => {
    const data = await db(
      state.sb.from("business_settings").select("*").eq("is_primary", true).maybeSingle(),
      null
    );
    state.business = data || {
      business_name: "Tu restaurante",
      subtitle: "Servicio a la mesa rapido y claro",
      accent_color: "#f05a28",
      currency: DEFAULT_CURRENCY
    };
    document.documentElement.style.setProperty("--accent", state.business.accent_color || "#f05a28");
  };

  const loadCore = async () => {
    const [tables, categories, items] = await Promise.all([
      db(state.sb.from("restaurant_tables").select("*").order("table_number", { ascending: true }), []),
      db(state.sb.from("menu_categories").select("*").order("sort_order", { ascending: true }), []),
      db(
        state.sb
          .from("menu_items")
          .select("*, menu_categories(name)")
          .order("sort_order", { ascending: true }),
        []
      )
    ]);
    state.tables = tables || [];
    state.categories = categories || [];
    state.items = items || [];
  };

  const emptyState = (title, text, iconName = "sparkles") => `
    <div class="empty-state">
      ${icon(iconName, 26)}
      <strong>${title}</strong>
      <span>${text}</span>
    </div>
  `;

  const tableLabel = (table) => table?.table_name || `Mesa ${table?.table_number || ""}`.trim();

  const tableCode = (table) => table?.qr_code || `mesa-${table?.table_number || ""}`;

  const clientUrlForCode = (code) => {
    const url = new URL("index.html", location.href);
    url.searchParams.set("mesa", code);
    return url.href;
  };

  const qrTextForTable = (table) => clientUrlForCode(tableCode(table));

  const generateQrDataUrl = (text, size = 720) =>
    new Promise((resolve, reject) => {
      if (!window.QRCode) {
        reject(new Error("No se cargo el generador de QR."));
        return;
      }
      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-9999px";
      host.style.top = "0";
      document.body.appendChild(host);
      new window.QRCode(host, {
        text,
        width: size,
        height: size,
        colorDark: "#14171d",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H
      });
      window.setTimeout(() => {
        const canvas = host.querySelector("canvas");
        const image = host.querySelector("img");
        const dataUrl = canvas?.toDataURL("image/png") || image?.src;
        host.remove();
        dataUrl ? resolve(dataUrl) : reject(new Error("No se pudo generar el QR."));
      }, 40);
    });

  const cachedQrDataUrl = async (text, size = 720) => {
    const key = `${size}:${text}`;
    if (!state.qrCache.has(key)) {
      state.qrCache.set(key, generateQrDataUrl(text, size));
    }
    return state.qrCache.get(key);
  };

  const renderQrImage = async (target, text, alt = "QR") => {
    if (!target || !text) return;
    if (target.dataset.qrText === text && target.querySelector("img")) return;
    target.dataset.qrText = text;
    target.classList.add("qr-loading");
    try {
      const dataUrl = await cachedQrDataUrl(text, 420);
      target.innerHTML = `<img src="${dataUrl}" alt="${alt}">`;
    } catch (error) {
      target.innerHTML = `${icon("qr-code", 20)}`;
    } finally {
      target.classList.remove("qr-loading");
      refreshIcons();
    }
  };

  const setRealtimeStatus = (status, tone = "connecting") => {
    const badge = $("#realtimeStatus");
    if (!badge) return;
    badge.className = `live-status ${tone}`;
    badge.innerHTML = `${icon(tone === "live" ? "wifi" : "wifi-off", 15)} ${status}`;
    refreshIcons();
  };

  const showAdminSection = (section = "dashboard") => {
    state.activeAdminSection = section;
    $$("[data-admin-section]").forEach((el) => {
      el.classList.toggle("section-active", el.dataset.adminSection === section);
    });
    $$(".admin-sidebar nav a").forEach((link) => {
      const target = link.getAttribute("href")?.replace("#", "");
      link.classList.toggle("active", target === section);
    });
    refreshIcons();
  };

  const findTableFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("mesa") || params.get("table") || params.get("t") || params.get("qr");
    if (!raw) return null;
    const table = state.tables.find(
      (table) =>
        String(table.table_number) === String(raw) ||
        String(table.qr_code).toLowerCase() === String(raw).toLowerCase() ||
        String(table.id) === String(raw)
    );
    state.tableLocked = Boolean(table);
    return table;
  };

  const ensureOpenSession = async (tableId) => {
    let session = await db(
      state.sb
        .from("table_sessions")
        .select("*")
        .eq("table_id", tableId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      null
    );
    if (!session) {
      session = await db(
        state.sb.from("table_sessions").insert({ table_id: tableId, status: "open" }).select("*").single(),
        null
      );
    }
    state.currentSession = session;
    return session;
  };

  const loadClientSessionItems = async () => {
    if (!state.currentSession) return;
    state.sessionItems = await db(
      state.sb
        .from("session_items")
        .select("*")
        .eq("session_id", state.currentSession.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false }),
      []
    );
  };

  const loadClientRequests = async () => {
    if (!state.currentSession) {
      state.clientRequests = [];
      return;
    }
    state.clientRequests = await db(
      state.sb
        .from("service_requests")
        .select("*")
        .eq("session_id", state.currentSession.id)
        .order("created_at", { ascending: false }),
      []
    );
  };

  const renderBrand = () => {
    const logo = state.business?.logo_url
      ? `<img src="${state.business.logo_url}" alt="${state.business.business_name}" class="brand-logo">`
      : `<div class="brand-mark">${icon("utensils", 24)}</div>`;
    $$(".js-business-name").forEach((el) => {
      el.textContent = state.business?.business_name || "Tu restaurante";
    });
    $$(".js-business-subtitle").forEach((el) => {
      el.textContent = state.business?.subtitle || "Servicio a la mesa rapido y claro";
    });
    $$(".js-brand-logo").forEach((el) => {
      el.innerHTML = logo;
    });
    const cover = $(".client-hero");
    if (cover && state.business?.cover_url) {
      cover.style.backgroundImage = `linear-gradient(180deg, rgba(12,13,17,.40), rgba(12,13,17,.88)), url('${state.business.cover_url}')`;
    }
  };

  const renderTablePicker = () => {
    const picker = $("#tablePicker");
    if (!picker) return;
    if (state.currentTable) {
      picker.innerHTML = `
        <span>${icon("map-pin", 16)} ${tableLabel(state.currentTable)}</span>
        ${
          state.tableLocked
            ? `<strong class="locked-table-badge">${icon("lock-keyhole", 14)} QR verificado</strong>`
            : `<button class="ghost small" data-action="change-table">${icon("refresh-cw", 15)} Cambiar</button>`
        }
      `;
      return;
    }
    picker.innerHTML = `
      <label for="tableSelect">Selecciona tu mesa</label>
      <select id="tableSelect">
        <option value="">Mesa</option>
        ${state.tables
          .filter((table) => table.is_active)
          .map((table) => `<option value="${table.id}">${tableLabel(table)}</option>`)
          .join("")}
      </select>
    `;
  };

  const filteredItems = () =>
    state.items.filter(
      (item) =>
        item.is_available &&
        (state.activeCategory === "all" || item.category_id === state.activeCategory)
    );

  const renderMenu = () => {
    const tabs = $("#categoryTabs");
    const menu = $("#menuList");
    if (!tabs || !menu) return;

    tabs.innerHTML = `
      <button class="chip ${state.activeCategory === "all" ? "active" : ""}" data-category="all">
        ${icon("layout-grid", 16)} Todo
      </button>
      ${state.categories
        .filter((category) => category.is_active)
        .map(
          (category) => `
            <button class="chip ${state.activeCategory === category.id ? "active" : ""}" data-category="${category.id}">
              ${icon("tag", 16)} ${category.name}
            </button>
          `
        )
        .join("")}
    `;

    const items = filteredItems();
    menu.innerHTML = items.length
      ? items
          .map(
            (item) => `
              <article class="menu-item">
                <div class="food-image">
                  ${
                    item.image_url
                      ? `<img src="${item.image_url}" alt="${item.name}">`
                      : icon("chef-hat", 26)
                  }
                </div>
                <div class="menu-copy">
                  <div>
                    <span class="category-name">${item.menu_categories?.name || "Menu"}</span>
                    <h3>${item.name}</h3>
                    <p>${item.description || "Preparado por la casa."}</p>
                  </div>
                  <div class="menu-actions">
                    <strong>${money(item.price)}</strong>
                    <button class="icon-btn" data-add-item="${item.id}" aria-label="Agregar ${item.name}">
                      ${icon("plus", 18)}
                    </button>
                  </div>
                </div>
              </article>
            `
          )
          .join("")
      : emptyState("Menu en preparacion", "Agrega productos desde el administrador.", "book-open");
    refreshIcons();
  };

  const renderAccount = () => {
    const box = $("#clientAccount");
    if (!box) return;
    const subtotal = state.sessionItems.reduce(
      (sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
      0
    );
    box.innerHTML = state.sessionItems.length
      ? `
        <div class="account-head">
          <span>${icon("receipt", 18)} Cuenta actual</span>
          <strong>${money(subtotal)}</strong>
        </div>
        <div class="account-list">
          ${state.sessionItems
            .map(
              (item) => `
                <div class="account-row">
                  <span>${item.quantity}x ${item.item_name}</span>
                  <strong>${money(Number(item.unit_price) * Number(item.quantity))}</strong>
                </div>
              `
            )
            .join("")}
        </div>
      `
      : emptyState("Sin consumos", "Agrega platos o llama al mesero para ordenar.", "shopping-bag");
    refreshIcons();
  };

  const receiptItemsForSession = (session) =>
    (session?.session_items || [])
      .filter((item) => item.status !== "cancelled")
      .map((item) => ({
        name: item.item_name,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        total: Number(item.unit_price || 0) * Number(item.quantity || 0)
      }));

  const buildBillMessage = (session) => {
    const items = receiptItemsForSession(session);
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    return JSON.stringify({
      kind: "bill_receipt",
      sent_at: new Date().toISOString(),
      business_name: state.business?.business_name || "Tu restaurante",
      table: tableLabel(session?.restaurant_tables),
      currency: state.business?.currency || DEFAULT_CURRENCY,
      items,
      subtotal,
      total: subtotal
    });
  };

  const parseBillMessage = (message) => {
    try {
      const parsed = JSON.parse(message || "{}");
      if (parsed.kind === "bill_receipt") return parsed;
    } catch (error) {
      return null;
    }
    return null;
  };

  const latestClientBill = () =>
    state.clientRequests.find(
      (request) =>
        request.request_type === "bill" &&
        ["acknowledged", "resolved"].includes(request.status) &&
        parseBillMessage(request.message)
    );

  const renderBillChat = () => {
    const box = $("#billChat");
    if (!box) return;
    const request = latestClientBill();
    const bill = parseBillMessage(request?.message);
    if (!request || !bill) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = `
      <div class="chat-thread">
        <div class="chat-bubble staff">
          <span>${icon("receipt-text", 16)} Cuenta enviada</span>
          <strong>${bill.business_name}</strong>
          <div class="receipt-lines">
            ${(bill.items || [])
              .map(
                (item) => `
                  <div>
                    <span>${item.quantity}x ${item.name}</span>
                    <strong>${money(item.total, bill.currency)}</strong>
                  </div>
                `
              )
              .join("") || "<small>Sin consumos registrados</small>"}
          </div>
          <div class="receipt-total">
            <span>Total</span>
            <strong>${money(bill.total, bill.currency)}</strong>
          </div>
        </div>
        ${
          request.status === "resolved"
            ? `<div class="chat-bubble guest thanks">Gracias</div>`
            : `<button class="primary thank-btn" data-thank-bill="${request.id}">${icon("send", 16)} Gracias</button>`
        }
      </div>
    `;
    refreshIcons();
  };

  const normalizeText = (text = "") =>
    String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const sentenceCase = (text = "") => {
    const clean = String(text).trim().replace(/\s+/g, " ");
    if (!clean) return "";
    const sentence = clean.charAt(0).toUpperCase() + clean.slice(1);
    return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  };

  const assistantOptions = () => [
    ...ASSISTANT_MENU,
    ...state.items
      .filter((item) => item.is_available)
      .map((item) => ({
        name: item.name,
        prices: { default: Number(item.price || 0) },
        detail: item.description || "Producto del menu del restaurante.",
        menu_item_id: item.id
      }))
  ];

  const findAssistantItem = (message) => {
    const normalized = normalizeText(message).replace(/\bhawaiano\b/g, "hawai");
    let best = null;
    assistantOptions().forEach((item) => {
      const words = normalizeText(item.name).split(" ").filter((word) => word.length > 2);
      const score = words.reduce((sum, word) => sum + (normalized.includes(word) ? 1 : 0), 0) / Math.max(words.length, 1);
      if (score >= .55 && (!best || score > best.score)) best = { item, score };
    });
    return best?.item || null;
  };

  const parseAssistantOrder = (message) => {
    const item = findAssistantItem(message);
    if (!item) return null;
    const normalized = normalizeText(message);
    const quantityMatch = normalized.match(/\b(\d+)\s*x\b|\b(\d+)\s+(?:unidades|ordenes|platos)\b/);
    const sizeMatch = normalized.match(/\b(8|12|16)\s*(?:oz|onzas|onza)?\b/);
    const sizes = Object.keys(item.prices);
    const size = sizeMatch?.[1] && item.prices[sizeMatch[1]]
      ? sizeMatch[1]
      : sizes.includes("12")
        ? "12"
        : sizes[0];
    const quantity = Math.max(1, Number(quantityMatch?.[1] || quantityMatch?.[2] || 1));
    const price = Number(item.prices[size] || item.prices.default || 0);
    return { item, size, quantity, price };
  };

  const assistantSay = (role, text) => {
    state.assistantMessages.push({ role, text });
    state.assistantMessages = state.assistantMessages.slice(-10);
    renderAssistant();
  };

  const renderAssistant = () => {
    const chat = $("#assistantChat");
    const suggestions = $("#assistantSuggestions");
    if (!chat || !suggestions) return;
    const messages = state.assistantMessages.length
      ? state.assistantMessages
      : [{ role: "bot", text: "Hola. Puedo ayudarte a ordenar camarones, pedir la cuenta o llamar al mesero. Escribe algo como: Camaron Hawai de 12 onzas." }];
    chat.innerHTML = messages
      .map((message) => `<div class="assistant-message ${message.role}">${message.text}</div>`)
      .join("");
    chat.scrollTop = chat.scrollHeight;
    suggestions.innerHTML = ["Camaron Hawai 12 onzas", "Mixto Chipotle 16 onzas", "Quiero pedir la cuenta"]
      .map((text) => `<button type="button" class="chip" data-assistant-suggest="${text}">${text}</button>`)
      .join("");
    refreshIcons();
  };

  const createServiceNotification = async (type, message) => {
    if (!state.currentTable) return null;
    const session = await ensureOpenSession(state.currentTable.id);
    return db(
      state.sb
        .from("service_requests")
        .insert({
          table_id: state.currentTable.id,
          session_id: session?.id || null,
          request_type: type,
          message
        })
        .select("*")
        .single(),
      null
    );
  };

  const addAssistantOrder = async (order, originalMessage) => {
    if (!state.currentTable) {
      assistantSay("bot", "Primero selecciona tu mesa para poder enviar el pedido correctamente.");
      return;
    }
    const session = await ensureOpenSession(state.currentTable.id);
    if (!session) return;
    const itemName = `${order.item.name}${order.size !== "default" ? ` ${order.size} onzas` : ""}`;
    const payload = {
      session_id: session.id,
      table_id: state.currentTable.id,
      menu_item_id: order.item.menu_item_id || null,
      item_name: itemName,
      quantity: order.quantity,
      unit_price: order.price,
      notes: originalMessage,
      status: "pending"
    };
    const saved = await db(state.sb.from("session_items").insert(payload).select("*").single(), null);
    if (!saved) return;
    const total = order.quantity * order.price;
    await createServiceNotification(
      "other",
      `${tableLabel(state.currentTable)} solicitó ${order.quantity} x ${itemName}. Total: ${money(total)}.`
    );
    await loadClientSessionItems();
    renderAccount();
    assistantSay("bot", `Perfecto, agregué ${order.quantity} x ${itemName} por ${money(total)}. Ya avisamos al equipo.`);
  };

  const handleAssistantMessage = async (message) => {
    const text = message.trim();
    if (!text) return;
    assistantSay("user", text);
    const normalized = normalizeText(text);
    if (normalized.includes("menu") || normalized.includes("opciones")) {
      assistantSay("bot", `Tenemos opciones como ${ASSISTANT_MENU.slice(0, 5).map((item) => item.name).join(", ")}. Puedes pedir por nombre y onzas.`);
      return;
    }
    if (!state.currentTable) {
      assistantSay("bot", "Primero selecciona tu mesa arriba para poder enviar pedidos o avisos correctamente.");
      return;
    }
    if (normalized.includes("cuenta")) {
      await createRequest("bill");
      assistantSay("bot", "Listo, pedí la cuenta para tu mesa. Cuando el equipo la envíe, aparecerá aquí como recibo.");
      return;
    }
    if (normalized.includes("mesero") || normalized.includes("atender")) {
      await createRequest("waiter");
      assistantSay("bot", "Ya llamamos al mesero. Te atenderán en breve.");
      return;
    }
    const order = parseAssistantOrder(text);
    if (order) {
      await addAssistantOrder(order, text);
      return;
    }
    await createServiceNotification("other", `${tableLabel(state.currentTable)} solicitó: ${sentenceCase(text)}`);
    assistantSay("bot", "No lo encontré con precio exacto en el menú, pero ya envié tu solicitud al equipo para confirmarla.");
  };

  const addItemToSession = async (itemId) => {
    if (!state.currentTable) {
      toast("Selecciona tu mesa primero.", "error");
      return;
    }
    const session = await ensureOpenSession(state.currentTable.id);
    if (!session) return;
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    const payload = {
      session_id: session.id,
      table_id: state.currentTable.id,
      menu_item_id: item.id,
      item_name: item.name,
      quantity: 1,
      unit_price: item.price,
      status: "pending"
    };
    const saved = await db(state.sb.from("session_items").insert(payload).select("*").single(), null);
    if (saved) {
      toast(`${item.name} agregado a la cuenta.`);
      await loadClientSessionItems();
      renderAccount();
    }
  };

  const createRequest = async (type, message = "") => {
    if (!state.currentTable) {
      toast("Selecciona tu mesa primero.", "error");
      return;
    }
    const session = await ensureOpenSession(state.currentTable.id);
    const existing = await db(
      state.sb
        .from("service_requests")
        .select("*")
        .eq("table_id", state.currentTable.id)
        .eq("request_type", type)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle(),
      null
    );
    if (existing) {
      toast("Tu solicitud ya esta activa. El equipo la esta viendo.");
      return;
    }
    const request = await db(
      state.sb
        .from("service_requests")
        .insert({
          table_id: state.currentTable.id,
          session_id: session?.id || null,
          request_type: type,
          message
        })
        .select("*")
        .single(),
      null
    );
    if (request) {
      toast(`${REQUEST_LABELS[type]} enviado.`);
      await loadClientRequests();
      renderBillChat();
    }
  };

  const thankBill = async (id) => {
    const saved = await db(
      state.sb
        .from("service_requests")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single(),
      null
    );
    if (saved) {
      await loadClientRequests();
      renderBillChat();
      toast("Gracias. La cuenta quedo recibida.");
    }
  };

  const bindClient = () => {
    document.addEventListener("click", async (event) => {
      const category = event.target.closest("[data-category]");
      const add = event.target.closest("[data-add-item]");
      const request = event.target.closest("[data-request]");
      const thanks = event.target.closest("[data-thank-bill]");
      const change = event.target.closest("[data-action='change-table']");
      const suggestion = event.target.closest("[data-assistant-suggest]");

      if (category) {
        state.activeCategory = category.dataset.category;
        renderMenu();
      }
      if (add) await addItemToSession(add.dataset.addItem);
      if (request) await createRequest(request.dataset.request);
      if (thanks) await thankBill(thanks.dataset.thankBill);
      if (suggestion) await handleAssistantMessage(suggestion.dataset.assistantSuggest);
      if (change && !state.tableLocked) {
        state.currentTable = null;
        state.currentSession = null;
        state.sessionItems = [];
        state.clientRequests = [];
        renderTablePicker();
        renderAccount();
        renderBillChat();
      }
    });

    document.addEventListener("change", async (event) => {
      if (event.target.id === "tableSelect") {
        state.currentTable = state.tables.find((table) => table.id === event.target.value) || null;
        if (state.currentTable) {
          await ensureOpenSession(state.currentTable.id);
          await loadClientSessionItems();
          await loadClientRequests();
          subscribeClient();
        }
        renderTablePicker();
        renderAccount();
        renderBillChat();
      }
    });

    $("#assistantForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = event.currentTarget.message;
      const message = input.value;
      input.value = "";
      await handleAssistantMessage(message);
    });
  };

  const subscribeClient = () => {
    if (!state.currentSession) return;
    if (state.clientChannel) {
      state.sb.removeChannel(state.clientChannel);
      state.clientChannel = null;
    }
    const channel = state.sb
      .channel(`client-session-${state.currentSession.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_items", filter: `session_id=eq.${state.currentSession.id}` },
        async () => {
          await loadClientSessionItems();
          renderAccount();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests", filter: `session_id=eq.${state.currentSession.id}` },
        async () => {
          await loadClientRequests();
          renderBillChat();
        }
      )
      .subscribe();
    state.clientChannel = channel;
    state.subscriptions.push(channel);
  };

  const initClient = async () => {
    setLoading(true);
    await loadBusiness();
    await loadCore();
    renderBrand();
    state.currentTable = findTableFromUrl();
    if (state.currentTable) {
      await ensureOpenSession(state.currentTable.id);
      await loadClientSessionItems();
      await loadClientRequests();
    }
    renderTablePicker();
    renderMenu();
    renderAccount();
    renderBillChat();
    renderAssistant();
    bindClient();
    subscribeClient();
    setLoading(false);
  };

  const activeRequests = () => state.requests.filter((request) => request.status === "pending");

  const requestSignature = () => activeRequests().map((request) => request.id).join("|");

  const updateAlarmButton = () => {
    const button = $("#enableSound");
    if (!button) return;
    button.classList.toggle("sound-active", state.soundEnabled);
    button.classList.toggle("needs-sound", !state.soundEnabled);
    button.innerHTML = state.soundEnabled
      ? `${icon("volume-2", 18)} Alarma activa`
      : `${icon("volume-x", 18)} Activar alarma`;
    const hint = $("#soundHint");
    if (hint) {
      hint.textContent = state.soundEnabled
        ? "Listo. Las solicitudes nuevas sonaran en este equipo."
        : "Toca aqui para permitir el sonido de las alertas.";
    }
    refreshIcons();
  };

  const getAlarmAudio = () => {
    const audio = $("#alarmAudio");
    if (!audio) return null;
    audio.volume = 1;
    return audio;
  };

  const playAlarm = async () => {
    if (!state.soundEnabled || !activeRequests().length) return;
    const audio = getAlarmAudio();
    if (!audio) return;
    window.clearTimeout(state.alarmStopTimer);
    audio.loop = true;
    if (audio.paused) audio.currentTime = 0;
    await audio.play().catch(() => {
      state.soundEnabled = false;
      localStorage.removeItem("waiter_alarm_enabled");
      updateAlarmButton();
      toast("Activa el sonido tocando el boton de alarma.", "error");
    });
    state.alarmStopTimer = window.setTimeout(() => {
      audio.pause();
      audio.loop = false;
      audio.currentTime = 0;
    }, 30000);
  };

  const stopAlarm = () => {
    window.clearTimeout(state.alarmStopTimer);
    const audio = getAlarmAudio();
    if (!audio) return;
    audio.pause();
    audio.loop = false;
    audio.currentTime = 0;
  };

  const unlockAlarm = async () => {
    const audio = getAlarmAudio();
    if (!audio) {
      toast("No se encontro sound/alarm.mp3.", "error");
      return;
    }

    try {
      state.soundEnabled = true;
      localStorage.setItem("waiter_alarm_enabled", "1");
      updateAlarmButton();
      audio.currentTime = 0;
      audio.loop = false;
      await audio.play();
      toast("Alarma activada.");

      if (!activeRequests().length) {
        window.setTimeout(() => {
          if (!activeRequests().length) {
            audio.pause();
            audio.currentTime = 0;
          }
        }, 1100);
      }
    } catch (error) {
      state.soundEnabled = false;
      localStorage.removeItem("waiter_alarm_enabled");
      updateAlarmButton();
      toast("El navegador bloqueo el audio. Toca Activar alarma otra vez.", "error");
    }
  };

  const startAlarmLoop = () => {
    clearInterval(state.alarmTimer);
    state.alarmTimer = setInterval(() => {
      if (!activeRequests().length) {
        const audio = getAlarmAudio();
        if (audio) {
          audio.pause();
          audio.loop = false;
          audio.currentTime = 0;
        }
      }
    }, 12000);
  };

  const startAdminPolling = () => {
    clearInterval(state.adminPollTimer);
    state.adminPollTimer = setInterval(async () => {
      await loadAdminData();
      renderAdminLive();
    }, 4500);
  };

  const loadAdminData = async () => {
    const [requests, sessions] = await Promise.all([
      db(
        state.sb
          .from("service_requests")
          .select("*, restaurant_tables(table_number, table_name)")
          .in("status", ["pending", "acknowledged"])
          .order("created_at", { ascending: false }),
        []
      ),
      db(
        state.sb
          .from("table_sessions")
          .select("*, restaurant_tables(table_number, table_name), session_items(*)")
          .eq("status", "open")
          .order("opened_at", { ascending: false }),
        []
      )
    ]);
    state.requests = requests || [];
    state.sessions = sessions || [];
  };

  const renderAdminShell = () => {
    renderBrand();
    const totals = {
      tables: state.tables.filter((table) => table.is_active).length,
      alerts: activeRequests().length,
      open: state.sessions.length,
      sales: state.sessions.reduce((sum, session) => sum + sessionTotal(session), 0)
    };
    $("#metricTables").textContent = totals.tables;
    $("#metricAlerts").textContent = totals.alerts;
    $("#metricOpen").textContent = totals.open;
    $("#metricSales").textContent = money(totals.sales);
  };

  const sessionTotal = (session) =>
    (session.session_items || [])
      .filter((item) => item.status !== "cancelled")
      .reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);

  const tablesSignature = () =>
    JSON.stringify({
      tables: state.tables.map((table) => [
        table.id,
        table.table_number,
        table.table_name,
        table.qr_code,
        table.is_active
      ]),
      sessions: state.sessions.map((session) => [
        session.id,
        session.table_id,
        session.status,
        sessionTotal(session),
        (session.session_items || []).length
      ]),
      requests: activeRequests().map((request) => [request.id, request.table_id, request.request_type, request.status])
    });

  const renderAlerts = () => {
    const box = $("#alertsPanel");
    if (!box) return;
    const alerts = activeRequests();
    const renderSignature = alerts.map((request) => `${request.id}:${request.status}:${request.message || ""}`).join("|");
    box.classList.toggle("has-alerts", alerts.length > 0);
    const alertCards = alerts
      .map(
        (request) => `
              <article class="alert-card alert-${request.request_type}" data-alert-card="${request.id}">
                <div class="alert-icon">${icon(REQUEST_ICONS[request.request_type] || "bell", 22)}</div>
                <div>
                  <span>${REQUEST_LABELS[request.request_type] || request.request_type}</span>
                  <h3>${tableLabel(request.restaurant_tables)}</h3>
                  ${request.message && !parseBillMessage(request.message) ? `<p>${request.message}</p>` : ""}
                  <p>${new Date(request.created_at).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}</p>
                </div>
                ${
                  request.request_type === "bill"
                    ? `<button class="primary" data-send-bill="${request.id}">${icon("send", 17)} Enviar cuenta</button>`
                    : `<button class="primary" data-accept-request="${request.id}">${icon("check", 17)} Aceptar</button>`
                }
              </article>
            `
      )
      .join("");

    let floating = $("#floatingAlerts");
    if (!floating) {
      floating = document.createElement("div");
      floating.id = "floatingAlerts";
      floating.className = "call-modal-layer";
      document.body.appendChild(floating);
    }
    if (renderSignature !== state.alertRenderSignature) {
      state.alertRenderSignature = renderSignature;
      box.innerHTML = alerts.length
        ? alertCards
        : emptyState("Sin llamados activos", "Cuando una mesa solicite ayuda aparecera aqui.", "bell");
      floating.innerHTML = alerts.length
        ? `<div class="call-modal">${alertCards}</div>`
        : "";
      floating.classList.toggle("has-alerts", alerts.length > 0);
    }

    const signature = requestSignature();
    if (signature && signature !== state.lastAlertSignature) {
      state.lastAlertSignature = signature;
      playAlarm();
    }
    refreshIcons();
  };

  const renderTables = () => {
    const box = $("#tablesGrid");
    if (!box) return;
    state.tableRenderSignature = tablesSignature();
    box.innerHTML = state.tables.length
      ? state.tables
          .map((table) => {
            const session = state.sessions.find((entry) => entry.table_id === table.id);
            const pending = state.requests.filter(
              (request) => request.table_id === table.id && request.status === "pending"
            );
            return `
              <article class="table-card ${pending.length ? "needs-attention" : ""}">
                <div class="table-top">
                  <span>${icon(pending.length ? "alarm-clock" : "square", 16)} ${tableLabel(table)}</span>
                  <strong>${session ? money(sessionTotal(session)) : money(0)}</strong>
                </div>
                <p>${pending.length ? `${pending.length} solicitud(es) activa(s)` : session ? "Cuenta abierta" : "Disponible"}</p>
                <div class="table-qr-inline" data-table-qr="${table.id}"></div>
                <div class="table-actions">
                  <button class="ghost small" data-copy-qr="${tableCode(table)}">
                    ${icon("qr-code", 15)} Copiar QR
                  </button>
                  <button class="ghost small" data-download-qr="${table.id}">
                    ${icon("download", 15)} Descargar QR
                  </button>
                  ${session ? `<button class="ghost small" data-view-session="${session.id}">${icon("receipt", 15)} Ver cuenta</button>` : ""}
                </div>
              </article>
            `;
          })
          .join("")
      : emptyState("Sin mesas", "Crea las mesas del negocio para generar enlaces QR.", "layout-grid");
    refreshIcons();
    renderGeneratedTableQrs();
  };

  const renderBusinessForm = () => {
    const form = $("#businessForm");
    if (!form) return;
    form.business_name.value = state.business?.business_name || "";
    form.subtitle.value = state.business?.subtitle || "";
    form.accent_color.value = state.business?.accent_color || "#f05a28";
    form.currency.value = state.business?.currency || DEFAULT_CURRENCY;
    form.logo_url.value = state.business?.logo_url || "";
    form.cover_url.value = state.business?.cover_url || "";
    ["logo_url", "cover_url"].forEach((field) => {
      const status = $(`[data-upload-status="${field}"]`);
      const box = $(`[data-upload-box="${field}"]`);
      const hasImage = Boolean(form[field]?.value);
      if (status) status.textContent = hasImage ? "Imagen cargada" : "Seleccionar imagen";
      box?.classList.toggle("has-file", hasImage);
    });
  };

  const renderTableManager = () => {
    const list = $("#tableManagerList");
    if (!list) return;
    list.innerHTML = state.tables.length
      ? state.tables
          .map(
            (table) => `
              <div class="manager-row table-manager-row">
                <div class="qr-mini" data-table-qr="${table.id}"></div>
                <div>
                  <strong>${tableLabel(table)}</strong>
                  <span>${qrTextForTable(table)}</span>
                </div>
                <div class="row-actions">
                  <button class="icon-btn" data-edit-table="${table.id}" aria-label="Editar mesa">${icon("pencil", 17)}</button>
                  <button class="icon-btn" data-download-qr="${table.id}" aria-label="Descargar QR">${icon("download", 17)}</button>
                  <button class="icon-btn" data-regenerate-qr="${table.id}" aria-label="Rehacer QR">${icon("refresh-cw", 17)}</button>
                  <button class="icon-btn danger" data-delete-table="${table.id}" aria-label="Eliminar mesa">${icon("trash-2", 17)}</button>
                </div>
              </div>
            `
          )
          .join("")
      : emptyState("Sin mesas", "Agrega una mesa para generar su QR.", "qr-code");
    refreshIcons();
    renderGeneratedTableQrs();
  };

  const renderMenuManager = () => {
    const categorySelects = $$(".js-category-select");
    categorySelects.forEach((select) => {
      select.innerHTML = `
        <option value="">Elegir categoria</option>
        ${state.categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join("")}
      `;
    });

    const consumptionSelect = $("#consumptionItem");
    if (consumptionSelect) {
      consumptionSelect.innerHTML = `
        <option value="">Producto personalizado</option>
        ${state.items
          .filter((item) => item.is_available)
          .map((item) => `<option value="${item.id}">${item.name} - ${money(item.price)}</option>`)
          .join("")}
      `;
    }

    const categoryList = $("#categoryList");
    if (categoryList) {
      categoryList.innerHTML = state.categories.length
        ? state.categories
            .map(
              (category) => `
                <div class="manager-row category-manager-row">
                  <div class="category-token">${icon("tag", 16)}</div>
                  <div>
                    <strong>${category.name}</strong>
                    <span>Orden ${category.sort_order || 0} · ${category.is_active ? "Visible" : "Oculta"}</span>
                  </div>
                  <div class="row-actions">
                    <button class="icon-btn" data-edit-category="${category.id}" aria-label="Editar categoria">${icon("pencil", 17)}</button>
                    <button class="icon-btn danger" data-delete-category="${category.id}" aria-label="Eliminar categoria">${icon("trash-2", 17)}</button>
                  </div>
                </div>
              `
            )
            .join("")
        : emptyState("Sin categorias", "Crea categorias para ordenar el menu.", "tags");
    }

    const itemList = $("#itemList");
    if (itemList) {
      itemList.innerHTML = state.items.length
        ? state.items
            .map(
              (item) => `
                <div class="manager-row item-row product-manager-row">
                  <div class="product-thumb">
                    ${
                      item.image_url
                        ? `<img src="${item.image_url}" alt="${item.name}">`
                        : icon("utensils", 20)
                    }
                  </div>
                  <div class="product-manager-copy">
                    <strong>${item.name}</strong>
                    <span>${item.description || "Sin descripcion"}</span>
                    <div class="product-badges">
                      <em>${item.menu_categories?.name || "Sin categoria"}</em>
                      <em class="${item.is_available ? "is-on" : "is-off"}">${item.is_available ? "Disponible" : "Oculto"}</em>
                    </div>
                  </div>
                  <strong class="product-price">${money(item.price)}</strong>
                  <div class="row-actions">
                    <button class="icon-btn" data-edit-item="${item.id}" aria-label="Editar producto">${icon("pencil", 17)}</button>
                    <button class="icon-btn danger" data-delete-item="${item.id}" aria-label="Eliminar producto">${icon("trash-2", 17)}</button>
                  </div>
                </div>
              `
            )
            .join("")
        : emptyState("Sin productos", "Agrega platos, bebidas o servicios.", "chef-hat");
    }
    refreshIcons();
  };

  const renderGeneratedTableQrs = () => {
    $$("[data-table-qr]").forEach((target) => {
      const table = state.tables.find((entry) => entry.id === target.dataset.tableQr);
      if (!table) return;
      renderQrImage(target, qrTextForTable(table), `QR ${tableLabel(table)}`);
    });
  };

  const renderTableFormQr = () => {
    const form = $("#tableForm");
    const preview = $("#qrPreview");
    const link = $("#qrPreviewLink");
    if (!form || !preview || !link) return;
    const number = Number(form.table_number.value);
    const current = state.tables.find((table) => table.id === form.table_id.value);
    const table = current || (number ? { table_number: number, qr_code: `mesa-${number}` } : null);
    if (!table) {
      preview.innerHTML = `${icon("qr-code", 28)}`;
      link.textContent = "Define el numero de mesa para generar el enlace exacto.";
      refreshIcons();
      return;
    }
    const url = qrTextForTable(table);
    link.textContent = url;
    renderQrImage(preview, url, `QR ${tableLabel(table)}`);
  };

  const renderAccounts = () => {
    const box = $("#accountsPanel");
    if (!box) return;
    box.innerHTML = state.sessions.length
      ? state.sessions
          .map((session) => {
            const billRequest = state.requests.find(
              (request) => request.session_id === session.id && request.request_type === "bill"
            );
            const items = (session.session_items || []).filter((item) => item.status !== "cancelled");
            const total = sessionTotal(session);
            const openedAt = new Date(session.opened_at || session.created_at).toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit"
            });
            const openedDate = new Date(session.opened_at || session.created_at).toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            });
            return `
              <article class="account-card invoice-ticket">
                <div class="invoice-total-block">
                  <span>Total actual</span>
                  <strong>${money(total)}</strong>
                </div>

                <div class="invoice-identity">
                  <span>${tableLabel(session.restaurant_tables)}</span>
                  <strong>#${String(session.id).slice(0, 8).toUpperCase()}</strong>
                </div>

                <div class="invoice-meta-grid">
                  <span>Negocio</span>
                  <strong>${state.business?.business_name || "Restaurante"}</strong>
                  <span>Fecha</span>
                  <strong>${openedDate}</strong>
                  <span>Hora</span>
                  <strong>${openedAt}</strong>
                  <span>Consumos</span>
                  <strong>${items.length}</strong>
                </div>

                <div class="invoice-lines">
                  ${items
                    .map(
                      (item) => `
                        <div class="invoice-line">
                          <div>
                            <strong>${item.item_name}</strong>
                            <span>${item.quantity} x ${money(item.unit_price)}</span>
                          </div>
                          <strong>${money(Number(item.unit_price) * Number(item.quantity))}</strong>
                        </div>
                      `
                    )
                    .join("") || `<div class="invoice-empty">${icon("clipboard-list", 18)} Sin consumos registrados</div>`}
                </div>

                <div class="invoice-actions">
                  <button class="ghost small" data-add-manual="${session.id}">${icon("plus", 15)} Consumo</button>
                  ${
                    billRequest
                      ? `<button class="ghost small" data-send-bill="${billRequest.id}">${icon("send", 15)} ${
                          billRequest.status === "acknowledged" ? "Reenviar" : "Enviar cuenta"
                        }</button>`
                      : ""
                  }
                  <button class="primary small invoice-close" data-close-session="${session.id}">Cerrar ${icon("arrow-right", 15)}</button>
                </div>
              </article>
            `;
          })
          .join("")
      : emptyState("No hay cuentas abiertas", "Las mesas con consumos apareceran aqui.", "receipt-text");
    refreshIcons();
  };

  const renderAdmin = () => {
    renderAdminShell();
    renderAlerts();
    renderTables();
    renderBusinessForm();
    renderTableManager();
    renderMenuManager();
    renderAccounts();
  };

  const renderAdminLive = () => {
    renderAdminShell();
    renderAlerts();
    if (tablesSignature() !== state.tableRenderSignature) renderTables();
    renderAccounts();
  };

  const saveBusiness = async (form) => {
    const submit = form.querySelector("[type='submit']");
    const originalSubmit = submit?.innerHTML;
    if (submit) {
      submit.disabled = true;
      submit.innerHTML = `${icon("loader-circle", 16)} Guardando`;
      refreshIcons();
    }
    const payload = {
      is_primary: true,
      business_name: form.business_name.value.trim() || "Tu restaurante",
      subtitle: form.subtitle.value.trim(),
      accent_color: form.accent_color.value || "#f05a28",
      currency: form.currency.value || DEFAULT_CURRENCY,
      logo_url: form.logo_url.value.trim(),
      cover_url: form.cover_url.value.trim()
    };
    const saved = await db(
      state.sb.from("business_settings").upsert(payload, { onConflict: "is_primary" }).select("*").single(),
      null
    );
    if (saved) {
      state.business = saved;
      toast("Marca actualizada. El cliente ya vera esta personalizacion.");
      renderAdmin();
      showAdminSection("brand");
    }
    if (submit) {
      submit.disabled = false;
      submit.innerHTML = originalSubmit;
      refreshIcons();
    }
  };

  const uploadAsset = async (file, fieldName) => {
    if (!file) return;
    const status = $(`[data-upload-status="${fieldName}"]`);
    const box = $(`[data-upload-box="${fieldName}"]`);
    if (status) status.textContent = "Subiendo...";
    box?.classList.add("is-uploading");
    const extension = file.name.split(".").pop() || "jpg";
    const path = `brand/${fieldName}-${uid()}.${extension}`;
    const { error } = await state.sb.storage.from("brand-assets").upload(path, file, { upsert: true });
    if (error) {
      if (status) status.textContent = "No se pudo subir";
      box?.classList.remove("is-uploading");
      toast(`No se pudo subir: ${error.message}`, "error");
      return;
    }
    const { data } = state.sb.storage.from("brand-assets").getPublicUrl(path);
    const input = $(`[name="${fieldName}"]`);
    if (input) input.value = data.publicUrl;
    if (status) status.textContent = "Imagen cargada. Guarda para aplicar.";
    box?.classList.remove("is-uploading");
    box?.classList.add("has-file");
    toast("Imagen subida. Guarda la marca para aplicarla.");
  };

  const saveTable = async (form) => {
    const number = Number(form.table_number.value);
    const payload = {
      table_number: number,
      table_name: form.table_name.value.trim() || null,
      qr_code: `mesa-${number}`,
      qr_image_url: null,
      is_active: form.is_active.checked
    };
    if (!payload.table_number) {
      toast("El numero de mesa es obligatorio.", "error");
      return;
    }
    const submit = form.querySelector("[type='submit']");
    const originalSubmit = submit?.innerHTML;
    if (submit) {
      submit.disabled = true;
      submit.innerHTML = `${icon("loader-circle", 16)} Guardando`;
      refreshIcons();
    }
    const id = form.table_id.value;
    const existing = id ? null : state.tables.find((table) => Number(table.table_number) === number);
    const targetId = id || existing?.id;
    const isUpdate = Boolean(targetId);
    const query = targetId
      ? state.sb.from("restaurant_tables").update(payload).eq("id", targetId).select("*").single()
      : state.sb.from("restaurant_tables").insert(payload).select("*").single();
    let saved = await db(query, null);
    if (saved) {
      form.reset();
      form.table_id.value = "";
      await loadCore();
      renderAdmin();
      showAdminSection("menu");
      renderTableFormQr();
      toast(isUpdate ? "Mesa actualizada. QR listo para descargar." : "Mesa guardada. QR listo para descargar.");
    }
    if (submit) {
      submit.disabled = false;
      submit.innerHTML = originalSubmit;
      refreshIcons();
    }
  };

  const saveCategory = async (form) => {
    const payload = {
      name: form.category_name.value.trim(),
      sort_order: Number(form.category_sort.value || 0),
      is_active: form.category_active.checked
    };
    if (!payload.name) {
      toast("La categoria necesita nombre.", "error");
      return;
    }
    const id = form.category_id.value;
    const query = id
      ? state.sb.from("menu_categories").update(payload).eq("id", id).select("*").single()
      : state.sb.from("menu_categories").insert(payload).select("*").single();
    const saved = await db(query, null);
    if (saved) {
      form.reset();
      form.category_id.value = "";
      form.category_active.checked = true;
      await loadCore();
      renderAdmin();
      toast("Categoria guardada.");
    }
  };

  const saveItem = async (form) => {
    let categoryId = form.category_id.value;
    const newCategory = form.new_category.value.trim();
    if (!categoryId && newCategory) {
      const category = await db(
        state.sb.from("menu_categories").insert({ name: newCategory, is_active: true }).select("*").single(),
        null
      );
      categoryId = category?.id || "";
    }
    const payload = {
      category_id: categoryId || null,
      name: form.item_name.value.trim(),
      description: form.description.value.trim(),
      price: Number(form.price.value || 0),
      image_url: form.image_url.value.trim(),
      is_available: form.is_available.checked,
      sort_order: Number(form.sort_order.value || 0)
    };
    if (!payload.name || !payload.price) {
      toast("Producto y precio son obligatorios.", "error");
      return;
    }
    const id = form.item_id.value;
    const query = id
      ? state.sb.from("menu_items").update(payload).eq("id", id).select("*").single()
      : state.sb.from("menu_items").insert(payload).select("*").single();
    const saved = await db(query, null);
    if (saved) {
      form.reset();
      form.item_id.value = "";
      form.is_available.checked = true;
      await loadCore();
      renderAdmin();
      toast("Producto guardado.");
    }
  };

  const acceptRequest = async (id) => {
    stopAlarm();
    const saved = await db(
      state.sb
        .from("service_requests")
        .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single(),
      null
    );
    if (saved) {
      await loadAdminData();
      renderAdmin();
      toast("Solicitud aceptada.");
    }
  };

  const sendBillToClient = async (requestId) => {
    stopAlarm();
    const request = state.requests.find((entry) => entry.id === requestId);
    const session = state.sessions.find((entry) => entry.id === request?.session_id);
    if (!request || !session) {
      toast("No se encontro la cuenta abierta de esta mesa.", "error");
      return;
    }
    const saved = await db(
      state.sb
        .from("service_requests")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
          message: buildBillMessage(session)
        })
        .eq("id", requestId)
        .select("*")
        .single(),
      null
    );
    if (saved) {
      await loadAdminData();
      renderAdmin();
      toast("Cuenta enviada al cliente.");
    }
  };

  const closeSession = async (id) => {
    const session = state.sessions.find((entry) => entry.id === id);
    const total = sessionTotal(session);
    const saved = await db(
      state.sb
        .from("table_sessions")
        .update({ status: "closed", closed_at: new Date().toISOString(), total })
        .eq("id", id)
        .select("*")
        .single(),
      null
    );
    if (saved) {
      await state.sb.from("service_requests").update({ status: "resolved" }).eq("session_id", id);
      await loadAdminData();
      renderAdmin();
      toast("Cuenta cerrada.");
    }
  };

  const openConsumptionDialog = (sessionId) => {
    const dialog = $("#consumptionDialog");
    const form = $("#consumptionForm");
    if (!dialog || !form) return;
    form.reset();
    form.session_id.value = sessionId;
    form.quantity.value = 1;
    form.unit_price.value = 0;
    dialog.showModal();
    refreshIcons();
  };

  const addManualConsumption = async (form) => {
    const sessionId = form.session_id.value;
    const session = state.sessions.find((entry) => entry.id === sessionId);
    const selectedItem = state.items.find((item) => item.id === form.menu_item_id.value);
    const name = form.item_name.value.trim() || selectedItem?.name;
    const price = Number(form.unit_price.value || selectedItem?.price || 0);
    const quantity = Number(form.quantity.value || 1);
    if (!name) {
      toast("El consumo necesita nombre o producto.", "error");
      return;
    }
    const saved = await db(
      state.sb
        .from("session_items")
        .insert({
          session_id: sessionId,
          table_id: session?.table_id,
          menu_item_id: selectedItem?.id || null,
          item_name: name,
          unit_price: price,
          quantity,
          notes: form.notes.value.trim(),
          status: "served"
        })
        .select("*")
        .single(),
      null
    );
    if (saved) {
      await loadAdminData();
      renderAdmin();
      toast("Consumo agregado.");
      $("#consumptionDialog")?.close();
    }
  };

  const copyQr = async (code) => {
    const url = clientUrlForCode(code);
    try {
      await navigator.clipboard.writeText(url);
      toast("Enlace de QR copiado.");
    } catch (error) {
      window.prompt("Enlace para generar o validar el QR de esta mesa:", url);
    }
  };

  const downloadFromUrl = async (url, filename) => {
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error("No se pudo descargar el archivo.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast("Abrimos el QR en una pestaña para guardarlo.", "ok");
    }
  };

  const downloadQr = async (id) => {
    const table = state.tables.find((entry) => entry.id === id);
    if (!table) return;
    const dataUrl = await generateQrDataUrl(qrTextForTable(table), 1200);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-mesa-${table.table_number}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast(`QR de ${tableLabel(table)} listo para imprimir.`);
  };

  const regenerateQr = async (id) => {
    const table = state.tables.find((entry) => entry.id === id);
    if (!table) return;
    if (!confirm(`Rehacer el QR de ${tableLabel(table)}? El QR impreso anterior dejara de funcionar.`)) return;
    const nextCode = `mesa-${table.table_number}-${uid().slice(0, 8)}`;
    const saved = await db(
      state.sb
        .from("restaurant_tables")
        .update({ qr_code: nextCode, qr_image_url: null })
        .eq("id", id)
        .select("*")
        .single(),
      null
    );
    if (saved) {
      await loadCore();
      renderAdmin();
      showAdminSection("menu");
      toast("QR regenerado. Descarga el nuevo antes de imprimir.");
    }
  };

  const editTable = (id) => {
    const table = state.tables.find((entry) => entry.id === id);
    const form = $("#tableForm");
    if (!table || !form) return;
    form.table_id.value = table.id;
    form.table_number.value = table.table_number;
    form.table_name.value = table.table_name || "";
    form.is_active.checked = table.is_active;
    renderTableFormQr();
    history.replaceState(null, "", "#menu");
    showAdminSection("menu");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const editCategory = (id) => {
    const category = state.categories.find((entry) => entry.id === id);
    const form = $("#categoryForm");
    if (!category || !form) return;
    form.category_id.value = category.id;
    form.category_name.value = category.name;
    form.category_sort.value = category.sort_order || 0;
    form.category_active.checked = category.is_active;
    history.replaceState(null, "", "#menu");
    showAdminSection("menu");
  };

  const editItem = (id) => {
    const item = state.items.find((entry) => entry.id === id);
    const form = $("#itemForm");
    if (!item || !form) return;
    form.item_id.value = item.id;
    form.category_id.value = item.category_id || "";
    form.new_category.value = "";
    form.item_name.value = item.name;
    form.description.value = item.description || "";
    form.price.value = item.price;
    form.image_url.value = item.image_url || "";
    form.is_available.checked = item.is_available;
    form.sort_order.value = item.sort_order || 0;
    history.replaceState(null, "", "#menu");
    showAdminSection("menu");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const deleteRow = async (table, id, label) => {
    if (!confirm(`Eliminar ${label}?`)) return;
    const removed = await db(state.sb.from(table).delete().eq("id", id).select("*").single(), null);
    if (removed) {
      await loadCore();
      await loadAdminData();
      renderAdmin();
      toast("Eliminado.");
    }
  };

  const bindAdmin = () => {
    $("#businessForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveBusiness(event.currentTarget);
    });
    $("#tableForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveTable(event.currentTarget);
    });
    $("#tableForm")?.addEventListener("input", (event) => {
      if (event.target.name === "table_number") renderTableFormQr();
    });
    $("#categoryForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveCategory(event.currentTarget);
    });
    $("#itemForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveItem(event.currentTarget);
    });
    $("#consumptionForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await addManualConsumption(event.currentTarget);
    });

    document.addEventListener("change", async (event) => {
      if (event.target.matches("[data-upload]")) {
        await uploadAsset(event.target.files[0], event.target.dataset.upload);
      }
      if (event.target.name === "menu_item_id" && event.target.closest("#consumptionForm")) {
        const item = state.items.find((entry) => entry.id === event.target.value);
        const form = event.target.form;
        form.item_name.value = item?.name || "";
        form.unit_price.value = item?.price || 0;
      }
    });

    document.addEventListener("click", async (event) => {
      const navLink = event.target.closest(".admin-sidebar nav a");
      if (navLink) {
        event.preventDefault();
        const section = navLink.getAttribute("href")?.replace("#", "") || "dashboard";
        history.replaceState(null, "", `#${section}`);
        showAdminSection(section);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (event.target.closest("[data-alert-card]")) stopAlarm();

      const target = event.target.closest("button");
      if (!target) return;
      if (target.id === "enableSound") {
        await unlockAlarm();
      }
      if (target.dataset.acceptRequest) await acceptRequest(target.dataset.acceptRequest);
      if (target.dataset.sendBill) await sendBillToClient(target.dataset.sendBill);
      if (target.dataset.closeSession) await closeSession(target.dataset.closeSession);
      if (target.dataset.addManual) openConsumptionDialog(target.dataset.addManual);
      if (target.dataset.closeDialog !== undefined) target.closest("dialog")?.close();
      if (target.dataset.copyQr) await copyQr(target.dataset.copyQr);
      if (target.dataset.downloadQr) await downloadQr(target.dataset.downloadQr);
      if (target.dataset.regenerateQr) await regenerateQr(target.dataset.regenerateQr);
      if (target.dataset.viewSession) {
        history.replaceState(null, "", "#accounts");
        showAdminSection("accounts");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (target.dataset.editTable) editTable(target.dataset.editTable);
      if (target.dataset.editCategory) editCategory(target.dataset.editCategory);
      if (target.dataset.editItem) editItem(target.dataset.editItem);
      if (target.dataset.deleteTable) await deleteRow("restaurant_tables", target.dataset.deleteTable, "esta mesa");
      if (target.dataset.deleteCategory) await deleteRow("menu_categories", target.dataset.deleteCategory, "esta categoria");
      if (target.dataset.deleteItem) await deleteRow("menu_items", target.dataset.deleteItem, "este producto");
    });

    window.addEventListener("hashchange", () => {
      showAdminSection(location.hash.replace("#", "") || "dashboard");
    });
  };

  const subscribeAdmin = () => {
    const channel = state.sb
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, async () => {
        await loadAdminData();
        renderAdminLive();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "session_items" }, async () => {
        await loadAdminData();
        renderAdminLive();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "table_sessions" }, async () => {
        await loadAdminData();
        renderAdminLive();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("En vivo", "live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("Respaldo activo", "fallback");
        }
      });
    state.subscriptions.push(channel);
  };

  const initAdmin = async () => {
    setLoading(true);
    state.soundEnabled = localStorage.getItem("waiter_alarm_enabled") === "1";
    await loadBusiness();
    await loadCore();
    await loadAdminData();
    renderAdmin();
    showAdminSection(location.hash.replace("#", "") || "dashboard");
    renderTableFormQr();
    updateAlarmButton();
    bindAdmin();
    subscribeAdmin();
    startAlarmLoop();
    startAdminPolling();
    setLoading(false);
  };

  const init = async () => {
    state.page = document.body.dataset.page || "";
    if (!connect()) {
      document.body.innerHTML = `
        <main class="setup-screen">
          <div class="setup-card">
            ${icon("database-zap", 34)}
            <h1>Conecta Supabase</h1>
            <p>Pega tu URL y anon key en la primera linea de <strong>app.js</strong>, luego ejecuta <strong>supabase-schema.sql</strong> en Supabase.</p>
          </div>
        </main>
      `;
      refreshIcons();
      return;
    }
    if (state.page === "admin") await initAdmin();
    if (state.page === "client") await initClient();
    refreshIcons();
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
