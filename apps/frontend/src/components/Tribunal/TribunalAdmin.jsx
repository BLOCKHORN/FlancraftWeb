import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import {
  PencilSimple,
  Trash,
  FloppyDisk,
  ArrowLeft,
  Tree,
  Fire,
  PaintBrush,
  Cube,
  CrownSimple,
  Sword,
  PersonSimpleRun,
  Globe,
  CheckCircle,
  HourglassMedium,
  Skull
} from 'phosphor-react';

import '../../styles/components/Tribunal/_tribunaladmin.scss';

export default function AdminPanel() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [sanciones, setSanciones] = useState([]);
  const [editing, setEditing] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [estado, setEstado] = useState('pendiente');
  const [motivoEditado, setMotivoEditado] = useState('');

  const motivos = [
    'hacks', 'fly', 'minar survival', 'insultos', 'tpakill',
    'granja de lag', 'grif', 'spam', 'flood', 'usar bugs', 'estafas', 'otros'
  ];

  useEffect(() => {
    if (user?.loggedIn && user?.rol_admin) {
      cargarSanciones();
    }
  }, [user]);

  const cargarSanciones = async () => {
    try {
      const res = await fetch("https://flancraftweb-backend.onrender.com/api/sanciones");
      const data = await res.json();
      setSanciones(data);
    } catch (err) {
      console.error("Error cargando sanciones", err);
    }
  };

  const guardarCambios = async (sancion) => {
    try {
      await fetch(`https://flancraftweb-backend.onrender.com/api/sanciones/${sancion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observacion,
          estado,
          type: motivoEditado,
          revisado_por: user.uid
        })
      });

      cargarSanciones();
      setEditing(null);
      setObservacion('');
      setEstado('pendiente');
      setMotivoEditado('');
    } catch (err) {
      console.error("Error guardando cambios", err);
    }
  };

  const eliminarSancion = async (id, nombre) => {
    if (!confirm(`¿Seguro que deseas eliminar la sanción de ${nombre}?`)) return;
    try {
      await fetch(`https://flancraftweb-backend.onrender.com/api/sanciones/${id}`, {
        method: 'DELETE'
      });
      cargarSanciones();
    } catch (err) {
      console.error("Error al eliminar sanción", err);
    }
  };

  const obtenerNombreServidor = (raw) => {
    const mapa = {
      survival: 'Survival',
      anarquico: 'Anárquico',
      creativo: 'Creativo',
      oneblock: 'OneBlock',
      kingdoms: 'Kingdoms',
      boxpvp: 'BoxPvP',
      parkour: 'Parkour',
      'play.flancraft.com': 'Lobby',
    };
    return mapa[raw?.toLowerCase()] || 'Servidor desconocido';
  };

  const obtenerIconoServidor = (server) => {
    const baseProps = { size: 16, weight: 'fill', style: { marginRight: '6px' } };
    const mapa = {
      survival: <Tree {...baseProps} />,
      anarquico: <Fire {...baseProps} />,
      creativo: <PaintBrush {...baseProps} />,
      oneblock: <Cube {...baseProps} />,
      kingdoms: <CrownSimple {...baseProps} />,
      boxpvp: <Sword {...baseProps} />,
      parkour: <PersonSimpleRun {...baseProps} />,
      'play.flancraft.com': <Globe {...baseProps} />,
    };
    return mapa[server?.toLowerCase()] || <Globe {...baseProps} />;
  };

  const obtenerIconoEstado = (estado) => {
    const props = { size: 16, weight: 'duotone', style: { marginRight: '6px' } };
    switch (estado) {
      case 'baneado': return <Skull color="#c0392b" {...props} />;
      case 'revisado': return <CheckCircle color="#27ae60" {...props} />;
      case 'pendiente':
      default: return <HourglassMedium color="#e67e22" {...props} />;
    }
  };

  const formatearDuracion = (duracionRaw) => {
    if (!duracionRaw) return 'Desconocida';
    const match = duracionRaw.toLowerCase().match(/(\d+)([smhd])/);
    if (!match) return duracionRaw;
    const [_, valor, unidad] = match;
    const unidades = { s: 'segundo', m: 'minuto', h: 'hora', d: 'día' };
    return `${valor} ${unidades[unidad]}${valor > 1 ? 's' : ''}`;
  };

  const obtenerFechaFin = (timestamp, duracionRaw) => {
    const match = duracionRaw?.toLowerCase().match(/(\d+)([smhd])/);
    if (!match) return null;
    const valor = parseInt(match[1], 10);
    const unidad = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const ms = valor * (multipliers[unidad] || 0);
    return new Date(parseInt(timestamp) + ms).toLocaleString('es-ES');
  };

  // ✅ BLOQUE CONDICIONAL ÚNICO
