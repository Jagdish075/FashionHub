import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const FAQS = [
  {
    id: "delivery-time",
    question: "How many days does delivery take?",
    answer:
      "Most orders are delivered within 3-7 business days depending on your location.",
  },
  {
    id: "track-order",
    question: "How can I track my order?",
    answer:
      "Go to My Orders or Track Order from the top menu. You can see live status updates there.",
  },
  {
    id: "payment-methods",
    question: "Which payment methods are available?",
    answer:
      "You can pay using UPI, Cards, Net Banking, Wallets, and Cash on Delivery (where available).",
  },
  {
    id: "return-policy",
    question: "What is the return policy?",
    answer:
      "Returns are accepted for eligible products within 7 days of delivery. Items must be unused and in original condition.",
  },
  {
    id: "size-help",
    question: "How do I choose the right size?",
    answer:
      "Open the product page and check size options before adding to cart. If unsure, choose one size up for comfort.",
  },
  {
    id: "new-products",
    question: "Where can I see newly uploaded products?",
    answer:
      "On the homepage hero slider, open the 'Latest Uploaded Products' slide, or browse Products page.",
  },
  {
    id: "bestsellers",
    question: "Where can I find most purchased products?",
    answer:
      "On the homepage hero slider, open the 'Most Purchased Products' slide to view customer favorites.",
  },
  {
    id: "offers",
    question: "How do I see active offers?",
    answer:
      "Current active offers are shown on the homepage offer banner. Apply any offer instructions during checkout.",
  },
];

const BOT_GREETING =
  "Hi! I am your shopping assistant. Select a question below and I will help you quickly.";

const UserChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: BOT_GREETING, id: "greeting" },
  ]);

  const usedQuestions = useMemo(
    () =>
      new Set(
        messages
          .filter((m) => m.role === "user")
          .map((m) => m.questionId)
          .filter(Boolean)
      ),
    [messages]
  );

  const selectableQuestions = FAQS.filter((q) => !usedQuestions.has(q.id));

  const askQuestion = (item) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", text: item.question, questionId: item.id },
      { role: "bot", text: item.answer, id: `a-${item.id}` },
    ]);
  };

  const resetChat = () => {
    setMessages([{ role: "bot", text: BOT_GREETING, id: "greeting-reset" }]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <div className="w-[340px] max-w-[92vw] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div>
              <p className="font-semibold">Support Chat</p>
              <p className="text-xs text-blue-100">Prebuilt quick help</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-sm hover:bg-blue-500"
            >
              Close
            </button>
          </div>

          <div className="h-72 overflow-y-auto p-3 bg-gray-50 space-y-2">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "bot"
                    ? "bg-white text-gray-700 border border-gray-200"
                    : "ml-auto bg-blue-600 text-white"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
              Choose a question
            </p>
            <div className="max-h-36 overflow-y-auto space-y-2">
              {selectableQuestions.length > 0 ? (
                selectableQuestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => askQuestion(item)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                  >
                    {item.question}
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No more questions left. You can reset the chat or open{" "}
                  <Link to="/contact" className="text-blue-600 hover:underline">
                    Contact
                  </Link>
                  .
                </p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={resetChat}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Reset chat
              </button>
              <Link to="/contact" className="text-xs font-medium text-gray-600 hover:underline">
                Need human support?
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="mt-3 ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        aria-label="Open support chat"
      >
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.2-3.2A7.7 7.7 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    </div>
  );
};

export default UserChatBot;
