const supabase = require('../models/db'); 

module.exports = async function verificaOwner(req, res, next) {
  const { uuid } = req.usuario;

  const { data, error } = await supabase
    .from('permisos_admin')
    .select('rol')
    .eq('uuid', uuid)
    .single();

  if (error || !data || data.rol !== 'owner') {
    return res.status(403).json({ error: 'Acceso restringido a owners' });
  }

  next();
};
