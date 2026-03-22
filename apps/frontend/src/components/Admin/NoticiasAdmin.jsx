import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Iframe from "../../config/Iframe";
import toast from "react-hot-toast";
import "../../styles/components/Admin/_noticiasadmin.scss";
import { UserContext } from "../../context/UserContext";
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import Seo from "../SEO/Seo";

const DEFAULT_EDITOR_COLOR = "rgba(245, 248, 255, 0.92)";

const CATEGORIAS = [
  { id: "global", label: "Global" },
  { id: "tienda", label: "Tienda Online" },
  { id: "web", label: "Web" },
  { id: "sorteos", label: "Sorteos" },
];

const CATEGORIA_LABELS = CATEGORIAS.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});

const slugify = (value) => {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return s
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const normalizeDatetimeLocal = (isoOrAny) => {
  if (!isoOrAny) return "";
  const s = String(isoOrAny);
  if (s.includes("T") && s.length >= 16) return s.slice(0, 16);
  try {
    return new Date(s).toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

const isProbablyHtml = (s) => {
  const v = String(s || "");
  return v.includes("<") && v.includes(">");
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return null;
  }
};

const normalizeStaffRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const normalizeCategoria = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (CATEGORIA_LABELS[v]) return v;
  if (["survival", "lobby", "oneblock", "gens", "anarquico", "parkour"].includes(v)) return "global";
  return "global";
};

const getCategoriaLabel = (value) => CATEGORIA_LABELS[normalizeCategoria(value)] || "Global";

const buildEmbedUrl = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    if (raw.includes("youtube.com") || raw.includes("youtu.be")) {
      const videoId = raw.includes("youtu.be")
        ? raw.split("/").pop()
        : new URL(raw).searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    if (raw.includes("tiktok.com")) return raw.replace("/video/", "/embed/video/");
    if (raw.includes("instagram.com")) {
      const id = raw.split("/p/")[1]?.split("/")[0];
      return id ? `https://www.instagram.com/p/${id}/embed` : "";
    }
    return raw;
  } catch {
    return raw;
  }
};

const applyHtmlTransformForEmbeds = (html) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ""), "text/html");

    const links = doc.querySelectorAll("a[href]");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      const embed = buildEmbedUrl(href);
      if (!embed) return;

      const iframe = doc.createElement("iframe");
      iframe.setAttribute("src", embed);
      iframe.setAttribute("width", "100%");
      iframe.setAttribute("height", "400");
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("allowfullscreen", "true");
      iframe.setAttribute("loading", "lazy");
      link.parentNode?.replaceChild(iframe, link);
    });

    return doc.body.innerHTML.trim();
  } catch {
    return String(html || "");
  }
};

const ensureEditorDefaults = (editor) => {
  if (!editor) return;
  editor.commands.unsetColor();
};

