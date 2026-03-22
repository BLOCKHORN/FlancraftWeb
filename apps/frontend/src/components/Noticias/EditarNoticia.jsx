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
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import Seo from "../SEO/Seo";
import "../../styles/components/Noticias/_editarnoticia.scss";

const DEFAULT_EDITOR_COLOR = "rgba(245, 248, 255, 0.92)";

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

      <div className="mc-na-toolgroup">
        <button type="button" className={`mc-tool-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={`mc-tool-btn ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" className={`mc-tool-btn ${editor.isActive("blockquote") ? "active" : ""}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Cita">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path></svg>
        </button>
      </div>

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

      <div className="mc-na-toolgroup color-group">
        <input type="color" className="mc-color-picker" defaultValue="#F5F8FF" onChange={(e) => setTextColor(e.target.value)} title="Color del Texto" />
      </div>

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
          class: "mc-na-img",
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
        class: "mc-na-tiptap",
        spellcheck: "false",
        style: `color: ${DEFAULT_EDITOR_COLOR}; caret-color: ${DEFAULT_EDITOR_COLOR};`,
      },
    },
    onUpdate: () => setDirty(true),
  });

  const heroStyle = useMemo(() => {
    const src = (portada || "").trim();
    if (!src) return undefined;
    return { "--mc-na-hero": `url("${src}")` };
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
        const token = getAuthToken();

        if (!token) {
          toast.error("Debes iniciar sesión como admin para editar noticias");
          navigate("/admin/noticias");
          return;
        }

        setLoading(true);

        const res = await fetch(apiUrl(`/api/noticias/id/${id}`), {
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
      const token = getAuthToken();
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

      const res = await fetch(apiUrl(`/api/noticias/${id}`), {
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
        <div className="mc-na-container mc-na-loading-state">
          <div className="mc-stone-panel">
            <h2 style={{ fontFamily: "MinecraftBold", color: "#ffc800", textAlign: "center" }}>
              CARGANDO NOTICIA...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo title="Editar Noticia | FlanCraft" noindex />
      <div className="editar-noticia-page">
        
        {/* CABECERA (PLATE) FUERA DEL GRID Y ANTES DEL BANNER */}
        <div className="mc-na-container pb-0">
          <div className="mc-title-plate mc-na-header">
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button className="pixel-btn-gray" onClick={salir} style={{ padding: "8px 16px" }}>VOLVER</button>
              <h2>EDITAR NOTICIA</h2>
            </div>
            {dirty && <span className="mc-na-dirty-tag">CAMBIOS SIN GUARDAR</span>}
          </div>
        </div>

        {/* VISUALIZACIÓN DE LA PORTADA ESTILO ANTIGUO (ARRIBA, ANTES DEL GRID) */}
        <section className="mc-na-hero" style={heroStyle}>
          <div className="mc-na-container">
            <div className="mc-na-hero-media mc-stone-panel">
              {portada ? (
                <img className="mc-na-hero-img" src={portada} alt="Portada" loading="eager" />
              ) : (
                <div className="mc-na-hero-placeholder">
                  <div className="mc-na-hero-placeholderTitle">SIN PORTADA</div>
                  <div className="mc-na-hero-placeholderHint">
                    Pega una URL de portada en el panel derecho para ver el banner aquí.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* GRID DE CONTENIDO (EDITOR Y SIDEBAR) */}
        <main className="mc-na-container pt-0">
          <div className="mc-na-layout">
            
            <div className="mc-na-main">
              <div className="mc-stone-panel">
                <h3 className="mc-panel-title">EDITOR VISUAL</h3>
                <p className="mc-panel-desc">Modifica el texto, añade imágenes y dale formato.</p>
                <div className="mc-na-editor-wrapper">
                  <MenuBar editor={editor} />
                  <div className="mc-na-editor-canvas">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
            </div>

            <aside className="mc-na-sidebar">
              <div className="mc-stone-panel">
                <h3 className="mc-panel-title">DATOS DE LA NOTICIA</h3>
                
                <div className="mc-na-publish-actions top-actions">
                  <button type="button" className="pixel-btn-green full-width" onClick={guardarCambios} disabled={saving}>
                    {saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                  </button>
                </div>
                
                <div className="mc-na-field">
                  <label>Título</label>
                  <input
                    className="mc-na-input"
                    type="text"
                    value={titulo}
                    onChange={(e) => {
                      setTitulo(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Ej: Nueva Temporada"
                  />
                </div>

                <div className="mc-na-field">
                  <label>Slug (URL)</label>
                  <input
                    className="mc-na-input"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="nueva-temporada"
                  />
                </div>

                <div className="mc-na-field">
                  <label>Portada (URL Imagen)</label>
                  <input
                    className="mc-na-input"
                    type="text"
                    value={portada}
                    onChange={(e) => {
                      setPortada(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="https://..."
                  />
                </div>

                <div className="mc-na-field">
                  <label>Fecha de Publicación</label>
                  <input
                    className="mc-na-input"
                    type="datetime-local"
                    value={fecha || ""}
                    onChange={(e) => {
                      setFecha(e.target.value);
                      setDirty(true);
                    }}
                  />
                </div>
              </div>
            </aside>

          </div>
        </main>
      </div>
    </>
  );
};

export default EditarNoticia;