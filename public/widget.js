(function () {
  const script = document.currentScript;

  // === PARAMÈTRES CLIENT ===
  const API_URL = script.getAttribute("data-api") || "https://ton-domaine.vercel.app/api/ask";
  const TOKEN = script.getAttribute("data-token");
  const CONTEXT = script.getAttribute("data-context") || "No context provided";

  // Branding
  const BRAND_PRIMARY = script.getAttribute("data-brand-primary") || "#111";
  const BRAND_SECONDARY = script.getAttribute("data-brand-secondary") || "#ffcc00";
  const BRAND_RADIUS = script.getAttribute("data-brand-radius") || "14";
  const BRAND_LOGO = script.getAttribute("data-brand-logo") || null;

  // Avatars
  const AVATAR = script.getAttribute("data-avatar") || "https://i.imgur.com/7k12Z.png";
  const USER_AVATAR = script.getAttribute("data-user-avatar") || "https://i.imgur.com/8k12Z.png";

  const TITLE = script.getAttribute("data-title") || "Assistant IA Premium";

  // === STYLES GLOBAUX ===
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes typing {
      0% { opacity: 0.2; }
      50% { opacity: 1; }
      100% { opacity: 0.2; }
    }
    .typing-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      margin-right: 4px;
      background: #aaa;
      border-radius: 50%;
      animation: typing 1s infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @media (prefers-color-scheme: dark) {
      .nassim-chat-window {
        background: #1e1e1e !important;
        color: #fff !important;
      }
      .nassim-bubble-bot {
        background: #2a2a2a !important;
        color: #fff !important;
      }
    }
  `;
  document.head.appendChild(style);

  // === BOUTON FLOTTANT ===
  const bubble = document.createElement("div");
  bubble.innerHTML = "💬";
  bubble.style.position = "fixed";
  bubble.style.bottom = "20px";
  bubble.style.right = "20px";
  bubble.style.width = "60px";
  bubble.style.height = "60px";
  bubble.style.background = BRAND_PRIMARY;
  bubble.style.color = "#fff";
  bubble.style.borderRadius = "50%";
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.cursor = "pointer";
  bubble.style.fontSize = "28px";
  bubble.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  bubble.style.zIndex = "99999";
  bubble.style.transition = "0.3s";
  bubble.onmouseover = () => bubble.style.transform = "scale(1.1)";
  bubble.onmouseout = () => bubble.style.transform = "scale(1)";
  document.body.appendChild(bubble);

  // === FENÊTRE DE CHAT ===
  const chat = document.createElement("div");
  chat.classList.add("nassim-chat-window");
  chat.style.position = "fixed";
  chat.style.bottom = "100px";
  chat.style.right = "20px";
  chat.style.width = "380px";
  chat.style.height = "520px";
  chat.style.background = "#fff";
  chat.style.borderRadius = BRAND_RADIUS + "px";
  chat.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
  chat.style.display = "none";
  chat.style.flexDirection = "column";
  chat.style.overflow = "hidden";
  chat.style.zIndex = "99999";
  chat.style.animation = "fadeIn 0.3s ease";
  document.body.appendChild(chat);

  // === HEADER ===
  const header = document.createElement("div");
  header.style.background = BRAND_PRIMARY;
  header.style.color = "#fff";
  header.style.padding = "14px";
  header.style.fontSize = "17px";
  header.style.fontWeight = "bold";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.gap = "10px";

  if (BRAND_LOGO) {
    const logo = document.createElement("img");
    logo.src = BRAND_LOGO;
    logo.style.width = "28px";
    logo.style.height = "28px";
    logo.style.borderRadius = "6px";
    header.appendChild(logo);
  }

  const titleText = document.createElement("span");
  titleText.innerText = TITLE;
  header.appendChild(titleText);

  chat.appendChild(header);

  // === MESSAGES ===
  const messages = document.createElement("div");
  messages.style.flex = "1";
  messages.style.padding = "14px";
  messages.style.overflowY = "auto";
  messages.style.fontSize = "15px";
  messages.style.display = "flex";
  messages.style.flexDirection = "column";
  messages.style.gap = "10px";
  chat.appendChild(messages);

  // === INPUT ===
  const inputContainer = document.createElement("div");
  inputContainer.style.display = "flex";
  inputContainer.style.borderTop = "1px solid #ddd";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Écrivez votre message...";
  input.style.flex = "1";
  input.style.padding = "12px";
  input.style.border = "none";
  input.style.outline = "none";

  const sendBtn = document.createElement("button");
  sendBtn.innerText = "Envoyer";
  sendBtn.style.background = BRAND_SECONDARY;
  sendBtn.style.color = "#000";
  sendBtn.style.border = "none";
  sendBtn.style.padding = "12px 16px";
  sendBtn.style.cursor = "pointer";
  sendBtn.style.fontWeight = "bold";

  inputContainer.appendChild(input);
  inputContainer.appendChild(sendBtn);
  chat.appendChild(inputContainer);

  // === HISTORIQUE LOCAL ===
  let history = JSON.parse(localStorage.getItem("nassim-history") || "[]");

  function saveHistory() {
    localStorage.setItem("nassim-history", JSON.stringify(history));
  }

  // === AFFICHER L’HISTORIQUE ===
  history.forEach(msg => {
    const bubble = createBubble(msg.role, msg.content);
    messages.appendChild(bubble);
  });

  // === FONCTION BUBBLE ===
  function createBubble(role, text) {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.gap = "8px";
    wrapper.style.alignItems = "flex-start";

    const avatar = document.createElement("img");
    avatar.src = role === "user" ? USER_AVATAR : AVATAR;
    avatar.style.width = "32px";
    avatar.style.height = "32px";
    avatar.style.borderRadius = "50%";

    const bubble = document.createElement("div");
    bubble.style.padding = "10px 14px";
    bubble.style.borderRadius = BRAND_RADIUS + "px";
    bubble.style.maxWidth = "75%";
    bubble.style.whiteSpace = "pre-wrap";

    if (role === "user") {
      wrapper.style.flexDirection = "row-reverse";
      bubble.style.background = BRAND_SECONDARY;
      bubble.style.color = "#000";
    } else {
      bubble.classList.add("nassim-bubble-bot");
      bubble.style.background = "#f1f1f1";
      bubble.style.color = "#000";
    }

    bubble.innerText = text;
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    return wrapper;
  }

  // === TYPING INDICATOR ===
  function showTyping() {
    const typing = document.createElement("div");
    typing.style.display = "flex";
    typing.style.gap = "4px";
    typing.style.margin = "6px 0";
    typing.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    return typing;
  }

  // === OUVERTURE / FERMETURE ===
  bubble.onclick = () => {
    chat.style.display = chat.style.display === "none" ? "flex" : "none";
  };

  // === ENVOI MESSAGE ===
  sendBtn.onclick = async () => {
    const message = input.value.trim();
    if (!message) return;

    const userBubble = createBubble("user", message);
    messages.appendChild(userBubble);

    input.value = "";
    history.push({ role: "user", content: message });
    saveHistory();

    const typing = showTyping();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-auth-token": TOKEN,
        },
        body: JSON.stringify({
          message,
          history,
          context: CONTEXT,
        }),
      });

      const data = await res.json();
      typing.remove();

      if (data?.reply) {
        const botBubble = createBubble("assistant", data.reply);
        messages.appendChild(botBubble);

        history.push({ role: "assistant", content: data.reply });
        saveHistory();
      } else {
        typing.innerText = "Erreur de réponse.";
      }
    } catch (err) {
      typing.innerText = "Erreur de connexion.";
    }

    messages.scrollTop = messages.scrollHeight;
  };
})();
