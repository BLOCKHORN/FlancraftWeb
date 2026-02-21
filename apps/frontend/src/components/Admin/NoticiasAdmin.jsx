// src/components/Admin/NoticiasAdmin.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
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

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com")
  .trim()
  .replace(/\/$/, "");

const DEFAULT_EDITOR_COLOR = "rgba(245, 248, 255, 0.92)";

const SERVIDORES = [
  { id: "global", label: "Global" },
  { id: "anarquico", label: "Anárquico" },
  { id: "gens", label: "Gens" },
  { id: "lobby", label: "Lobby" },
  { id: "oneblock", label: "OneBlock" },
  { id: "parkour", label: "Parkour" },
  { id: "survival", label: "Survival" },
];

const safeJsonParse = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const getToken = () => {
  const stored = localStorage.getItem("flan_user");
  const parsed = stored ? safeJsonParse(stored) : null;
  return parsed?.token || null;
};

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
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: String(url).trim() })
      .run();
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
      toast.error("No se pudo generar el embed. Revisa la URL.");
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "iframe",
        attrs: {
          src: embed,
          width: "100%",
          height: "400",
          frameborder: "0",
          allowfullscreen: "true",
        },
      })
      .run();
  };

  const setTextColor = (color) => editor.chain().focus().setColor(color).run();

  const clearFormatting = () =>
    editor.chain().focus().unsetAllMarks().clearNodes().run();

  return (
    <div className="na-toolbar" role="toolbar" aria-label="Editor">
      <div className="na-toolbar__group">
        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("bold") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrita"
          aria-label="Negrita"
        >
          <i className="fa-solid fa-bold" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("italic") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Cursiva"
          aria-label="Cursiva"
        >
          <i className="fa-solid fa-italic" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("strike") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
          aria-label="Tachado"
        >
          <i className="fa-solid fa-strikethrough" aria-hidden="true" />
        </button>

        <span className="na-toolbar__sep" />

        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
          aria-label="Lista"
        >
          <i className="fa-solid fa-list-ul" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
          aria-label="Lista numerada"
        >
          <i className="fa-solid fa-list-ol" aria-hidden="true" />
        </button>
      </div>

      <div className="na-toolbar__group">
        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("heading", { level: 2 }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="H2"
          aria-label="H2"
        >
          H2
        </button>

        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("heading", { level: 3 }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="H3"
          aria-label="H3"
        >
          H3
        </button>

        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Cita"
          aria-label="Cita"
        >
          <i className="fa-solid fa-quote-left" aria-hidden="true" />
        </button>
      </div>

      <div className="na-toolbar__group">
        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive({ textAlign: "left" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Alinear izquierda"
          aria-label="Alinear izquierda"
        >
          <i className="fa-solid fa-align-left" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive({ textAlign: "center" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Centrar"
          aria-label="Centrar"
        >
          <i className="fa-solid fa-align-center" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive({ textAlign: "right" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Alinear derecha"
          aria-label="Alinear derecha"
        >
          <i className="fa-solid fa-align-right" aria-hidden="true" />
        </button>
      </div>

      <div className="na-toolbar__group">
        <button
          type="button"
          className={`na-toolbar__btn ${editor.isActive("link") ? "is-active" : ""}`}
          onClick={setLink}
          title="Enlace"
          aria-label="Enlace"
        >
          <i className="fa-solid fa-link" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="na-toolbar__btn"
          onClick={addImageByUrl}
          title="Imagen por URL"
          aria-label="Imagen por URL"
        >
          <i className="fa-regular fa-image" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="na-toolbar__btn"
          onClick={onPickLocalImage}
          title="Imagen local"
          aria-label="Imagen local"
        >
          <i className="fa-solid fa-upload" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="na-toolbar__btn"
          onClick={addVideo}
          title="Insertar vídeo"
          aria-label="Insertar vídeo"
        >
          <i className="fa-solid fa-video" aria-hidden="true" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onLocalImageSelected}
          style={{ display: "none" }}
        />
      </div>

      <div className="na-toolbar__group na-toolbar__group--color">
        <span className="na-toolbar__label">Color</span>
       <input
  type="color"
  className="na-toolbar__color"
  defaultValue="#F5F8FF"
  onChange={(e) => setTextColor(e.target.value)}
  aria-label="Color de texto"
/>

      </div>

      <div className="na-toolbar__group">
        <button
          type="button"
          className="na-toolbar__btn"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer"
          aria-label="Deshacer"
        >
          <i className="fa-solid fa-rotate-left" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="na-toolbar__btn"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer"
          aria-label="Rehacer"
        >
          <i className="fa-solid fa-rotate-right" aria-hidden="true" />
        </button>

        <span className="na-toolbar__sep" />

        <button
          type="button"
          className="na-toolbar__btn"
          onClick={clearFormatting}
          title="Limpiar formato"
          aria-label="Limpiar formato"
        >
          <i className="fa-solid fa-eraser" aria-hidden="true" />
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
  const [verGuardadas, setVerGuardadas] = useState(true);

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
        class: "na-tiptap",
        spellcheck: "false",
        style: `color: ${DEFAULT_EDITOR_COLOR}; caret-color: ${DEFAULT_EDITOR_COLOR};`,
      },
    },
    onCreate: ({ editor }) => {
      ensureEditorDefaults(editor);
    },
    onUpdate: () => setDirty(true),
  });

  const isOwner = useMemo(
    () => Boolean(user?.loggedIn && String(user?.rol_admin || "").toLowerCase() === "owner"),
    [user]
  );

  const heroStyle = useMemo(() => {
    const src = String(form.portada || "").trim();
    if (!src) return undefined;
    return { "--na-hero": `url("${src}")` };
  }, [form.portada]);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!form.titulo) return;
    if (slugTouched) return;
    setForm((p) => ({ ...p, slug: slugify(form.titulo) }));
  }, [form.titulo, slugTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  const request = async (path, options = {}) => {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    return res;
  };

  const fetchNoticias = async () => {
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
  };

  useEffect(() => {
    if (!isOwner) return;
    fetchNoticias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  useEffect(() => {
    if (!editor || !contenidoPendiente) return;

    try {
      if (typeof contenidoPendiente === "string") {
        if (isProbablyHtml(contenidoPendiente)) {
          const html = applyHtmlTransformForEmbeds(contenidoPendiente);
          editor.commands.setContent(html, false, { preserveWhitespace: true });
        } else {
          const json = safeJsonParse(contenidoPendiente);
          if (json?.type === "doc") editor.commands.setContent(json);
          else editor.commands.setContent(contenidoPendiente);
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

  const resetFormulario = () => {
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
  };

  const handleChangeTitulo = (titulo) => {
    setForm((prev) => ({
      ...prev,
      titulo,
      slug: slugTouched ? prev.slug : slugify(titulo),
    }));
    setDirty(true);
  };

  const handleEdit = (noticia) => {
    setForm({
      titulo: noticia.titulo || "",
      slug: noticia.slug || "",
      portada: noticia.portada || "",
      servidor: (noticia.servidor || "global").toLowerCase(),
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
    const servidor = String(form.servidor || "global").trim().toLowerCase();

    if (!titulo) return toast.error("El título es obligatorio");
    if (!slug) return toast.error("El slug es obligatorio");
    if (!servidor) return toast.error("El servidor es obligatorio");

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
      fecha: form.usarFechaManual
        ? (form.fecha || new Date().toISOString())
        : new Date().toISOString(),
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

      const titulo =
        doc.querySelector("h1")?.textContent?.trim() ||
        doc.querySelector("title")?.textContent?.trim() ||
        "";

      const primeraImagen = doc.querySelector("img")?.getAttribute("src") || "";

      if (titulo) {
        handleChangeTitulo(titulo);
      }
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
      toast.success("HTML aplicado");
    } catch {
      toast.error("No se pudo procesar el HTML");
    }
  };

  const noticiasFiltradas =
    filtroServidor === "todos"
      ? noticias
      : noticias.filter((n) => String(n?.servidor || "global").toLowerCase() === filtroServidor);

  const onCancelEdit = () => {
    if (dirty) {
      const ok = window.confirm("Tienes cambios sin guardar. ¿Cancelar igualmente?");
      if (!ok) return;
    }
    resetFormulario();
  };

  if (!isOwner) {
    return (
      <div className="na-denied">
        <div className="na-denied__card">
          <img
            src="/assets/gandalf_minecraft.webp"
            alt="Acceso denegado"
            className="na-denied__img"
          />
          <h2 className="na-denied__title">¡No tienes poder aquí!</h2>
          <p className="na-denied__text">Acceso denegado al panel de gestión de noticias.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="noticias-admin-page">
      <section className="na-hero" style={heroStyle}>
        <div className="na-hero__wrap">
          <div className="na-hero__top">
            <div className="na-hero__titleblock">
              <div className="na-hero__kicker">Panel Admin</div>
              <h1 className="na-hero__title">{form.id ? "Editar noticia" : "Crear noticia"}</h1>
              <div className="na-hero__sub">
                {form.id ? (
                  <>
                    Estás editando: <strong>{form.titulo || "Sin título"}</strong>
                  </>
                ) : (
                  <>Publica noticias con portada tipo banner y editor limpio.</>
                )}
              </div>
            </div>

            <div className="na-hero__actions">
              <span className={`na-pill ${dirty ? "is-dirty" : "is-clean"}`}>
                {dirty ? "Cambios sin guardar" : "Todo guardado"}
              </span>

              <button
                type="button"
                className="na-btn na-btn--ghost"
                onClick={onCancelEdit}
                disabled={isSubmitting}
              >
                <span className="na-btn__icon" aria-hidden="true">
                  <i className="fa-solid fa-xmark" />
                </span>
                <span>Cancelar</span>
              </button>

              <button
                type="submit"
                form="na-form"
                className="na-btn na-btn--solid"
                disabled={isSubmitting}
              >
                <span className="na-btn__icon" aria-hidden="true">
                  <i className={`fa-solid ${isSubmitting ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} />
                </span>
                <span>{isSubmitting ? "Guardando..." : form.id ? "Guardar" : "Publicar"}</span>
              </button>
            </div>
          </div>

          <div className="na-hero__media">
            {form.portada ? (
              <img className="na-hero__img" src={form.portada} alt="Portada" loading="eager" />
            ) : (
              <div className="na-hero__placeholder">
                <div className="na-hero__placeholderTitle">Sin portada</div>
                <div className="na-hero__placeholderHint">
                  Pega una URL de portada para ver el banner completo aquí.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="na-shell">
        <section className="na-card na-card--form">
          <form id="na-form" onSubmit={handleSubmit} className="na-form">
            <div className="na-grid">
              <aside className="na-meta">
                <div className="na-sectionTitle">
                  <span className="na-marker" />
                  Datos generales
                </div>

                <div className="na-field">
                  <label className="na-label">Título</label>
                  <input
                    className="na-input"
                    type="text"
                    placeholder="Título de la noticia"
                    value={form.titulo}
                    onChange={(e) => handleChangeTitulo(e.target.value)}
                  />
                  <div className="na-hint">Se mostrará en el listado y en el hero.</div>
                </div>

                <div className="na-field">
                  <label className="na-label">Slug</label>
                  <input
                    className="na-input"
                    type="text"
                    placeholder="mi-noticia-epica"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((prev) => ({ ...prev, slug: e.target.value }));
                      setDirty(true);
                    }}
                  />
                  <div className="na-hint">Se genera desde el título si no lo editas.</div>

                  <div className="na-previewUrl">
                    <span className="na-previewUrl__label">Preview:</span>
                    <span className="na-previewUrl__value">
                      /news/{slugify(form.slug || form.titulo) || "..."}
                    </span>
                  </div>
                </div>

                <div className="na-field">
                  <label className="na-label">Portada (URL)</label>
                  <input
                    className="na-input"
                    type="text"
                    placeholder="https://..."
                    value={form.portada}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, portada: e.target.value }));
                      setDirty(true);
                    }}
                  />
                  <div className="na-hint">
                    Recomendado: imagen panorámica (banner apaisado).
                  </div>
                </div>

                <div className="na-sectionTitle">
                  <span className="na-marker" />
                  Publicación
                </div>

                <div className="na-field">
                  <label className="na-label">Servidor</label>
                  <select
                    className="na-select"
                    value={form.servidor}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, servidor: e.target.value }));
                      setDirty(true);
                    }}
                  >
                    {SERVIDORES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div className="na-hint">
                    Global engloba todo. El resto segmenta la noticia por servidor.
                  </div>
                </div>

                <div className="na-field">
                  <label className="na-check">
                    <input
                      type="checkbox"
                      checked={form.usarFechaManual}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, usarFechaManual: e.target.checked }));
                        setDirty(true);
                      }}
                    />
                    <span>Usar fecha manual</span>
                  </label>

                  {form.usarFechaManual && (
                    <div className="na-inline">
                      <label className="na-label">Fecha</label>
                      <input
                        className="na-input"
                        type="datetime-local"
                        value={form.fecha || ""}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, fecha: e.target.value }));
                          setDirty(true);
                        }}
                      />
                    </div>
                  )}
                </div>

                {form.id && (
                  <div className="na-metaFooter">
                    <button
                      type="button"
                      className="na-btn na-btn--danger"
                      onClick={onCancelEdit}
                      disabled={isSubmitting}
                    >
                      <span className="na-btn__icon" aria-hidden="true">
                        <i className="fa-solid fa-arrow-left" />
                      </span>
                      <span>Salir edición</span>
                    </button>
                  </div>
                )}
              </aside>

              <section className="na-editor">
                <div className="na-sectionTitle">
                  <span className="na-marker" />
                  Contenido
                </div>

                <div className="na-editorBox">
                  <MenuBar editor={editor} />
                  <div className="na-editorContent">
                    {editor ? <EditorContent editor={editor} /> : <p className="na-loading">Cargando editor...</p>}
                  </div>
                </div>

                <div className="na-htmlBox">
                  <div className="na-htmlBox__head">
                    <i className="fa-solid fa-code" aria-hidden="true" />
                    <span>Pegar HTML (opcional)</span>
                  </div>
                  <textarea
                    className="na-textarea"
                    value={htmlInput}
                    onChange={(e) => setHtmlInput(e.target.value)}
                    placeholder="Pega aquí HTML de noticias antiguas o contenido externo para convertirlo."
                  />
                  <div className="na-htmlBox__actions">
                    <button
                      type="button"
                      className="na-btn na-btn--ghost"
                      onClick={() => setHtmlInput("")}
                      disabled={!htmlInput}
                    >
                      <span className="na-btn__icon" aria-hidden="true">
                        <i className="fa-solid fa-broom" />
                      </span>
                      <span>Limpiar</span>
                    </button>

                    <button
                      type="button"
                      className="na-btn na-btn--solid"
                      onClick={handlePasteHtml}
                      disabled={!htmlInput}
                    >
                      <span className="na-btn__icon" aria-hidden="true">
                        <i className="fa-solid fa-wand-magic-sparkles" />
                      </span>
                      <span>Aplicar HTML</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </form>
        </section>

        <section className="na-card na-card--list">
          <div className="na-listHead">
            <button
              type="button"
              className={verGuardadas ? "na-toggle is-open" : "na-toggle"}
              onClick={() => setVerGuardadas((v) => !v)}
            >
              <span>Noticias publicadas</span>
              <span className="na-toggle__count">({noticias.length})</span>
              <span className="na-caret" aria-hidden="true" />
            </button>

            <div className="na-filter">
              <span className="na-filter__label">Filtrar:</span>
              <div className="na-tabs">
                <button
                  type="button"
                  className={filtroServidor === "todos" ? "na-tab is-active" : "na-tab"}
                  onClick={() => setFiltroServidor("todos")}
                >
                  Todos
                </button>

                {SERVIDORES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={filtroServidor === s.id ? "na-tab is-active" : "na-tab"}
                    onClick={() => setFiltroServidor(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {verGuardadas && (
            <>
              {noticiasFiltradas.length === 0 ? (
                <div className="na-empty">No hay noticias para este filtro.</div>
              ) : (
                <div className="na-list">
                  {noticiasFiltradas.map((n) => {
                    const servidor = String(n?.servidor || "global").toLowerCase();
                    const isActive = n?.id === form.id;

                    return (
                      <div
                        key={n.id}
                        className={isActive ? "na-item is-active" : "na-item"}
                        onClick={() => handleEdit(n)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") handleEdit(n);
                        }}
                      >
                        <div className="na-item__thumb">
                          {n.portada ? (
                            <img src={n.portada} alt="Portada" loading="lazy" />
                          ) : (
                            <div className="na-item__thumbEmpty">
                              <i className="fa-regular fa-image" aria-hidden="true" />
                            </div>
                          )}
                        </div>

                        <div className="na-item__body">
                          <div className="na-item__title">{n.titulo}</div>
                          <div className="na-item__meta">
                            <span className="na-item__date">
                              {new Date(n.fecha).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            <span className={`na-badge na-badge--${servidor}`}>{servidor}</span>
                          </div>
                        </div>

                        <div className="na-item__actions">
                          <button
                            type="button"
                            className="na-miniBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(n);
                            }}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="na-miniBtn na-miniBtn--danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(n.id);
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default NoticiasAdmin;
