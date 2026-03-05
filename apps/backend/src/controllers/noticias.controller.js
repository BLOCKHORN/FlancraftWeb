const supabase = require("../models/db");
const slugify = require("slugify");
const fetch = require("node-fetch");

const CATEGORIAS_VALIDAS = new Set(["global", "tienda", "web", "sorteos"]);
const CATEGORIAS_LEGACY = new Set([
  "survival",
  "oneblock",
  "pokebox",
  "lobby",
  "gens",
  "anarquico",
  "parkour",
]);

const CATEGORIA_LABELS = {
  global: "Global",
  tienda: "Tienda Online",
  web: "Web",
  sorteos: "Sorteos",
};

const webhookURLs = {
  global: process.env.DISCORD_WEBHOOK_GLOBAL || null,
  tienda:
    process.env.DISCORD_WEBHOOK_TIENDA ||
    process.env.DISCORD_WEBHOOK_GLOBAL ||
    null,
  web:
    process.env.DISCORD_WEBHOOK_WEB ||
    process.env.DISCORD_WEBHOOK_GLOBAL ||
    null,
  sorteos:
    process.env.DISCORD_WEBHOOK_SORTEOS ||
    process.env.DISCORD_WEBHOOK_GLOBAL ||
    null,
};

const NEWS_BASE_URL = String(
  process.env.NEWS_PUBLIC_BASE_URL || "https://flancraft.com/news"
).replace(/\/$/, "");

const normalizeCategoria = (value) => {
  const v = String(value || "")
    .trim()
    .toLowerCase();

  if (CATEGORIAS_VALIDAS.has(v)) return v;
  if (CATEGORIAS_LEGACY.has(v)) return "global";
  return "global";
};

const getCategoriaLabel = (value) =>
  CATEGORIA_LABELS[normalizeCategoria(value)] || "Global";

const buildNewsUrl = (slug) => `${NEWS_BASE_URL}/${slug}`;

const mapNoticiaConAutor = (n) => ({
  ...n,
  autor_nombre: n?.usuarios?.uid || null,
});

const obtenerNoticias = async (_req, res) => {
  const { data, error } = await supabase
    .from("noticias")
    .select(`
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
    `)
    .eq("publicada", true)
    .lte("fecha", new Date().toISOString())
    .order("id", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(mapNoticiaConAutor));
};

const obtenerNoticiaPorSlug = async (req, res) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from("noticias")
    .select(`
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
    `)
    .eq("slug", slug)
    .eq("publicada", true)
    .lte("fecha", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: "Noticia no encontrada" });
  }

  res.json(mapNoticiaConAutor(data));
};

