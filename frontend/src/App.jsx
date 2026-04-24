import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const HISTORY_STORAGE_KEY = "copilot-chat-history";
const SIDEBAR_STORAGE_KEY = "copilot-sidebar-open";
const EMPTY_MESSAGES = [];

const createChat = (messages = []) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title: "New chat",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages,
});

const getChatTitle = (messages) => {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return "New chat";

  return firstUserMessage.content.length > 42
    ? `${firstUserMessage.content.slice(0, 42)}...`
    : firstUserMessage.content;
};

const formatHistoryDate = (value) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const loadInitialChats = () => {
  try {
    const savedChats = JSON.parse(
      localStorage.getItem(HISTORY_STORAGE_KEY) || "[]"
    );
    return savedChats.length ? savedChats : [createChat()];
  } catch {
    return [createChat()];
  }
};

const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 4V2M12 22v-2M4 12H2M22 12h-2M6.34 6.34 4.93 4.93M19.07 19.07l-1.41-1.41M17.66 6.34l1.41-1.41M6.34 17.66l-1.41 1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const formatBotMessage = (data) => {
  if (data.error) {
    return {
      role: "bot",
      tone: "error",
      content: `${data.error}${data.details ? `\n${data.details}` : ""}`,
    };
  }

  if (data.action === "explain") {
    return {
      role: "bot",
      tone: "default",
      content: data.result || "No explanation was returned.",
    };
  }

  return {
    role: "bot",
    tone: "default",
    content: `SQL: ${data.sql || "N/A"}\n\nResult:\n${JSON.stringify(
      data.result,
      null,
      2
    )}`,
  };
};

