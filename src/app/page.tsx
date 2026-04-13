"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ref, onValue, set, get } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import type { ChatMessage } from "@/lib/types";
import { Suspense } from "react";

function userKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

function ChatApp() {
  const searchParams = useSearchParams();
  const treatmentId = searchParams.get("id") || "";
  const userId = parseInt(searchParams.get("user") || "0");
  const userName = searchParams.get("name") || "";
  const department = (searchParams.get("dept") || "DOCTOR") as "DOCTOR" | "ADMIN";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Listen to messages
  useEffect(() => {
    if (!treatmentId) return;
    const messagesRef = ref(rtdb, `chats/${treatmentId}/messages`);
    const unsub = onValue(messagesRef, (snap) => {
      const data = snap.val();
      if (!data) { setMessages([]); setLoading(false); return; }
      const msgs: ChatMessage[] = Object.entries(data)
        .map(([id, val]) => ({ id, ...(val as Omit<ChatMessage, "id">) }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgs);
      setLoading(false);
    });
    return () => unsub();
  }, [treatmentId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read when messages change
  const markAsRead = useCallback(async () => {
    if (!treatmentId || !userName) return;
    await set(
      ref(rtdb, `chats/${treatmentId}/users_last_read/${userKey(userName)}`),
      new Date().toISOString()
    );
  }, [treatmentId, userName]);

  useEffect(() => {
    markAsRead();
  }, [messages, markAsRead]);

  async function handleSend() {
    const msg = text.trim();
    if (!msg || !treatmentId) return;
    setText("");
    const now = Date.now();
    const id = `${now}_${Math.random().toString(36).slice(2, 8)}`;
    await set(ref(rtdb, `chats/${treatmentId}/messages/${id}`), {
      department,
      message: msg,
      user: userId,
      user_name: userName,
      timestamp: now,
    });
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  }

  if (!treatmentId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        Falta el parámetro <code className="mx-1 bg-gray-100 px-1 rounded">?id=</code> del tratamiento
      </div>
    );
  }

  let lastDate = "";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <p className="text-sm font-bold text-gray-800">Chat</p>
        <p className="text-xs text-gray-400">Tratamiento #{treatmentId}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-10">Cargando...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-10">No hay mensajes. Escribe el primero.</p>
        ) : (
          messages.map((msg) => {
            const dateStr = formatDate(msg.timestamp);
            const showDate = dateStr !== lastDate;
            lastDate = dateStr;
            const isMe = msg.user === userId;

            return (
              <div key={msg.id}>
                {showDate && (
                  <p className="text-[10px] text-gray-400 text-center my-3">{dateStr}</p>
                )}
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <p className={`text-[10px] mb-1 ${isMe ? "text-right" : "text-left"} text-gray-400`}>
                    <span className="font-semibold text-gray-500">{msg.user_name}</span>
                    <span className="mx-1">·</span>
                    <span>{msg.department}</span>
                    <span className="mx-1">·</span>
                    <span>{formatTime(msg.timestamp)}</span>
                  </p>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    isMe
                      ? "bg-[#d4145a] text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm"
                  }`}>
                    <p className="break-words leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-[#d4145a] bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-[#d4145a] rounded-full hover:bg-[#b8114e] disabled:opacity-40 transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400 text-sm">Cargando...</div>}>
      <ChatApp />
    </Suspense>
  );
}
