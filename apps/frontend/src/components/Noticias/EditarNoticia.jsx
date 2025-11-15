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

const API_URL = "https://flancraftweb-backend.onrender.com";

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
      Link,
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
          data.fecha?.slice(0, 16) ||
            new Date().toISOString().slice(0, 16)
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

      <label>Contenido</label>
      <div className="editor-wrapper">
        <EditorContent editor={editor} />
      </div>

      <button className="guardar-btn" onClick={guardarCambios}>
        Guardar Cambios
      </button>
    </div>
  );
};

export default EditarNoticia;