function App() {
  const [query, setQuery] = useState("");
  const [chatState, setChatState] = useState(() => {
    const initialChats = loadInitialChats();
    return {
      chats: initialChats,
      activeChatId: initialChats[0]?.id || null,
    };
  });
  const { chats, activeChatId } = chatState;
  const setChats = (updater) => {
    setChatState((currentState) => ({
      ...currentState,
      chats:
        typeof updater === "function" ? updater(currentState.chats) : updater,
    }));
  };
  const setActiveChatId = (updater) => {
    setChatState((currentState) => ({
      ...currentState,
      activeChatId:
        typeof updater === "function"
          ? updater(currentState.activeChatId)
          : updater,
    }));
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return savedState ? savedState === "true" : true;
  });
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 900;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [historyMenu, setHistoryMenu] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("copilot-theme");
    return savedTheme || "light";
  });
  const messagesRef = useRef(null);
  const sidebarRef = useRef(null);
  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || chats[0],
    [activeChatId, chats]
  );
  const messages = activeChat?.messages ?? EMPTY_MESSAGES;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("copilot-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const syncMobileView = (event) => {
      setIsMobileView(event.matches);
    };

    mediaQuery.addEventListener("change", syncMobileView);

    return () => {
      mediaQuery.removeEventListener("change", syncMobileView);
    };
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
    setShowScrollToBottom(false);
  }, [messages, isLoading]);

  useEffect(() => {
    if (!historyMenu) return;

    const closeHistoryMenu = () => {
      setHistoryMenu(null);
    };

    window.addEventListener("click", closeHistoryMenu);
    window.addEventListener("scroll", closeHistoryMenu, true);

    return () => {
      window.removeEventListener("click", closeHistoryMenu);
      window.removeEventListener("scroll", closeHistoryMenu, true);
    };
  }, [historyMenu]);

  const updateScrollState = () => {
    const container = messagesRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 120);
  };

  const scrollToBottom = () => {
    const container = messagesRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  const startNewChat = () => {
    const nextChat = createChat();
    setChats((prevChats) => [nextChat, ...prevChats]);
    setActiveChatId(nextChat.id);
    setQuery("");
    setShowScrollToBottom(false);
    if (isMobileView) {
      setIsSidebarOpen(false);
    }
  };

  const selectChat = (chatId) => {
    if (isLoading) return;
    setActiveChatId(chatId);
    setQuery("");
    setShowScrollToBottom(false);
    if (isMobileView) {
      setIsSidebarOpen(false);
    }
  };

  const openHistoryMenu = (event, chatId) => {
    event.preventDefault();

    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    const menuWidth = 152;
    const menuHeight = 52;
    const fallbackLeft = event.clientX;
    const fallbackTop = event.clientY;

    const left = sidebarRect
      ? Math.min(
          Math.max(event.clientX - sidebarRect.left, 8),
          sidebarRect.width - menuWidth - 8
        )
      : fallbackLeft;
    const top = sidebarRect
      ? Math.min(
          Math.max(event.clientY - sidebarRect.top, 8),
          sidebarRect.height - menuHeight - 8
        )
      : fallbackTop;

    setHistoryMenu({ chatId, left, top });
  };

  const deleteChat = (chatId) => {
    const remainingChats = chats.filter((chat) => chat.id !== chatId);
    const nextChats = remainingChats.length ? remainingChats : [createChat()];
    const nextActiveChatId =
      activeChatId === chatId ? nextChats[0].id : activeChatId;

    setChatState((currentState) => ({
      ...currentState,
      chats: nextChats,
      activeChatId: nextActiveChatId,
    }));
    setHistoryMenu(null);
    setQuery("");
    setShowScrollToBottom(false);
  };

  const sendQuery = async (nextQuery) => {
    const value = (nextQuery ?? query).trim();
    const targetChatId = activeChat?.id;
    if (!value || isLoading || !targetChatId) return;

    const userMessage = { role: "user", content: value };
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== targetChatId) return chat;

        const nextMessages = [...chat.messages, userMessage];
        return {
          ...chat,
          title: getChatTitle(nextMessages),
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    setIsLoading(true);
    setQuery("");

    try {
      const res = await fetch("http://127.0.0.1:8000/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: value }),
      });

      const data = await res.json();
      const botMessage = formatBotMessage(data);
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === targetChatId
            ? {
                ...chat,
                messages: [...chat.messages, botMessage],
                updatedAt: new Date().toISOString(),
              }
            : chat
        )
      );
    } catch (error) {
      const errorMessage = {
        role: "bot",
        tone: "error",
        content: `Server error\n${error.message}`,
      };
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === targetChatId
            ? {
                ...chat,
                messages: [...chat.messages, errorMessage],
                updatedAt: new Date().toISOString(),
              }
            : chat
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendQuery();
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      className={`app-shell ${
        isSidebarOpen ? "sidebar-open" : "sidebar-closed"
      }`}
    >
      <button
        type="button"
        className="logo-toggle"
        onClick={() => setIsSidebarOpen((currentState) => !currentState)}
        aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar"}
      >
        <span className="logo-mark" aria-hidden="true">
          AI
        </span>
      </button>

      <aside ref={sidebarRef} className="sidebar" aria-label="Chat history">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo" aria-hidden="true">
              AI
            </span>
            <div>
              <p className="sidebar-title">AI Data Copilot</p>
              <p className="sidebar-subtitle">Workspace</p>
            </div>
          </div>
        </div>

        <button type="button" className="new-chat-button" onClick={startNewChat}>
          <span aria-hidden="true">+</span>
          New Chat
        </button>

        <div className="history-section">
          <p className="history-label">Chat history</p>
          <div className="history-list">
            {chats.map((chat) => {
              const lastMessage = chat.messages.at(-1);
              return (
                <button
                  key={chat.id}
                  type="button"
                  className={`history-item ${
                    chat.id === activeChat?.id ? "is-active" : ""
                  }`}
                  onClick={() => selectChat(chat.id)}
                  onContextMenu={(event) => openHistoryMenu(event, chat.id)}
                >
                  <span className="history-title">{chat.title}</span>
                  <span className="history-preview">
                    {lastMessage?.content || "Start a new conversation"}
                  </span>
                  <span className="history-date">
                    {formatHistoryDate(chat.updatedAt)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {historyMenu && (
          <div
            className="history-menu"
            style={{ left: historyMenu.left, top: historyMenu.top }}
          >
            <button
              type="button"
              className="history-menu-action danger"
              onClick={() => deleteChat(historyMenu.chatId)}
            >
              Delete chat
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          <button
            type="button"
            className="theme-toggle sidebar-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${
              theme === "light" ? "dark" : "light"
            } mode`}
          >
            <span className="theme-icon">
              <SunIcon />
            </span>
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb" />
            </span>
            <span className="theme-icon">
              <MoonIcon />
            </span>
          </button>
        </div>
      </aside>

      {isMobileView && isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="app-frame">
        {isEmpty && (
          <nav className="topbar">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true">
                AI
              </span>
              <div>
                <p className="brand-title">AI Data Copilot</p>
                <p className="brand-subtitle">Database analytics assistant</p>
              </div>
            </div>
          </nav>
        )}

        <main className={`hero-panel ${isEmpty ? "is-empty" : "has-chat"}`}>
          <div className="ambient ambient-pink" aria-hidden="true" />
          <div className="ambient ambient-blue" aria-hidden="true" />

          {!isEmpty && (
            <div className="mobile-chatbar">
              <div className="mobile-chatbar-title">
                <span className="mobile-chatbar-label">Current chat</span>
                <span className="mobile-chatbar-name">{activeChat?.title}</span>
              </div>
            </div>
          )}

          {isEmpty && (
            <section className="hero-copy">
              <div className="hero-icon" aria-hidden="true">
                AI
              </div>
              <h1>Ask our AI anything</h1>
              <p>
                Query your data, inspect SQL, and surface project insights from a
                calmer, more polished workspace.
              </p>
            </section>
          )}

          <section
            ref={messagesRef}
            className="messages"
            aria-live="polite"
            onScroll={updateScrollState}
          >
            {isEmpty ? null : (
              messages.map((msg, index) => (
                <article
                  key={`${msg.role}-${index}`}
                  className={`message message-${msg.role} ${
                    msg.tone === "error" ? "message-error" : ""
                  }`}
                >
                  <div className="message-meta">
                    {msg.role === "user" ? "You" : "Copilot"}
                  </div>
                  <p className="message-content">{msg.content}</p>
                </article>
              ))
            )}

            {isLoading && (
              <article className="message message-bot message-loading">
                <div className="message-meta">Copilot</div>
                <p className="message-content">
                  Thinking
                  <span className="loading-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </p>
              </article>
            )}
          </section>

          {showScrollToBottom && !isEmpty && (
            <button
              type="button"
              className="scroll-to-bottom"
              onClick={scrollToBottom}
              aria-label="Scroll to latest message"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 5V17M12 17L7 12M12 17L17 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          <form className="composer" onSubmit={handleSubmit}>
            <input
              className="composer-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask me anything about your Data"
            />
            <button
              type="submit"
              className="composer-submit"
              disabled={isLoading}
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M3 20L21 12L3 4L6.5 11L14 12L6.5 13L3 20Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

export default App;
