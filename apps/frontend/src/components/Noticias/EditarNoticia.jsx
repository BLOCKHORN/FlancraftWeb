// src/components/Noticias/EditarNoticia.jsx
import React, { useEffect, useState } from "react";
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

const API_URL = "https://flancraft-backend.onrender.com";

// ===== TOOLBAR =====
const MenuBar = ({ editor }) => {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", previousUrl || "https://");

    if (url === null) return; // cancelado
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const addImage = () => {
    const url = window.prompt("URL de la imagen:");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const addIframe = () => {
    const url = window.prompt("URL del vídeo (YouTube, TikTok, Instagram):");
    if (!url) return;
    editor.chain().focus().setIframe({ src: url }).run();
  };

  const setTextColor = (color) => {
    editor.chain().focus().setColor(color).run();
  };

  return (
    <div className="editor-toolbar">
      {/* Texto básico */}
      <div className="editor-toolbar__group">
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("bold") ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("italic") ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("strike") ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("bulletList") ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          ••
        </button>
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("orderedList") ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </button>
      </div>

      {/* Encabezados / cita */}
      <div className="editor-toolbar__group">
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("heading", { level: 2 }) ? "is-active" : ""
          }`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </button>
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("heading", { level: 3 }) ? "is-active" : ""
          }`}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </button>
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("blockquote") ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &ldquo;
        </button>
      </div>

      {/* Alineación */}
      <div className="editor-toolbar__group">
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive({ textAlign: "left" }) ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          ⬅
        </button>
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive({ textAlign: "center" }) ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          ⬌
        </button>
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive({ textAlign: "right" }) ? "is-active" : ""
          }`}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          ➡
        </button>
      </div>

      {/* Links / media */}
      <div className="editor-toolbar__group">
        <button
          type="button"
          className={`editor-toolbar__button ${
            editor.isActive("link") ? "is-active" : ""
          }`}
          onClick={setLink}
        >
          🔗
        </button>
        <button
          type="button"
          className="editor-toolbar__button"
          onClick={addImage}
        >
          Img
        </button>
        <button
          type="button"
          className="editor-toolbar__button"
          onClick={addIframe}
        >
          Vid
        </button>
      </div>

      {/* Color */}
      <div className="editor-toolbar__group editor-toolbar__group--color">
        <span className="editor-toolbar__label">Color</span>
        <input
          type="color"
          className="editor-toolbar__color-input"
          onChange={(e) => setTextColor(e.target.value)}
        />
      </div>

      {/* Limpiar formato */}
      <div className="editor-toolbar__group">
        <button
          type="button"
          className="editor-toolbar__button"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
        >
          CLR
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        linkOnPaste: true,
      }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Iframe,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  useEffect(() => {
    if (!id || !editor) return;

    const cargarNoticia = async () => {
      try {
        const storedUser = localStorage.getItem("flan_user");
        const token = storedUser ? JSON.parse(storedUser).token : null;

        if (!token) {
          toast.error("Debes iniciar sesión como admin para editar noticias");
          navigate("/admin/noticias");
          return;
        }

        const res = await fetch(`${API_URL}/api/noticias/id/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error("No autorizado");
        }
        if (!res.ok) {
          throw new Error("No encontrada");
        }

        const data = await res.json();

        setTitulo(data.titulo || "");
        setPortada(data.portada || "");
        setFecha(
          data.fecha?.slice(0, 16) || new Date().toISOString().slice(0, 16)
        );
        setSlug(data.slug || "");

        if (data.contenido_html) {
          editor.commands.setContent(data.contenido_html);
        } else if (data.contenido) {
          editor.commands.setContent(data.contenido);
        } else {
          editor.commands.setContent("");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error al cargar noticia:", err);
        if (err.message === "No autorizado") {
          toast.error("No tienes permisos para editar esta noticia");
        } else {
          toast.error("No se pudo cargar la noticia");
        }
        navigate("/admin/noticias");
      }
    };

    cargarNoticia();
  }, [id, editor, navigate]);

  const guardarCambios = async () => {
    try {
      const storedUser = localStorage.getItem("flan_user");
      const token = storedUser ? JSON.parse(storedUser).token : null;
      if (!token) throw new Error("Token no encontrado");

      if (!editor) throw new Error("Editor no inicializado");

      const contenido = editor.getJSON();
      const contenidoHtml = editor.getHTML();

      const body = { titulo, portada, fecha, contenido, contenidoHtml, slug };

      const res = await fetch(`${API_URL}/api/noticias/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error("No autorizado");
      }
      if (!res.ok) throw new Error("Error al guardar cambios");

      toast.success("Noticia actualizada con éxito");

      if (slug) {
        navigate(`/news/${slug}`);
      } else {
        navigate("/admin/noticias");
      }
    } catch (err) {
      console.error("Error al guardar:", err);
      if (err.message === "No autorizado") {
        toast.error("No tienes permisos para guardar cambios");
      } else {
        toast.error("Error al guardar cambios");
      }
    }
  };

  if (loading) return <div className="cargando">Cargando...</div>;

  return (
    <div className="editar-noticia">
      <h2>Editar Noticia</h2>

      <div className="editar-noticia__grid">
        <div className="editar-noticia__meta">
          <label>Título</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />

          <label>Portada (URL)</label>
          <input
            type="text"
            value={portada}
            onChange={(e) => setPortada(e.target.value)}
          />

          <label>Fecha</label>
          <input
            type="datetime-local"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />

          <label>Slug (URL amigable)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="mi-noticia-epica"
          />
        </div>

        <div className="editar-noticia__editor">
          <label>Contenido</label>
          <div className="editor-wrapper">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="editar-noticia__acciones">
        <button className="guardar-btn" onClick={guardarCambios}>
          Guardar cambios
        </button>
      </div>
    </div>
  );
};

export default EditarNoticia;
