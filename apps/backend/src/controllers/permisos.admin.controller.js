const supabase = require("../models/db");

const ROLES_VALIDOS = new Set(["builder", "helper", "srhelper", "mod", "srmod", "admin", "owner"]);

function normalizeRole(value) {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return ROLES_VALIDOS.has(role) ? role : null;
}

exports.getPermisos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("uuid, uid, rango_staff")
      .not("rango_staff", "is", null)
      .order("uid", { ascending: true });

    if (error) throw error;

    const permisos = (data || []).map((item) => ({
      uuid: item.uuid,
      uid: item.uid || "Desconocido",
      rol: normalizeRole(item.rango_staff),
    }));

    return res.json(permisos);
  } catch (err) {
    console.error("[GET permisos_admin]", err);
    return res.status(500).json({ error: "Error al obtener permisos." });
  }
};

exports.getUsuarios = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("uuid, uid, rango_staff")
      .order("uid", { ascending: true });

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    console.error("[GET usuarios]", err);
    return res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

exports.asignarPermiso = async (req, res) => {
  const { uuid, rol } = req.body;
  const rolNormalizado = normalizeRole(rol);

  if (!uuid || !rolNormalizado) {
    return res.status(400).json({ error: "UUID o rol no válidos." });
  }

  try {
    const { data: usuario, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("uuid")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errorUsuario) throw errorUsuario;
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const { error } = await supabase
      .from("usuarios")
      .update({ rango_staff: rolNormalizado })
      .eq("uuid", uuid);

    if (error) throw error;

    return res.json({ success: true, uuid, rol: rolNormalizado });
  } catch (err) {
    console.error("[POST permiso]", err);
    return res.status(500).json({ error: "Error al asignar permiso." });
  }
};

exports.eliminarPermiso = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: "Falta UUID." });
  }

  try {
    const { error } = await supabase
      .from("usuarios")
      .update({ rango_staff: null })
      .eq("uuid", uuid);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error("[DELETE permiso]", err);
    return res.status(500).json({ error: "Error al eliminar permiso." });
  }
};

exports.actualizarPermisoRol = async (req, res) => {
  const { uuid } = req.params;
  const { rol } = req.body;
  const rolNormalizado = normalizeRole(rol);

  if (!uuid || !rolNormalizado) {
    return res.status(400).json({ error: "UUID o rol no válidos." });
  }

  try {
    const { error } = await supabase
      .from("usuarios")
      .update({ rango_staff: rolNormalizado })
      .eq("uuid", uuid);

    if (error) throw error;

    return res.status(200).json({ success: true, uuid, rol: rolNormalizado });
  } catch (err) {
    console.error("[ACTUALIZAR PERMISO ROL]", err);
    return res.status(500).json({ error: "Error al actualizar el permiso." });
  }
};