const MenuBar = ({ editor }) => {
  const fileInputRef = useRef(null);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", prev || "https://");
    if (url === null) return;
    if (!String(url).trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: String(url).trim() }).run();
  };

  const addImageByUrl = () => {
    const url = window.prompt("URL de la imagen:", "https://");
    if (!url) return;
    editor.chain().focus().setImage({ src: String(url).trim() }).run();
  };

  const onPickLocalImage = () => fileInputRef.current?.click?.();

  const onLocalImageSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (!dataUrl) return;
      editor.chain().focus().setImage({ src: String(dataUrl) }).run();
    };
    reader.readAsDataURL(file);
  };

  const addVideo = () => {
    const url = window.prompt("URL del vídeo (YouTube, TikTok, Instagram):", "https://");
    if (!url) return;

    const embed = buildEmbedUrl(url);
    if (!embed) {
      toast.error("No se pudo generar el embed.");
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "iframe",
        attrs: { src: embed, width: "100%", height: "400", frameborder: "0", allowfullscreen: "true" },
      })
      .run();
  };

  const setTextColor = (color) => editor.chain().focus().setColor(color).run();
  const clearFormatting = () => editor.chain().focus().unsetAllMarks().clearNodes().run();

  return (
    <div className="mc-na-toolbar">
      {/* FORMATO DE TEXTO */}
      <div className="mc-na-toolgroup">
        <button type="button" className={`mc-tool-btn ${editor.isActive("bold") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
        </button>
        <button type="button" className={`mc-tool-btn ${editor.isActive("italic") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
        </button>
        <button type="button" className={`mc-tool-btn ${editor.isActive("strike") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"></path><path d="M14 12a4 4 0 0 1 0 8H6"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>
        </button>
        <button type="button" className={`mc-tool-btn ${editor.isActive("bulletList") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista de Puntos">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        </button>
        <button type="button" className={`mc-tool-btn ${editor.isActive("orderedList") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista Numerada">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
        </button>
      </div>

      {/* CABECERAS Y CITAS */}
      <div className="mc-na-toolgroup">
        <button type="button" className={`mc-tool-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={`mc-tool-btn ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" className={`mc-tool-btn ${editor.isActive("blockquote") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Cita">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path></svg>
        </button>
      </div>

      {/* ALINEACIÓN */}
      <div className="mc-na-toolgroup">
        <button type="button" className={`mc-tool-btn ${editor.isActive({ textAlign: "left" }) ? "active" : ""}`} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Alinear Izquierda">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="15" y1="12" x2="3" y2="12"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
        </button>
        <button type="button" className={`mc-tool-btn ${editor.isActive({ textAlign: "center" }) ? "active" : ""}`} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Alinear Centro">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="19" y1="12" x2="5" y2="12"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
        </button>
        <button type="button" className={`mc-tool-btn ${editor.isActive({ textAlign: "right" }) ? "active" : ""}`} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Alinear Derecha">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
        </button>
      </div>

      {/* MEDIA Y ENLACES */}
      <div className="mc-na-toolgroup">
        <button type="button" className={`mc-tool-btn ${editor.isActive("link") ? "active" : ""}`} onClick={setLink} title="Enlace">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        </button>
        <button type="button" className="mc-tool-btn" onClick={addImageByUrl} title="Añadir Imagen (URL)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        </button>
        <button type="button" className="mc-tool-btn" onClick={onPickLocalImage} title="Subir Imagen Local">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        </button>
        <button type="button" className="mc-tool-btn" onClick={addVideo} title="Añadir Vídeo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onLocalImageSelected} style={{ display: "none" }} />
      </div>

      {/* COLOR */}
      <div className="mc-na-toolgroup color-group">
        <input type="color" className="mc-color-picker" defaultValue="#F5F8FF" onChange={(e) => setTextColor(e.target.value)} title="Color del Texto" />
      </div>

      {/* HISTORIAL */}
      <div className="mc-na-toolgroup">
        <button type="button" className="mc-tool-btn" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
        </button>
        <button type="button" className="mc-tool-btn" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>
        </button>
        <button type="button" className="mc-tool-btn" onClick={clearFormatting} title="Limpiar Formato">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 18-18"></path><path d="M20 16v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5"></path><path d="m14 8 3 3"></path><path d="m9 13 3 3"></path></svg>
        </button>
      </div>
    </div>
  );
};

const NoticiasAdmin = () => {
  const { user } = useContext(UserContext);

  const [form, setForm] = useState({
    titulo: "",
    slug: "",
    portada: "",
    servidor: "global",
    fecha: new Date().toISOString().slice(0, 16),
    usarFechaManual: true,
    id: null,
  });

  const [noticias, setNoticias] = useState([]);
  const [htmlInput, setHtmlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contenidoPendiente, setContenidoPendiente] = useState(null);
  const [filtroServidor, setFiltroServidor] = useState("todos");
  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "na-img" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Color,
      TextStyle,
      Iframe,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "mc-na-tiptap",
        spellcheck: "false",
        style: `color: ${DEFAULT_EDITOR_COLOR}; caret-color: ${DEFAULT_EDITOR_COLOR};`,
      },
    },
    onCreate: ({ editor }) => ensureEditorDefaults(editor),
    onUpdate: () => setDirty(true),
  });

  const isOwner = useMemo(() => {
    const role = normalizeStaffRole(user?.rango_staff || user?.rol_admin);
    return Boolean(user?.loggedIn && role === "owner");
  }, [user]);

  const request = useCallback(async (path, options = {}) => {
    const token = getAuthToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(apiUrl(path), { ...options, headers });
  }, []);

  const fetchNoticias = useCallback(async () => {
    try {
      const res = await request("/api/noticias/todas");
      if (res.status === 401 || res.status === 403) throw new Error("NO_AUTH");
      if (!res.ok) throw new Error("FETCH_FAIL");

      const data = await res.json();
      const ahora = new Date();

      const ordenadas = (Array.isArray(data) ? data : [])
        .filter((n) => n?.publicada && new Date(n.fecha) <= ahora)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setNoticias(ordenadas);
    } catch (err) {
      if (err?.message === "NO_AUTH") toast.error("No autorizado para ver noticias");
      else toast.error("No se pudieron cargar las noticias");
    }
  }, [request]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; return ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!form.titulo || slugTouched) return;
    setForm((p) => ({ ...p, slug: slugify(form.titulo) }));
  }, [form.titulo, slugTouched]);

  useEffect(() => {
    if (!isOwner) return;
    fetchNoticias();
  }, [isOwner, fetchNoticias]);

  useEffect(() => {
    if (!editor || contenidoPendiente === null || contenidoPendiente === undefined) return;
    try {
      if (typeof contenidoPendiente === "string") {
        if (isProbablyHtml(contenidoPendiente)) {
          const html = applyHtmlTransformForEmbeds(contenidoPendiente);
          editor.commands.setContent(html, false, { preserveWhitespace: true });
        } else {
          const json = safeJsonParse(contenidoPendiente);
          if (json?.type === "doc") {
            editor.commands.setContent(json);
          } else {
            editor.commands.setContent(contenidoPendiente);
          }
        }
      } else {
        editor.commands.setContent(contenidoPendiente);
      }
    } catch {
      editor.commands.setContent("");
    } finally {
      setContenidoPendiente(null);
      ensureEditorDefaults(editor);
      setDirty(false);
    }
  }, [editor, contenidoPendiente]);

  const resetFormulario = useCallback(() => {
    setForm({
      titulo: "",
      slug: "",
      portada: "",
      servidor: "global",
      fecha: new Date().toISOString().slice(0, 16),
      usarFechaManual: true,
      id: null,
    });
    setSlugTouched(false);
    setHtmlInput("");
    if (editor) {
      editor.commands.clearContent();
      ensureEditorDefaults(editor);
    }
    setDirty(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [editor]);

  const handleChangeTitulo = (titulo) => {
    setForm((prev) => ({ ...prev, titulo, slug: slugTouched ? prev.slug : slugify(titulo) }));
    setDirty(true);
  };

  const handleEdit = (noticia) => {
    setForm({
      titulo: noticia.titulo || "",
      slug: noticia.slug || "",
      portada: noticia.portada || "",
      servidor: normalizeCategoria(noticia.servidor || "global"),
      fecha: normalizeDatetimeLocal(noticia.fecha) || new Date().toISOString().slice(0, 16),
      usarFechaManual: true,
      id: noticia.id,
    });
    setSlugTouched(Boolean(noticia.slug));
    setContenidoPendiente(noticia.contenido_html || noticia.contenido || "");
    setDirty(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editor) return;

    const titulo = String(form.titulo || "").trim();
    const slug = slugify(form.slug || titulo);
    const portada = String(form.portada || "").trim();
    const servidor = normalizeCategoria(form.servidor || "global");

    if (!titulo) return toast.error("El título es obligatorio");
    if (!slug) return toast.error("El slug es obligatorio");
    if (!servidor) return toast.error("La categoría es obligatoria");

    const contenido = editor.getJSON();
    const contenidoHtml = editor.getHTML();

    setIsSubmitting(true);

    const payload = {
      titulo,
      slug,
      portada,
      servidor,
      contenido,
      contenidoHtml,
      contenido_html: contenidoHtml,
      publicada: true,
      fecha: form.usarFechaManual ? form.fecha || new Date().toISOString() : new Date().toISOString(),
    };

    try {
      const path = form.id ? `/api/noticias/${form.id}` : "/api/noticias";
      const method = form.id ? "PUT" : "POST";
      const res = await request(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) throw new Error("NO_AUTH");
      if (!res.ok) throw new Error("SAVE_FAIL");

      toast.success(form.id ? "Noticia actualizada" : "Noticia publicada");
      resetFormulario();
      fetchNoticias();
    } catch (err) {
      if (err?.message === "NO_AUTH") toast.error("No tienes permisos para publicar");
      else toast.error("Error al guardar la noticia");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("¿Eliminar esta noticia?");
    if (!ok) return;

    try {
      const res = await request(`/api/noticias/${id}`, { method: "DELETE" });
      if (res.status === 401 || res.status === 403) throw new Error("NO_AUTH");
      if (!res.ok) throw new Error("DEL_FAIL");

      toast.success("Noticia eliminada");
      if (form.id === id) resetFormulario();
      fetchNoticias();
    } catch (err) {
      if (err?.message === "NO_AUTH") toast.error("No tienes permisos para eliminar");
      else toast.error("Error al eliminar la noticia");
    }
  };

  const handlePasteHtml = () => {
    if (!htmlInput || !editor) return;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlInput, "text/html");

      const titulo = doc.querySelector("h1")?.textContent?.trim() || doc.querySelector("title")?.textContent?.trim() || "";
      const primeraImagen = doc.querySelector("img")?.getAttribute("src") || "";

      if (titulo) handleChangeTitulo(titulo);
      if (primeraImagen) {
        setForm((prev) => ({ ...prev, portada: primeraImagen }));
        setDirty(true);
      }

      const bodyHTML = doc.body?.innerHTML?.trim() || "";
      const finalHTML = applyHtmlTransformForEmbeds(bodyHTML);

      if (finalHTML) {
        editor.commands.setContent(finalHTML, false, { preserveWhitespace: true });
        ensureEditorDefaults(editor);
        setDirty(true);
      }

      setHtmlInput("");
      toast.success("HTML aplicado al editor");
    } catch {
      toast.error("No se pudo procesar el HTML");
    }
  };

  const noticiasFiltradas = filtroServidor === "todos" ? noticias : noticias.filter((n) => normalizeCategoria(n?.servidor || "global") === filtroServidor);

  const onCancelEdit = () => {
    if (dirty) {
      const ok = window.confirm("Tienes cambios sin guardar. ¿Cancelar igualmente?");
      if (!ok) return;
    }
    resetFormulario();
  };

  if (!isOwner) {
    return (
      <div className="mc-na-denied">
        <div className="mc-na-denied-card mc-stone-modal">
          <img src="/assets/gandalf_minecraft.webp" alt="Acceso denegado" />
          <h2>¡No tienes poder aquí!</h2>
          <p>Acceso denegado al panel de gestión de noticias.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo title="Panel Admin Noticias | FlanCraft" noindex />
      <div className="mc-na-container">
        
        <div className="mc-title-plate mc-na-header">
          <h2>GESTIÓN DE NOTICIAS</h2>
          {dirty && <span className="mc-na-dirty-tag">CAMBIOS SIN GUARDAR</span>}
        </div>

        <div className="mc-na-layout">
          
          <div className="mc-na-main">
            <div className="mc-stone-panel">
              <h3 className="mc-panel-title">1. NOTICIA HTML</h3>
              <p className="mc-panel-desc">Pega aquí el HTML crudo para convertirlo visualmente.</p>
              <textarea
                className="mc-na-textarea"
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                placeholder="<h1>Noticia Épica</h1><p>Contenido...</p>"
              />
              <div className="mc-na-actions">
                <button type="button" className="pixel-btn-gray" onClick={() => setHtmlInput("")} disabled={!htmlInput}>LIMPIAR</button>
                <button type="button" className="pixel-btn-gold" onClick={handlePasteHtml} disabled={!htmlInput}>CARGAR EN EDITOR</button>
              </div>
            </div>

            <div className="mc-stone-panel">
              <h3 className="mc-panel-title">2. EDITOR VISUAL</h3>
              <p className="mc-panel-desc">Modifica el texto, añade imágenes y dale formato.</p>
              <div className="mc-na-editor-wrapper">
                <MenuBar editor={editor} />
                <div className="mc-na-editor-canvas">
                  {editor ? <EditorContent editor={editor} /> : <p>Cargando...</p>}
                </div>
              </div>
            </div>
          </div>

          <aside className="mc-na-sidebar">
            <div className="mc-stone-panel">
              <h3 className="mc-panel-title">3. PUBLICACIÓN</h3>
              
              {/* BOTONES PUBLICAR AHORA ARRIBA */}
              <div className="mc-na-publish-actions top-actions">
                {form.id && (
                  <button type="button" className="pixel-btn-red full-width" onClick={onCancelEdit} disabled={isSubmitting}>
                    CANCELAR EDICIÓN
                  </button>
                )}
                <button type="submit" className="pixel-btn-green full-width" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "GUARDANDO..." : form.id ? "GUARDAR CAMBIOS" : "PUBLICAR NOTICIA"}
                </button>
              </div>
              
              <div className="mc-na-field">
                <label>Título</label>
                <input className="mc-na-input" type="text" value={form.titulo} onChange={(e) => handleChangeTitulo(e.target.value)} placeholder="Ej: Nueva Temporada" />
              </div>

              <div className="mc-na-field">
                <label>Slug (URL)</label>
                <input className="mc-na-input" type="text" value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((p) => ({ ...p, slug: e.target.value })); setDirty(true); }} placeholder="nueva-temporada" />
              </div>

              <div className="mc-na-field">
                <label>Categoría</label>
                <select className="mc-na-select" value={form.servidor} onChange={(e) => { setForm((p) => ({ ...p, servidor: normalizeCategoria(e.target.value) })); setDirty(true); }}>
                  {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div className="mc-na-field">
                <label>Portada (URL Imagen)</label>
                <input className="mc-na-input" type="text" value={form.portada} onChange={(e) => { setForm((p) => ({ ...p, portada: e.target.value })); setDirty(true); }} placeholder="https://..." />
                {form.portada && (
                  <div className="mc-na-cover-preview">
                    <img src={form.portada} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="mc-na-field checkbox-field">
                <label>
                  <input type="checkbox" checked={form.usarFechaManual} onChange={(e) => { setForm((p) => ({ ...p, usarFechaManual: e.target.checked })); setDirty(true); }} />
                  Usar fecha manual
                </label>
              </div>

              {form.usarFechaManual && (
                <div className="mc-na-field">
                  <input className="mc-na-input" type="datetime-local" value={form.fecha || ""} onChange={(e) => { setForm((p) => ({ ...p, fecha: e.target.value })); setDirty(true); }} />
                </div>
              )}
            </div>
          </aside>

        </div>

        <div className="mc-title-plate mc-na-header list-header">
          <h2>NOTICIAS PUBLICADAS ({noticiasFiltradas.length})</h2>
        </div>

        <div className="mc-stone-panel mc-na-list-container">
          <div className="mc-na-filters">
            <button className={`pixel-btn-gray ${filtroServidor === "todos" ? "active" : ""}`} onClick={() => setFiltroServidor("todos")}>Todos</button>
            {CATEGORIAS.map((c) => (
              <button key={c.id} className={`pixel-btn-gray ${filtroServidor === c.id ? "active" : ""}`} onClick={() => setFiltroServidor(c.id)}>{c.label}</button>
            ))}
          </div>

          {noticiasFiltradas.length === 0 ? (
            <div className="mc-na-empty">No hay noticias.</div>
          ) : (
            <div className="mc-na-grid">
              {noticiasFiltradas.map((n) => (
                <div key={n.id} className={`mc-na-card ${n.id === form.id ? "is-editing" : ""}`}>
                  <div className="mc-na-card-img">
                    {n.portada ? <img src={n.portada} alt="" /> : <div className="no-img">Sin imagen</div>}
                    <span className="mc-na-card-tag">{getCategoriaLabel(n.servidor)}</span>
                  </div>
                  <div className="mc-na-card-body">
                    <h4>{n.titulo}</h4>
                    <span className="date">{new Date(n.fecha).toLocaleDateString()}</span>
                  </div>
                  <div className="mc-na-card-actions">
                    <button className="pixel-btn-gold" onClick={() => handleEdit(n)}>EDITAR</button>
                    <button className="pixel-btn-red" onClick={() => handleDelete(n.id)}>X</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default NoticiasAdmin;