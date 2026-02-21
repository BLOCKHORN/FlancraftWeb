// apps/backend/src/controllers/noticias.controller.js
const supabase = require("../models/db");
const slugify = require("slugify");
const fetch = require("node-fetch");

// Webhooks por servidor
const webhookURLs = {
  global: process.env.DISCORD_WEBHOOK_GLOBAL,
  survival: process.env.DISCORD_WEBHOOK_SURVIVAL,
  oneblock: process.env.DISCORD_WEBHOOK_ONEBLOCK,
  pokebox: process.env.DISCORD_WEBHOOK_POKEBOX,
};

// === GET /api/noticias === (públicas)
const obtenerNoticias = async (_req, res) => {
  const { data, error } = await supabase
    .from("noticias")
    .select(
      `
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
    `
    )
    .eq("publicada", true)
    .lte("fecha", new Date().toISOString())
    // ✅ última creada arriba
    .order("id", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const dataConAutor = (data || []).map((n) => ({
    ...n,
    autor_nombre: n.usuarios?.uid || null,
  }));

  res.json(dataConAutor);
};

// === GET /api/noticias/:slug === (pública)
const obtenerNoticiaPorSlug = async (req, res) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from("noticias")
    .select(
      `
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
    `
    )
    .eq("slug", slug)
    .eq("publicada", true)
    .lte("fecha", new Date().toISOString())
    .maybeSingle();

  if (error || !data)
    return res.status(404).json({ error: "Noticia no encontrada" });

  const noticia = {
    ...data,
    autor_nombre: data.usuarios?.uid || null,
  };

  res.json(noticia);
};

// === GET /api/noticias/id/:id === (para el editor/admin)
const obtenerNoticiaPorId = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("noticias")
    .select(
      `
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
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data)
    return res.status(404).json({ error: "Noticia no encontrada" });

  const noticia = {
    ...data,
    autor_nombre: data.usuarios?.uid || null,
  };

  res.json(noticia);
};

// === POST /api/noticias/preview ===
const generarVistaPrevia = async (req, res) => {
  const { contenido } = req.body;
  if (!contenido) return res.status(400).json({ error: "Falta contenido" });

  res.json({ html: contenido });
};

// === POST /api/noticias ===
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

  // viene del middleware de auth
  const { uuid } = req.usuario || {};

  if (!titulo || !contenido || typeof contenido !== "object" || !contenido.type)
    return res
      .status(400)
      .json({ error: "Faltan campos obligatorios o contenido inválido" });

  const slugFinal = slug
    ? slugify(slug, { lower: true, strict: true })
    : slugify(titulo, { lower: true, strict: true });

  const { data: existente, error: errorExistente } = await supabase
    .from("noticias")
    .select("id")
    .eq("slug", slugFinal)
    .maybeSingle();

  if (errorExistente)
    return res.status(500).json({ error: "Error al verificar el slug" });
  if (existente)
    return res.status(409).json({ error: "Ya existe una noticia con ese slug" });

  const { data, error } = await supabase
    .from("noticias")
    .insert([
      {
        titulo,
        subtitulo,
        slug: slugFinal,
        portada,
        contenido,
        contenido_html: contenidoHtml,
        publicada: publicada !== false,
        fecha: fecha || new Date().toISOString(),
        // ⬇️ guardamos el UUID real (FK a usuarios.uuid)
        autor: uuid || null,
        servidor,
      },
    ])
    .select("id");

  if (error) return res.status(500).json({ error: error.message });

  const noticiaId = data?.[0]?.id;
  if (categorias.length > 0 && noticiaId) {
    const insertCats = categorias.map((c) => ({
      noticia_id: noticiaId,
      categoria_id: c,
    }));
    await supabase.from("noticias_categorias").insert(insertCats);
  }

  const noEnviarDiscord =
    req.body.noEnviarDiscord === true || req.body.noEnviarDiscord === "true";

  if (!noEnviarDiscord) {
    try {
      const webhookURL = webhookURLs[servidor] || webhookURLs.global;
      if (webhookURL) {
        await fetch(webhookURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "FlanCraft Noticias",
            avatar_url: "https://flancraftv3.vercel.app/assets/avioneta.webp",
            content: `📢 Nueva noticia en *${String(servidor).toUpperCase()}*:\n**${titulo}**\nhttps://flancraft.com/noticias/${slugFinal}\n@here @everyone`,
            embeds: portada
              ? [
                  {
                    title: titulo,
                    url: `https://flancraft.com/noticias/${slugFinal}`,
                    description:
                      subtitulo || "¡Entra para conocer todos los detalles!",
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

// === PUT /api/noticias/:id ===
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

  const { data: anterior } = await supabase
    .from("noticias")
    .select("contenido, autor")
    .eq("id", id)
    .single();

  if (anterior) {
    await supabase.from("noticias_versiones").insert([
      {
        noticia_id: id,
        contenido: anterior.contenido,
        contenido_html: contenidoHtml,
        autor: anterior.autor,
      },
    ]);
  }

  const slugFinal = slug
    ? slugify(slug, { lower: true, strict: true })
    : undefined;

  const updateObj = {
    titulo,
    subtitulo,
    portada,
    contenido,
    publicada,
    fecha,
  };

  if (slugFinal) updateObj.slug = slugFinal;
  if (servidor) updateObj.servidor = servidor;
  if (contenidoHtml) updateObj.contenido_html = contenidoHtml;

  const { error } = await supabase.from("noticias").update(updateObj).eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("noticias_categorias").delete().eq("noticia_id", id);
  if (categorias.length > 0) {
    const nuevas = categorias.map((c) => ({
      noticia_id: id,
      categoria_id: c,
    }));
    await supabase.from("noticias_categorias").insert(nuevas);
  }

  res.json({ mensaje: "Noticia actualizada" });
};

// === DELETE /api/noticias/:id ===
const eliminarNoticia = async (req, res) => {
  const { id } = req.params;

  await supabase.from("noticias_categorias").delete().eq("noticia_id", id);
  await supabase.from("noticias_versiones").delete().eq("noticia_id", id);

  const { error } = await supabase.from("noticias").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ mensaje: "Noticia eliminada" });
};

// === GET /api/noticias/todas === (protegida)
const obtenerTodasLasNoticias = async (_req, res) => {
  const { data, error } = await supabase
    .from("noticias")
    .select(
      `
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
    `
    )
    // ✅ última creada arriba también en admin
    .order("id", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const dataConAutor = (data || []).map((n) => ({
    ...n,
    autor_nombre: n.usuarios?.uid || null,
  }));

  res.json(dataConAutor);
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