if (user === null || !user.loggedIn || !user.rol_admin) {
  return (
    <div className="admin-wrapper" style={{ textAlign: 'center', padding: '4rem', color: '#ffffff' }}>
      <img
        src="/assets/gandalf_minecraft.png"
        alt="No tienes poder aquí"
        style={{ maxWidth: '320px', marginBottom: '1rem' }}
      />
      <h2 style={{ fontFamily: "'IM Fell English SC', serif", fontSize: '2rem' }}>
        ¡No tienes poder aquí!
      </h2>
      <p>Acceso denegado al panel administrativo</p>
    </div>
  );
}

  return (
    <div className="admin-wrapper">
      <h1 className="admin-title">Panel de Administración</h1>

      <div className="admin-toolbar">
        <button className="btn volver" onClick={() => navigate('/tribunal')}>
          <ArrowLeft size={18} weight="bold" style={{ marginRight: '6px' }} />
          Volver a sanciones
        </button>

        <div style={{ marginLeft: 'auto' }}>
          <span style={{ marginRight: '10px', fontWeight: 'bold' }}>
            Sesión: {user?.uid} ({user?.rol_admin})
          </span>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Motivo</th>
            <th>Duración</th>
            <th>Estado</th>
            <th>Observación</th>
            <th>Servidor</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {sanciones.map((s) => {
            const fechaFin = obtenerFechaFin(s.timestamp, s.duration);
            return (
              <tr key={s.id}>
                <td>
                  <Link to={`/perfil/${s.name}`} className="player-link">
                    <div className="player-cell">
                      <img src={`https://mc-heads.net/avatar/${s.name}/30`} alt={s.name} className="avatar" />
                      <span>{s.name}</span>
                    </div>
                  </Link>
                </td>

                <td>
                  {editing === s.id ? (
                    <select
                      value={motivoEditado}
                      onChange={(e) => setMotivoEditado(e.target.value)}
                    >
                      {motivos.map((motivo) => (
                        <option key={motivo} value={motivo}>{motivo}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`motivo-badge ${s.type?.toLowerCase().replace(/\s/g, '-') || 'otros'}`}>
                      {s.type || 'Sin clasificar'}
                    </span>
                  )}
                </td>

                <td>
                  {formatearDuracion(s.duration)}
                  {fechaFin && (
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      Termina: {fechaFin}
                    </div>
                  )}
                </td>

                <td className={`estado ${s.estado || 'pendiente'}`}>
                  {obtenerIconoEstado(s.estado)}
                  {s.estado || 'pendiente'}
                </td>

                <td>{s.observacion || '-'}</td>

                <td>
                  <span className={`server-badge ${s.server?.toLowerCase() || 'desconocido'}`}>
                    {obtenerIconoServidor(s.server)}
                    {obtenerNombreServidor(s.server)}
                  </span>
                </td>

                <td>
                  {editing === s.id ? (
                    <div className="editor">
                      <textarea
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        placeholder="Escribe observación..."
                      />
                      <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                        <option value="pendiente">Pendiente</option>
                        <option value="revisado">Revisado</option>
                        <option value="baneado">Baneado</option>
                      </select>
                      <button onClick={() => guardarCambios(s)}>
                        <FloppyDisk size={18} weight="bold" style={{ marginRight: '5px' }} />
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <div className="action-buttons">
                      <button
                        className="btn"
                        onClick={() => {
                          setEditing(s.id);
                          setObservacion(s.observacion || '');
                          setEstado(s.estado || 'pendiente');
                          setMotivoEditado(s.type || 'otros');
                        }}
                      >
                        <PencilSimple size={18} weight="bold" style={{ marginRight: '5px' }} />
                        Editar
                      </button>

                      {(user.rol_admin === 'admin' || user.rol_admin === 'owner') && (
                        <button
                          className="btn eliminar"
                          onClick={() => eliminarSancion(s.id, s.name)}
                        >
                          <Trash size={18} weight="bold" style={{ marginRight: '5px' }} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
