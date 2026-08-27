import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Lang, translatePhrase } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (s) => s,
});

export const useLanguage = () => useContext(LanguageContext);

const STORAGE_KEY = "lush_lang";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"];

/** original English content, keyed by node */
const originalText = new WeakMap<Node, string>();
const originalAttrs = new WeakMap<Element, Record<string, string>>();

function applyToTextNode(node: Text, lang: Lang) {
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName)) return;
  let base = originalText.get(node);
  if (base === undefined) {
    base = node.nodeValue ?? "";
    originalText.set(node, base);
  }
  if (!base.trim()) return;
  const translated = translatePhrase(base, lang);
  const next = translated ?? base;
  if (node.nodeValue !== next) node.nodeValue = next;
}

function applyToElementAttrs(el: Element, lang: Lang) {
  let store = originalAttrs.get(el);
  if (!store) {
    store = {};
    originalAttrs.set(el, store);
  }
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    if (store[attr] === undefined) store[attr] = el.getAttribute(attr) ?? "";
    const base = store[attr];
    if (!base.trim()) continue;
    const next = translatePhrase(base, lang) ?? base;
    if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
  }
}

function translateTree(root: Node, lang: Lang) {
  if (root.nodeType === Node.TEXT_NODE) {
    applyToTextNode(root as Text, lang);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP_TAGS.has(el.tagName)) return;
  applyToElementAttrs(el, lang);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) applyToTextNode(current as Text, lang);
    else applyToElementAttrs(current as Element, lang);
    current = walker.nextNode();
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return (saved as Lang) || "en";
  });
  const langRef = useRef(lang);
  langRef.current = lang;

  const setLang = useCallback((l: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    translateTree(document.body, lang);

    let frame = 0;
    const pending: Node[] = [];
    const flush = () => {
      frame = 0;
      const nodes = pending.splice(0, pending.length);
      for (const n of nodes) {
        if (n.isConnected) translateTree(n, langRef.current);
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => pending.push(n));
        } else if (m.type === "characterData") {
          const node = m.target as Text;
          // React rewrote this node with new English content
          originalText.delete(node);
          pending.push(node);
        } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
          const el = m.target as Element;
          const store = originalAttrs.get(el);
          if (store && m.attributeName) delete store[m.attributeName];
          pending.push(el);
        }
      }
      if (pending.length && !frame) frame = requestAnimationFrame(flush);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [lang]);

  const t = useCallback((text: string) => translatePhrase(text, lang) ?? text, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}