const obtenerNoticiaPorId = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("noticias")
    .select(`
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
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: "Noticia no encontrada" });
  }

  res.json(mapNoticiaConAutor(data));
};

const generarVistaPrevia = async (req, res) => {
  const { contenido } = req.body;
  if (!contenido) return res.status(400).json({ error: "Falta contenido" });

  res.json({ html: contenido });
};

const crearNoticia = async (req, res) => {
  const {
    titulo,
    subtitulo,
    slug,
    portada,
    contenido,
    contenidoHtml,
    publicada,
    fecha,
    servidor = "global",
    categorias = [],
  } = req.body;

  const { uuid } = req.usuario || {};

  if (!titulo || !contenido || typeof contenido !== "object" || !contenido.type) {
    return res
      .status(400)
      .json({ error: "Faltan campos obligatorios o contenido inválido" });
  }

  const categoria = normalizeCategoria(servidor);

  const slugFinal = slug
    ? slugify(slug, { lower: true, strict: true })
    : slugify(titulo, { lower: true, strict: true });

  const { data: existente, error: errorExistente } = await supabase
    .from("noticias")
    .select("id")
    .eq("slug", slugFinal)
    .maybeSingle();

  if (errorExistente) {
    return res.status(500).json({ error: "Error al verificar el slug" });
  }

  if (existente) {
    return res
      .status(409)
      .json({ error: "Ya existe una noticia con ese slug" });
  }

  const { data, error } = await supabase
    .from("noticias")
    .insert([
      {
        titulo,
        subtitulo,
        slug: slugFinal,
        portada: typeof portada === "string" ? portada : null,
        contenido,
        contenido_html:
          typeof contenidoHtml === "string" ? contenidoHtml : null,
        publicada: publicada !== false,
        fecha: fecha || new Date().toISOString(),
        autor: uuid || null,
        servidor: categoria,
      },
    ])
    .select("id");

  if (error) return res.status(500).json({ error: error.message });

  const noticiaId = data?.[0]?.id;

  if (Array.isArray(categorias) && categorias.length > 0 && noticiaId) {
    const insertCats = categorias.map((c) => ({
      noticia_id: noticiaId,
      categoria_id: c,
    }));

    const { error: errorCats } = await supabase
      .from("noticias_categorias")
      .insert(insertCats);

    if (errorCats) {
      return res.status(500).json({ error: errorCats.message });
    }
  }

  const noEnviarDiscord =
    req.body.noEnviarDiscord === true || req.body.noEnviarDiscord === "true";

  if (!noEnviarDiscord) {
    try {
      const webhookURL = webhookURLs[categoria] || webhookURLs.global;
      const newsUrl = buildNewsUrl(slugFinal);

      if (webhookURL) {
        await fetch(webhookURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "FlanCraft Noticias",
            avatar_url: "https://flancraftv3.vercel.app/assets/avioneta.webp",
            content: `Nueva noticia en *${getCategoriaLabel(
              categoria
            )}*:\n**${titulo}**\n${newsUrl}\n@here @everyone`,
            embeds: portada
              ? [
                  {
                    title: titulo,
                    url: newsUrl,
                    description:
                      subtitulo || "Entra para conocer todos los detalles.",
                    image: { url: portada },
                    color: 0xead196,
                  },
                ]
              : [],
            allowed_mentions: { parse: ["everyone"] },
          }),
        });
      }
    } catch (err) {
      console.error("Error al enviar a Discord:", err);
    }
  }

  res.status(201).json({ mensaje: "Noticia creada con éxito", slug: slugFinal });
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
    publicada,
    fecha,
    servidor,
    categorias = [],
  } = req.body;

  const { data: anterior, error: errorAnterior } = await supabase
    .from("noticias")
    .select("contenido, contenido_html, autor")
    .eq("id", id)
    .single();

  if (errorAnterior) {
    return res.status(500).json({ error: errorAnterior.message });
  }

  if (anterior) {
    const { error: errorVersion } = await supabase
      .from("noticias_versiones")
      .insert([
        {
          noticia_id: id,
          contenido: anterior.contenido,
          contenido_html: anterior.contenido_html,
          autor: anterior.autor,
        },
      ]);

    if (errorVersion) {
      return res.status(500).json({ error: errorVersion.message });
    }
  }

  const slugFinal = slug
    ? slugify(slug, { lower: true, strict: true })
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
      return res
        .status(409)
        .json({ error: "Ya existe otra noticia con ese slug" });
    }
  }

  const updateObj = {};

  if (typeof titulo === "string") updateObj.titulo = titulo;
  if (typeof subtitulo === "string") updateObj.subtitulo = subtitulo;
  if (typeof portada === "string") updateObj.portada = portada;
  if (contenido && typeof contenido === "object" && contenido.type) {
    updateObj.contenido = contenido;
  }
  if (typeof publicada === "boolean") updateObj.publicada = publicada;
  if (typeof fecha === "string" && fecha) updateObj.fecha = fecha;
  if (slugFinal) updateObj.slug = slugFinal;
  if (typeof servidor !== "undefined") {
    updateObj.servidor = normalizeCategoria(servidor);
  }
  if (typeof contenidoHtml === "string") {
    updateObj.contenido_html = contenidoHtml;
  }

  if (Object.keys(updateObj).length > 0) {
    const { error } = await supabase.from("noticias").update(updateObj).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
  }

  const { error: errorDeleteCats } = await supabase
    .from("noticias_categorias")
    .delete()
    .eq("noticia_id", id);

  if (errorDeleteCats) {
    return res.status(500).json({ error: errorDeleteCats.message });
  }

  if (Array.isArray(categorias) && categorias.length > 0) {
    const nuevas = categorias.map((c) => ({
      noticia_id: id,
      categoria_id: c,
    }));

    const { error: errorInsertCats } = await supabase
      .from("noticias_categorias")
      .insert(nuevas);

    if (errorInsertCats) {
      return res.status(500).json({ error: errorInsertCats.message });
    }
  }

  res.json({ mensaje: "Noticia actualizada" });
};

const eliminarNoticia = async (req, res) => {
  const { id } = req.params;

  const { error: errorCats } = await supabase
    .from("noticias_categorias")
    .delete()
    .eq("noticia_id", id);

  if (errorCats) return res.status(500).json({ error: errorCats.message });

  const { error: errorVersiones } = await supabase
    .from("noticias_versiones")
    .delete()
    .eq("noticia_id", id);

  if (errorVersiones) {
    return res.status(500).json({ error: errorVersiones.message });
  }

  const { error } = await supabase.from("noticias").delete().eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ mensaje: "Noticia eliminada" });
};

const obtenerTodasLasNoticias = async (_req, res) => {
  const { data, error } = await supabase
    .from("noticias")
    .select(`
      id,
      titulo,
      subtitulo,
      slug,
      portada,
      fecha,
      publicada,
      contenido,
      contenido_html,
      servidor,
      autor,
      usuarios ( uid )
    `)
    .order("id", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.json((data || []).map(mapNoticiaConAutor));
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