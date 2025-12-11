// src/components/Admin/NoticiasAdmin.jsx
import React, { useEffect, useState, useContext } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import axios from "../../hooks/useAxios";
import { FaPalette, FaCode, FaLink, FaVideo } from "react-icons/fa";
import "../../styles/components/Admin/_noticiasadmin.scss";
import Iframe from "../../config/Iframe";
import { UserContext } from "../../context/UserContext";

const SERVIDORES = [
  { id: "global", label: "Global" },
  { id: "survival", label: "Survival" },
  { id: "oneblock", label: "OneBlock" },
  { id: "chunklock", label: "ChunkLock" },
];

const NoticiasAdmin = () => {
  const { user } = useContext(UserContext);

  const [form, setForm] = useState({
    titulo: "",
    slug: "",
    portada: "",
    servidor: "global",
    fecha: new Date().toISOString().slice(0, 16),
    usarFechaManual: true,
    noEnviarADiscord: false,
    id: null,
  });

  const [noticias, setNoticias] = useState([]);
  const [htmlInput, setHtmlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contenidoPendiente, setContenidoPendiente] = useState(null);
  const [filtroServidor, setFiltroServidor] = useState("todos");
  const [verGuardadas, setVerGuardadas] = useState(false);

  // Modal propio para insertar vídeo
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Color,
      TextStyle,
      Iframe,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "editor-contenido",
      },
    },
  });

  // Cargar noticias solo si el usuario es owner
  useEffect(() => {
    if (user?.loggedIn && user.rol_admin?.toLowerCase() === "owner") {
      fetchNoticias();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Aplicar contenido cuando se edita
  useEffect(() => {
    if (!editor || !contenidoPendiente) return;

    try {
      if (typeof contenidoPendiente === "string") {
        const esHTML =
          contenidoPendiente.includes("<") &&
          contenidoPendiente.includes(">");

        if (esHTML) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(contenidoPendiente, "text/html");

          // Convertir enlaces a iframes
          const links = doc.querySelectorAll("a[href]");
          links.forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;

            let embedUrl = "";
            if (href.includes("youtube.com") || href.includes("youtu.be")) {
              const videoId = href.includes("youtu.be")
                ? href.split("/").pop()
                : new URL(href).searchParams.get("v");
              if (videoId) {
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              }
            } else if (href.includes("tiktok.com")) {
              embedUrl = href.replace("/video/", "/embed/video/");
            } else if (href.includes("instagram.com")) {
              const id = href.split("/p/")[1]?.split("/")[0];
              if (id) {
                embedUrl = `https://www.instagram.com/p/${id}/embed`;
              }
            }

            if (embedUrl) {
              const iframe = document.createElement("iframe");
              iframe.src = embedUrl;
              iframe.width = "100%";
              iframe.height = "400";
              iframe.setAttribute("frameborder", "0");
              iframe.setAttribute("allowfullscreen", "true");
              link.parentNode?.replaceChild(iframe, link);
            }
          });

          const nuevoHTML = doc.body.innerHTML.trim();
          if (nuevoHTML) {
            editor.commands.setContent(nuevoHTML, false, {
              preserveWhitespace: true,
            });
          }
        } else {
          const json = JSON.parse(contenidoPendiente);
          if (json?.type === "doc") {
            editor.commands.setContent(json);
          }
        }
      } else {
        editor.commands.setContent(contenidoPendiente);
      }
    } catch (err) {
      console.error("Error al aplicar contenido:", err);
    } finally {
      setContenidoPendiente(null);
    }
  }, [editor, contenidoPendiente]);

  const fetchNoticias = async () => {
    try {
      const res = await axios.get("/api/noticias/todas");
      const ahora = new Date();
      const ordenadas = res.data
        .filter((n) => n.publicada && new Date(n.fecha) <= ahora)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setNoticias(ordenadas);
    } catch (error) {
      console.error("Error al cargar noticias", error);
    }
  };

  const resetFormulario = () => {
    setForm({
      titulo: "",
      slug: "",
      portada: "",
      servidor: "global",
      fecha: new Date().toISOString().slice(0, 16),
      usarFechaManual: true,
      noEnviarADiscord: false,
      id: null,
    });
    if (editor) editor.commands.clearContent();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChangeTitulo = (titulo) => {
    const slugGenerado = titulo
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    setForm((prev) => ({ ...prev, titulo, slug: slugGenerado }));
  };

  const handleEdit = (noticia) => {
    setForm({
      titulo: noticia.titulo,
      slug: noticia.slug,
      portada: noticia.portada || "",
      servidor: noticia.servidor || "global",
      fecha:
        noticia.fecha?.slice(0, 16) || new Date().toISOString().slice(0, 16),
      usarFechaManual: true,
      noEnviarADiscord: false,
      id: noticia.id,
    });

    setContenidoPendiente(noticia.contenido || noticia.contenido_html || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editor) return;

    const contenido = editor.getJSON();
    const contenidoHtml = editor.getHTML();
    if (!form.titulo || !form.slug || !contenido) return;

    setIsSubmitting(true);

    const payload = {
      titulo: form.titulo,
      slug: form.slug,
      portada: form.portada,
      servidor: form.servidor,
      contenido,
      contenidoHtml,
      publicada: true,
      fecha: form.usarFechaManual ? form.fecha : new Date().toISOString(),
      noEnviarDiscord: form.noEnviarADiscord,
    };

    try {
      if (form.id) {
        await axios.put(`/api/noticias/${form.id}`, payload);
      } else {
        await axios.post("/api/noticias", payload);
      }

      resetFormulario();
      fetchNoticias();
    } catch (error) {
      console.error("Error al enviar noticia", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta noticia?")) return;
    try {
      await axios.delete(`/api/noticias/${id}`);
      if (form.id === id) resetFormulario();
      fetchNoticias();
    } catch (error) {
      console.error("Error al eliminar", error);
    }
  };

  const handlePasteHtml = () => {
    if (!htmlInput || !editor) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlInput, "text/html");

      const titulo =
        doc.querySelector("h1")?.textContent.trim() ||
        doc.querySelector("title")?.textContent.trim();
      const primeraImagen = doc.querySelector("img")?.getAttribute("src");

      if (titulo) handleChangeTitulo(titulo);
      if (primeraImagen) {
        setForm((prev) => ({ ...prev, portada: primeraImagen }));
      }

      const bodyHTML = doc.body.innerHTML.trim();
      if (bodyHTML) {
        editor.commands.setContent(bodyHTML, false, {
          preserveWhitespace: true,
        });
      }

      setHtmlInput("");
    } catch (error) {
      console.error("Error al procesar HTML pegado:", error);
    }
  };

  const renderToolbar = () => {
    if (!editor) return null;

    return (
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
        >
          I
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editor.isActive("heading", { level: 2 }) ? "is-active" : ""
          }
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt("Introduce la URL del enlace:");
            if (url) {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
            }
          }}
        >
          <FaLink /> <span>Enlace</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt("URL de imagen:");
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
        >
          Imagen
        </button>
        <label className="color-picker">
          <FaPalette />
          <input
            type="color"
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
            title="Color de texto"
          />
        </label>
      </div>
    );
  };

  // Construir URL embebida desde una URL cualquiera
  const buildEmbedUrl = (url) => {
    let embedUrl = "";

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("/").pop()
        : new URL(url).searchParams.get("v");
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (url.includes("tiktok.com")) {
      embedUrl = url.replace("/video/", "/embed/video/");
    } else if (url.includes("instagram.com")) {
      const id = url.split("/p/")[1]?.split("/")[0];
      if (id) {
        embedUrl = `https://www.instagram.com/p/${id}/embed`;
      }
    } else {
      embedUrl = url; // fallback genérico
    }

    return embedUrl;
  };

  const handleConfirmVideo = () => {
    if (!editor) return;
    const raw = videoUrl.trim();
    if (!raw) {
      setVideoError("Introduce una URL primero.");
      return;
    }

    const embedUrl = buildEmbedUrl(raw);
    if (!embedUrl) {
      setVideoError("No se ha podido generar el vídeo. Revisa la URL.");
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent({
        type: "iframe",
        attrs: {
          src: embedUrl,
          width: "100%",
          height: "400",
          frameborder: "0",
          allowfullscreen: "true",
        },
      })
      .run();

    setVideoUrl("");
    setVideoError("");
    setIsVideoModalOpen(false);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setVideoUrl("");
    setVideoError("");
  };

  const noticiasFiltradas =
    filtroServidor === "todos"
      ? noticias
      : noticias.filter((n) => (n.servidor || "global") === filtroServidor);

  // Gandalf si no es owner
  if (!user?.loggedIn || user.rol_admin?.toLowerCase() !== "owner") {
    return (
      <div
        className="admin-wrapper"
        style={{ textAlign: "center", padding: "4rem" }}
      >
        <img
          src="/assets/gandalf_minecraft.webp"
          alt="No tienes poder aquí"
          style={{ maxWidth: "320px", marginBottom: "1rem" }}
        />
        <h2
          style={{
            fontFamily: "'IM Fell English SC', serif",
            fontSize: "2rem",
          }}
        >
          ¡No tienes poder aquí!
        </h2>
        <p>Acceso denegado al panel de gestión de noticias</p>
      </div>
    );
  }

  return (
    <div className="noticias-admin">
      <header className="noticias-admin__header">
        <div className="noticias-admin__title-block">
          <div className="noticias-admin__title-main">Gestor de noticias</div>
          <p className="noticias-admin__subtitle">
            Redacta y organiza las noticias que verán los jugadores en la Taberna.
          </p>
        </div>

        {form.id && (
          <div className="noticias-admin__status-pill">
            Editando: <strong>{form.titulo || "Nueva noticia"}</strong>
          </div>
        )}
      </header>

      {/* FORMULARIO */}
      <section className="noticias-admin__form-panel">
        <form onSubmit={handleSubmit} className="noticias-admin__form">
          {/* Datos generales */}
          <div className="noticias-admin__section">
            <h3 className="noticias-admin__section-title">
              <span className="marker" />
              Datos generales
            </h3>
            <div className="noticias-admin__grid">
              <div className="form-group full">
                <label>Título</label>
                <input
                  type="text"
                  placeholder="Título de la noticia"
                  value={form.titulo}
                  onChange={(e) => handleChangeTitulo(e.target.value)}
                />
                <small>
                  Título que se mostrará en la portada y en el listado de artículos.
                </small>
              </div>

              <div className="form-group full">
                <label>Slug</label>
                <input
                  type="text"
                  placeholder="Slug personalizado"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                />
                <small>
                  URL legible. Ejemplo:{" "}
                  <code>temporada-3-pase-de-batalla</code>
                </small>
              </div>

              <div className="form-group full">
                <label>Imagen de portada (URL)</label>
                <input
                  type="text"
                  placeholder="URL de imagen de portada (opcional)"
                  value={form.portada}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      portada: e.target.value,
                    }))
                  }
                />
                <small>
                  Imagen principal que se verá en el hero de noticias y en las
                  tarjetas.
                </small>
              </div>
            </div>
          </div>

          {/* Configuración de publicación */}
          <div className="noticias-admin__section">
            <h3 className="noticias-admin__section-title">
              <span className="marker" />
              Configuración de publicación
            </h3>

            <div className="noticias-admin__grid">
              <div className="form-group">
                <label>Servidor destino</label>
                <select
                  value={form.servidor}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      servidor: e.target.value,
                    }))
                  }
                >
                  {SERVIDORES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <small>
                  Determina en qué servidor se anunciará en Discord esta noticia.
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-fecha">
                  <input
                    type="checkbox"
                    checked={form.usarFechaManual}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        usarFechaManual: e.target.checked,
                      }))
                    }
                  />
                  Usar fecha manual de publicación
                </label>
                {form.usarFechaManual && (
                  <div className="form-group__inline">
                    <label>Fecha de publicación</label>
                    <input
                      type="datetime-local"
                      value={form.fecha || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          fecha: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <label className="checkbox-discord inline">
              <input
                type="checkbox"
                checked={form.noEnviarADiscord}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    noEnviarADiscord: e.target.checked,
                  }))
                }
              />
              No enviar esta noticia a Discord
            </label>
          </div>

          {/* Contenido */}
          <div className="noticias-admin__section">
            <h3 className="noticias-admin__section-title">
              <span className="marker" />
              Contenido
            </h3>

            {renderToolbar()}

            <div className="editor-actions">
              <button
                type="button"
                className="btn-video"
                onClick={() => {
                  setVideoUrl("");
                  setVideoError("");
                  setIsVideoModalOpen(true);
                }}
              >
                <FaVideo /> Insertar vídeo
              </button>
            </div>

            {editor ? (
              <div className="tiptap-editor-wrapper">
                <EditorContent editor={editor} className="tiptap-editor" />
              </div>
            ) : (
              <p className="editor-loading">Cargando editor...</p>
            )}

            <div className="html-paste-box">
              <div className="html-paste-box__header">
                <FaCode />
                <span>Pegar HTML (opcional)</span>
              </div>
              <textarea
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                placeholder="Pega aquí código HTML de noticias antiguas o contenido externo para transformarlo."
              />
              <button
                type="button"
                onClick={handlePasteHtml}
                className="btn-secondary"
              >
                Aplicar HTML
              </button>
            </div>
          </div>

          <div className="noticias-admin__actions">
            <button
              type="submit"
              className="boton-publicar"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Guardando..."
                : form.id
                ? "Actualizar noticia"
                : "Publicar noticia"}
            </button>
          </div>
        </form>
      </section>

      {/* MODAL DE VÍDEO PROPIO */}
      {isVideoModalOpen && (
        <div
          className="news-video-modal-backdrop"
          onClick={closeVideoModal}
        >
          <div
            className="news-video-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Insertar vídeo</h3>
            <p className="news-video-modal__text">
              Pega una URL de YouTube, TikTok o Instagram. La convertiremos en
              un vídeo incrustado dentro de la noticia.
            </p>
            <input
              type="text"
              className="news-video-modal__input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setVideoError("");
              }}
            />
            {videoError && (
              <p className="news-video-modal__error">{videoError}</p>
            )}
            <div className="news-video-modal__actions">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={closeVideoModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleConfirmVideo}
              >
                Insertar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTICIAS GUARDADAS AL PIE */}
      <section className="noticias-admin__saved">
        <button
          type="button"
          className={
            verGuardadas
              ? "noticias-admin__saved-toggle is-open"
              : "noticias-admin__saved-toggle"
          }
          onClick={() => setVerGuardadas((v) => !v)}
        >
          <span>Noticias guardadas ({noticias.length})</span>
          <span className="caret" />
        </button>

        {verGuardadas && (
          <div className="noticias-admin__saved-body">
            <div className="lista-noticias__filtros">
              <span className="lista-noticias__filtros-label">
                Filtrar por servidor
              </span>
              <div className="lista-noticias__tabs">
                <button
                  type="button"
                  className={
                    filtroServidor === "todos"
                      ? "tab-filtro is-active"
                      : "tab-filtro"
                  }
                  onClick={() => setFiltroServidor("todos")}
                >
                  Todos
                </button>
                {SERVIDORES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={
                      filtroServidor === s.id
                        ? "tab-filtro is-active"
                        : "tab-filtro"
                    }
                    onClick={() => setFiltroServidor(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {noticiasFiltradas.length === 0 && (
              <p className="lista-noticias__empty">
                No hay noticias para este filtro.
              </p>
            )}

            <div className="lista-noticias">
              {noticiasFiltradas.map((noticia) => {
                const servidor = noticia.servidor || "global";
                const esEditando = noticia.id === form.id;

                return (
                  <div
                    key={noticia.id}
                    className={
                      esEditando
                        ? "noticia-item noticia-item--active"
                        : "noticia-item"
                    }
                    onClick={() => handleEdit(noticia)}
                  >
                    {noticia.portada && (
                      <img
                        src={noticia.portada}
                        alt="Portada"
                        className="miniatura"
                      />
                    )}
                    <div className="contenido">
                      <h4>{noticia.titulo}</h4>
                      <span className="fecha">
                        {new Date(noticia.fecha).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={`badge-servidor badge-servidor--${servidor}`}
                      >
                        {servidor}
                      </span>
                    </div>
                    <div className="acciones">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(noticia);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(noticia.id);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default NoticiasAdmin;
