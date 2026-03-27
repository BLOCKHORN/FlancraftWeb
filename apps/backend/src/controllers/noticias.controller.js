const supabase = require("../models/db");
const slugify = require("slugify");

const CATEGORIAS_VALIDAS = new Set(["global", "tienda", "web", "sorteos"]);

const CATEGORIA_LABELS = {
  global: "Global",
  tienda: "Tienda Online",
  web: "Web",
  sorteos: "Sorteos",
};

const normalizeCategoria = (value) => {
  const v = String(value || "")
    .trim()
    .toLowerCase();

  if (CATEGORIAS_VALIDAS.has(v)) return v;
  return "global";
};

const getCategoriaLabel = (value) =>
  CATEGORIA_LABELS[normalizeCategoria(value)] || "Global";

// Generador de extractos en el backend (Elimina la sobrecarga del frontend)
const generarExtracto = (htmlStr, length = 140) => {
  if (!htmlStr) return "";
  const text = htmlStr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= length) return text;
  return text.substring(0, length).split(" ").slice(0, -1).join(" ") + "…";
};

// SELECTS SEPARADOS PARA EFICIENCIA
// Full para la lectura individual de la noticia
const NOTICIA_FULL_SELECT = `
  id,
  titulo,
  subtitulo,
  slug,
  portada,
  fecha,
  publicada,
  servidor,
  contenido,
  contenido_html,
  autor,
  usuarios ( uid )
`;

// Preview para listados (evita mandar megabytes de JSON innecesarios)
const NOTICIA_PREVIEW_SELECT = `
  id,
  titulo,
  subtitulo,
  slug,
  portada,
  fecha,
  publicada,
  servidor,
  contenido_html,
  usuarios ( uid )
`;

const mapNoticiaFull = (n) => ({
  ...n,
  servidor: normalizeCategoria(n?.servidor),
  servidor_label: getCategoriaLabel(n?.servidor),
  autor_nombre: n?.usuarios?.uid || null,
});

const mapNoticiaPreview = (n) => ({
  id: n.id,
  titulo: n.titulo,
  subtitulo: n.subtitulo,
  slug: n.slug,
  portada: n.portada,
  fecha: n.fecha,
  publicada: n.publicada,
  servidor: normalizeCategoria(n.servidor),
  servidor_label: getCategoriaLabel(n.servidor),
  autor_nombre: n.usuarios?.uid || null,
  extracto: generarExtracto(n.contenido_html)
});

const obtenerNoticias = async (req, res) => {
  // Paginación y límite integrado
  const limit = parseInt(req.query.limit, 10) || 50;
  const page = parseInt(req.query.page, 10) || 1;
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from("noticias")
    .select(NOTICIA_PREVIEW_SELECT)
    .eq("publicada", true)
    .lte("fecha", new Date().toISOString())
    .order("fecha", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json((data || []).map(mapNoticiaPreview));
};

const obtenerTodasLasNoticias = async (_req, res) => {
  // Usamos el Preview Select para que la tabla del panel Admin cargue al instante
  const { data, error } = await supabase
    .from("noticias")
    .select(NOTICIA_PREVIEW_SELECT)
    .order("fecha", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json((data || []).map(mapNoticiaPreview));
};

const obtenerNoticiaPorSlug = async (req, res) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from("noticias")
    .select(NOTICIA_FULL_SELECT)
    .eq("slug", slug)
    .eq("publicada", true)
    .lte("fecha", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: "Noticia no encontrada" });
  }

  return res.json(mapNoticiaFull(data));
};

const obtenerNoticiaPorId = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("noticias")
    .select(NOTICIA_FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: "Noticia no encontrada" });
  }

  return res.json(mapNoticiaFull(data));
};

const generarVistaPrevia = async (req, res) => {
  const { contenido } = req.body || {};

  if (!contenido) {
    return res.status(400).json({ error: "Falta contenido" });
  }

  return res.json({ html: contenido });
};

