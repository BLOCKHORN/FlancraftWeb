const supabase = require("../models/db");

// ✅ GET /api/permisos-admin
// Devuelve todos los permisos con nombre de usuario (uid)
exports.getPermisos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("permisos_admin")
      .select("uuid, rol, usuarios(uid)")
      .order("rol", { ascending: true });

    if (error) throw error;

    const permisosConNombre = data.map((p) => ({
      uuid: p.uuid,
      uid: p.usuarios?.uid || "Desconocido",
      rol: p.rol,
    }));

    return res.json(permisosConNombre);
  } catch (err) {
    console.error("[GET permisos_admin]", err);
    return res.status(500).json({ error: "Error al obtener permisos." });
  }
};

// ✅ GET /api/usuarios
// Devuelve todos los usuarios vinculados ordenados alfabéticamente
exports.getUsuarios = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("uuid, uid")
      .order("uid", { ascending: true });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error("[GET usuarios]", err);
    return res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

// ✅ POST /api/permisos-admin
// Asigna o actualiza un permiso a un UUID
exports.asignarPermiso = async (req, res) => {
  const { uuid, rol } = req.body;
  if (!uuid || !rol) {
    return res.status(400).json({ error: "Faltan datos requeridos." });
  }

  try {
    const { error } = await supabase
      .from("permisos_admin")
      .upsert({ uuid, rol });

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error("[POST permiso]", err);
    return res.status(500).json({ error: "Error al asignar permiso." });
  }
};

// ✅ DELETE /api/permisos-admin/:uuid
// Elimina el permiso de un UUID
exports.eliminarPermiso = async (req, res) => {
  const { uuid } = req.params;
  if (!uuid) return res.status(400).json({ error: "Falta UUID." });

  try {
    const { error } = await supabase
      .from("permisos_admin")
      .delete()
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

  if (!uuid || !rol) {
    return res.status(400).json({ error: "Faltan datos para actualizar el rol." });
  }

  try {
    const { error } = await supabase
      .from("permisos_admin")
      .update({ rol })
      .eq("uuid", uuid);

    if (error) throw error;

    return res.status(200).json({ mensaje: "Rol actualizado correctamente." });
  } catch (err) {
    console.error("[ACTUALIZAR PERMISO ROL]", err);
    return res.status(500).json({ error: "Error al actualizar el permiso." });
  }
};
