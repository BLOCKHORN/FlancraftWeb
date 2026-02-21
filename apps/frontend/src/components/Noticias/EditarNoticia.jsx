// src/components/Noticias/EditarNoticia.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Iframe from "../../config/Iframe";
import toast from "react-hot-toast";
import "../../styles/components/Noticias/_editarnoticia.scss";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com")
  .trim()
  .replace(/\/$/, "");

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

const MenuBar = ({ editor }) => {
  const fileInputRef = useRef(null);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", previousUrl || "https://");
    if (url === null) return;
    if (!String(url).trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const addImageByUrl = () => {
    const url = window.prompt("URL de la imagen:", "https://");
    if (!url) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const addIframe = () => {
    const url = window.prompt("URL del vídeo (YouTube, TikTok, Instagram):", "https://");
    if (!url) return;
    editor.chain().focus().setIframe({ src: url.trim() }).run();
  };

  const onPickLocalImage = () => {
    fileInputRef.current?.click?.();
  };

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

  const setTextColor = (color) => {
    editor.chain().focus().setColor(color).run();
  };

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  return (
    <div className="ed-toolbar" role="toolbar" aria-label="Editor">
      <div className="ed-toolbar__group">
        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("bold") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrita"
          aria-label="Negrita"
        >
          <i className="fa-solid fa-bold" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("italic") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Cursiva"
          aria-label="Cursiva"
        >
          <i className="fa-solid fa-italic" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("strike") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
          aria-label="Tachado"
        >
          <i className="fa-solid fa-strikethrough" aria-hidden="true" />
        </button>

        <span className="ed-toolbar__sep" />

        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
          aria-label="Lista"
        >
          <i className="fa-solid fa-list-ul" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
          aria-label="Lista numerada"
        >
          <i className="fa-solid fa-list-ol" aria-hidden="true" />
        </button>
      </div>

      <div className="ed-toolbar__group">
        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("heading", { level: 2 }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Título H2"
          aria-label="Título H2"
        >
          H2
        </button>

        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("heading", { level: 3 }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Título H3"
          aria-label="Título H3"
        >
          H3
        </button>

        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Cita"
          aria-label="Cita"
        >
          <i className="fa-solid fa-quote-left" aria-hidden="true" />
        </button>
      </div>

      <div className="ed-toolbar__group">
        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive({ textAlign: "left" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Alinear izquierda"
          aria-label="Alinear izquierda"
        >
          <i className="fa-solid fa-align-left" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive({ textAlign: "center" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Centrar"
          aria-label="Centrar"
        >
          <i className="fa-solid fa-align-center" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive({ textAlign: "right" }) ? "is-active" : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Alinear derecha"
          aria-label="Alinear derecha"
        >
          <i className="fa-solid fa-align-right" aria-hidden="true" />
        </button>
      </div>

      <div className="ed-toolbar__group">
        <button
          type="button"
          className={`ed-toolbar__btn ${editor.isActive("link") ? "is-active" : ""}`}
          onClick={setLink}
          title="Enlace"
          aria-label="Enlace"
        >
          <i className="fa-solid fa-link" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="ed-toolbar__btn"
          onClick={addImageByUrl}
          title="Insertar imagen por URL"
          aria-label="Insertar imagen por URL"
        >
          <i className="fa-regular fa-image" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="ed-toolbar__btn"
          onClick={onPickLocalImage}
          title="Insertar imagen local"
          aria-label="Insertar imagen local"
        >
          <i className="fa-solid fa-upload" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="ed-toolbar__btn"
          onClick={addIframe}
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

      <div className="ed-toolbar__group ed-toolbar__group--color">
        <span className="ed-toolbar__label">Color</span>
        <input
          type="color"
          className="ed-toolbar__color"
          onChange={(e) => setTextColor(e.target.value)}
          aria-label="Color de texto"
        />
      </div>

      <div className="ed-toolbar__group">
        <button
          type="button"
          className="ed-toolbar__btn"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer"
          aria-label="Deshacer"
        >
          <i className="fa-solid fa-rotate-left" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="ed-toolbar__btn"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer"
          aria-label="Rehacer"
        >
          <i className="fa-solid fa-rotate-right" aria-hidden="true" />
        </button>

        <span className="ed-toolbar__sep" />

        <button
          type="button"
          className="ed-toolbar__btn"
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

const EditarNoticia = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [portada, setPortada] = useState("");
  const [fecha, setFecha] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [slugTouched, setSlugTouched] = useState(false);
  const [dirty, setDirty] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "ed-img",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Iframe,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "ed-tiptap",
        spellcheck: "false",
      },
    },
    onUpdate: () => setDirty(true),
  });

  const heroStyle = useMemo(() => {
    const src = (portada || "").trim();
    if (!src) return undefined;
    return { "--ed-hero": `url("${src}")` };
  }, [portada]);

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
    if (!titulo) return;
    if (slugTouched) return;
    const auto = slugify(titulo);
    setSlug(auto);
  }, [titulo, slugTouched]);

  useEffect(() => {
    if (!id || !editor) return;

    const controller = new AbortController();

    const cargarNoticia = async () => {
      try {
        const token = getToken();

        if (!token) {
          toast.error("Debes iniciar sesión como admin para editar noticias");
          navigate("/admin/noticias");
          return;
        }

        setLoading(true);

        const res = await fetch(`${API_BASE}/api/noticias/id/${id}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) throw new Error("NO_AUTH");
        if (!res.ok) throw new Error("NOT_FOUND");

        const data = await res.json();

        setTitulo(data.titulo || "");
        setPortada(data.portada || "");
        setFecha(normalizeDatetimeLocal(data.fecha) || new Date().toISOString().slice(0, 16));
        setSlug(data.slug || "");
        setSlugTouched(Boolean(data.slug));

        const content = data.contenido_html || data.contenido || "";
        editor.commands.setContent(content || "");
        setDirty(false);
        setLoading(false);
      } catch (err) {
        if (err?.name === "AbortError") return;

        if (err?.message === "NO_AUTH") toast.error("No tienes permisos para editar esta noticia");
        else toast.error("No se pudo cargar la noticia");

        navigate("/admin/noticias");
      }
    };

    cargarNoticia();

    return () => controller.abort();
  }, [id, editor, navigate]);

  const guardarCambios = async () => {
    try {
      const token = getToken();
      if (!token) throw new Error("NO_TOKEN");
      if (!editor) throw new Error("NO_EDITOR");

      const cleanTitle = String(titulo || "").trim();
      if (!cleanTitle) {
        toast.error("El título es obligatorio");
        return;
      }

      const cleanSlug = slugify(slug || cleanTitle);
      const cleanPortada = String(portada || "").trim();

      setSaving(true);

      const contenido = editor.getJSON();
      const contenidoHtml = editor.getHTML();

      const body = {
        titulo: cleanTitle,
        portada: cleanPortada,
        fecha: fecha || new Date().toISOString().slice(0, 16),
        slug: cleanSlug,
        contenido,
        contenidoHtml,
        contenido_html: contenidoHtml,
      };

      const res = await fetch(`${API_BASE}/api/noticias/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401 || res.status === 403) throw new Error("NO_AUTH");
      if (!res.ok) throw new Error("SAVE_FAIL");

      toast.success("Noticia actualizada");
      setDirty(false);
      setSaving(false);

      navigate(`/news/${cleanSlug}`);
    } catch (err) {
      setSaving(false);
      if (err?.message === "NO_AUTH") toast.error("No tienes permisos para guardar cambios");
      else if (err?.message === "NO_TOKEN") toast.error("Sesión no válida. Inicia sesión otra vez.");
      else toast.error("Error al guardar cambios");
    }
  };

  const salir = () => {
    if (dirty) {
      const ok = window.confirm("Tienes cambios sin guardar. ¿Salir igualmente?");
      if (!ok) return;
    }
    navigate("/admin/noticias");
  };

  if (loading) {
    return (
      <div className="editar-noticia-page">
        <div className="ed-shell">
          <div className="ed-card ed-card--loading">
            <div className="ed-skel ed-skel--hero" />
            <div className="ed-skel ed-skel--title" />
            <div className="ed-skel ed-skel--line" />
            <div className="ed-skel ed-skel--line short" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editar-noticia-page">
      <section className="ed-hero" style={heroStyle}>
        <div className="ed-hero__wrap">
          <div className="ed-hero__top">
            <button type="button" className="ed-back" onClick={salir}>
              <span className="ed-back__icon" aria-hidden="true">
                <i className="fa-solid fa-chevron-left" />
              </span>
              <span>Admin / Noticias</span>
            </button>

            <div className="ed-hero__right">
              <div className={`ed-badge ${dirty ? "is-dirty" : "is-clean"}`}>
                {dirty ? "Cambios sin guardar" : "Todo guardado"}
              </div>

              <button
                type="button"
                className="ed-btn ed-btn--solid"
                onClick={guardarCambios}
                disabled={saving}
              >
                <span className="ed-btn__icon" aria-hidden="true">
                  <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} />
                </span>
                <span>{saving ? "Guardando..." : "Guardar"}</span>
              </button>
            </div>
          </div>

          <div className="ed-hero__media">
            {portada ? (
              <img className="ed-hero__img" src={portada} alt="Portada" loading="eager" />
            ) : (
              <div className="ed-hero__placeholder">
                <div className="ed-hero__placeholderTitle">Sin portada</div>
                <div className="ed-hero__placeholderHint">
                  Pega una URL de portada para ver el banner aquí.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="ed-shell">
        <div className="ed-head">
          <h1 className="ed-title">Editar noticia</h1>

          <div className="ed-head__actions">
            <button type="button" className="ed-btn ed-btn--ghost" onClick={salir}>
              <span className="ed-btn__icon" aria-hidden="true">
                <i className="fa-solid fa-xmark" />
              </span>
              <span>Cancelar</span>
            </button>

            <button
              type="button"
              className="ed-btn ed-btn--solid"
              onClick={guardarCambios}
              disabled={saving}
            >
              <span className="ed-btn__icon" aria-hidden="true">
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} />
              </span>
              <span>{saving ? "Guardando..." : "Guardar cambios"}</span>
            </button>
          </div>
        </div>

        <div className="ed-grid">
          <aside className="ed-meta">
            <div className="ed-field">
              <label className="ed-label">Título</label>
              <input
                className="ed-input"
                type="text"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  setDirty(true);
                }}
                placeholder="Título de la noticia"
              />
            </div>

            <div className="ed-field">
              <label className="ed-label">Portada (URL)</label>
              <input
                className="ed-input"
                type="text"
                value={portada}
                onChange={(e) => {
                  setPortada(e.target.value);
                  setDirty(true);
                }}
                placeholder="https://..."
              />
              <div className="ed-hint">
                Recomendado: imagen panorámica. Se mostrará completa en el banner.
              </div>
            </div>

            <div className="ed-field">
              <label className="ed-label">Fecha</label>
              <input
                className="ed-input"
                type="datetime-local"
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setDirty(true);
                }}
              />
            </div>

            <div className="ed-field">
              <label className="ed-label">Slug (URL amigable)</label>
              <input
                className="ed-input"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                  setDirty(true);
                }}
                placeholder="mi-noticia-epica"
              />
              <div className="ed-hint">
                Se genera automáticamente desde el título si no lo editas.
              </div>

              <div className="ed-previewUrl">
                <span className="ed-previewUrl__label">Preview:</span>
                <span className="ed-previewUrl__value">/news/{slugify(slug || titulo) || "..."}</span>
              </div>
            </div>

            <div className="ed-meta__footer">
              <button
                type="button"
                className="ed-btn ed-btn--danger"
                onClick={salir}
              >
                <span className="ed-btn__icon" aria-hidden="true">
                  <i className="fa-solid fa-arrow-left" />
                </span>
                <span>Salir</span>
              </button>
            </div>
          </aside>

          <section className="ed-editor">
            <div className="ed-field ed-field--editor">
              <div className="ed-labelRow">
                <label className="ed-label">Contenido</label>
                <span className="ed-subhint">Tip: pega enlaces y usa el botón de vídeo/imagen</span>
              </div>

              <div className="ed-editorBox">
                <MenuBar editor={editor} />
                <div className="ed-editorContent">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default EditarNoticia;