const crearNoticia = async (req, res) => {
  const {
    titulo,
    subtitulo,
    slug,
    portada,
    contenido,
    contenidoHtml,
    contenido_html,
    publicada,
    fecha,
    servidor = "global",
  } = req.body || {};

  const { uuid } = req.usuario || {};

  if (!titulo || !contenido || typeof contenido !== "object" || !contenido.type) {
    return res.status(400).json({
      error: "Faltan campos obligatorios o contenido inválido",
    });
  }

  const categoria = normalizeCategoria(servidor);

  const slugFinal = slugify(slug || titulo, {
    lower: true,
    strict: true,
    trim: true,
  });

  if (!slugFinal) {
    return res.status(400).json({ error: "Slug inválido" });
  }

  const { data: existente, error: errorExistente } = await supabase
    .from("noticias")
    .select("id")
    .eq("slug", slugFinal)
    .maybeSingle();

  if (errorExistente) {
    return res.status(500).json({ error: "Error al verificar el slug" });
  }

  if (existente) {
    return res.status(409).json({ error: "Ya existe una noticia con ese slug" });
  }

  const htmlFinal =
    typeof contenidoHtml === "string"
      ? contenidoHtml
      : typeof contenido_html === "string"
      ? contenido_html
      : null;

  const { error } = await supabase.from("noticias").insert([
    {
      titulo: String(titulo).trim(),
      subtitulo: typeof subtitulo === "string" ? subtitulo.trim() : null,
      slug: slugFinal,
      portada: typeof portada === "string" && portada.trim() ? portada.trim() : null,
      contenido,
      contenido_html: htmlFinal,
      publicada: publicada !== false,
      fecha: fecha || new Date().toISOString(),
      autor: uuid || null,
      servidor: categoria,
    },
  ]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    mensaje: "Noticia creada con éxito",
    slug: slugFinal,
  });
};

const actualizarNoticia = async (req, res) => {
  const { id } = req.params;
  const {
    titulo,
    subtitulo,
    slug,
    portada,
    contenido,
    contenidoHtml,
    contenido_html,
    publicada,
    fecha,
    servidor,
  } = req.body || {};

  const slugFinal =
    typeof slug === "string" && slug.trim()
      ? slugify(slug, { lower: true, strict: true, trim: true })
      : undefined;

  if (slugFinal) {
    const { data: slugExistente, error: errorSlug } = await supabase
      .from("noticias")
      .select("id")
      .eq("slug", slugFinal)
      .neq("id", id)
      .maybeSingle();

    if (errorSlug) {
      return res.status(500).json({ error: "Error al verificar el slug" });
    }

    if (slugExistente) {
      return res.status(409).json({ error: "Ya existe otra noticia con ese slug" });
    }
  }

  const updateObj = {};

  if (typeof titulo === "string") updateObj.titulo = titulo.trim();
  if (typeof subtitulo === "string") updateObj.subtitulo = subtitulo.trim();
  if (typeof portada === "string") updateObj.portada = portada.trim() || null;
  if (contenido && typeof contenido === "object" && contenido.type) {
    updateObj.contenido = contenido;
  }
  if (typeof publicada === "boolean") updateObj.publicada = publicada;
  if (typeof fecha === "string" && fecha) updateObj.fecha = fecha;
  if (slugFinal) updateObj.slug = slugFinal;
  if (typeof servidor !== "undefined") {
    updateObj.servidor = normalizeCategoria(servidor);
  }

  const htmlFinal =
    typeof contenidoHtml === "string"
      ? contenidoHtml
      : typeof contenido_html === "string"
      ? contenido_html
      : undefined;

  if (typeof htmlFinal === "string") {
    updateObj.contenido_html = htmlFinal;
  }

  if (!Object.keys(updateObj).length) {
    return res.json({ mensaje: "Sin cambios" });
  }

  const { error } = await supabase.from("noticias").update(updateObj).eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ mensaje: "Noticia actualizada" });
};

const eliminarNoticia = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("noticias").delete().eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ mensaje: "Noticia eliminada" });
};

module.exports = {
  obtenerNoticias,
  obtenerTodasLasNoticias,
  obtenerNoticiaPorSlug,
  obtenerNoticiaPorId,
  generarVistaPrevia,
  crearNoticia,
  actualizarNoticia,
  eliminarNoticia,
};