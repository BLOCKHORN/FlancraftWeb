import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { Howl } from 'howler'
import clickSoundFile from '/assets/sounds/vibration.wav'
import {
  ScrollText,
  ShieldCheck,
  BarChart3,
  Gift,
  UserCircle,
  ShoppingBag,
  DoorOpen,
} from 'lucide-react'
import { UserContext } from '../../context/UserContext'
import { supabase } from '@lib/supabaseClient'
import '../../styles/components/Landpage/_maprpg.scss'

const zones = [
  {
    icon: <ScrollText />,
    title: 'Taberna de Noticias',
    description: 'Últimas noticias, cambios y eventos del reino.',
    route: '/news',
    className: 'news',
    image: '/assets/taberna.webp',
  },
  {
    icon: <ShieldCheck />,
    title: 'Fortaleza de Sanciones',
    description: 'Registro de sanciones y sentencias del Tribunal.',
    route: '/tribunal',
    className: 'sanctions',
    image: '/assets/fortaleza.webp',
  },
  {
    icon: <BarChart3 />,
    title: 'Mina de Estadísticas',
    description: 'Rankings, tiempos de juego y marcas legendarias.',
    route: '/leaderboards',
    className: 'stats',
    image: '/assets/mina.webp',
  },
  {
    icon: <Gift />,
    title: 'Templo de Recompensas',
    description: 'Reclama cofres, monedas y premios del pase.',
    route: '/dashboard',
    className: 'rewards',
    image: '/assets/recompensas.webp',
  },
  {
    icon: <UserCircle />,
    title: 'Torre del Jugador',
    description: 'Tu perfil público, logros y progreso global.',
    // ruta por defecto si no hay usuario
    route: '/perfil/tuNombre',
    className: 'player',
    image: '/assets/torre.webp',
  },
  {
    icon: <ShoppingBag />,
    title: 'Tienda',
    description: 'La tienda oficial de FlanCraft, rangos y más.',
    route: '/tienda',
    className: 'shop',
    image: '/assets/mercado.webp',
  },
]

const clickSound = new Howl({
  src: [clickSoundFile],
  volume: 0.4,
})

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
}

const MapRPG = () => {
  const navigate = useNavigate()
  const { user } = useContext(UserContext)

  const isLoggedIn = Boolean(user && user.loggedIn)
  const [playerSlug, setPlayerSlug] = useState(null)

  // 🔥 Igual que en Navbar: sacamos los datos reales desde la tabla `usuarios`
  useEffect(() => {
    const fetchPlayerSlug = async () => {
      if (!user?.uuid) {
        setPlayerSlug(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('uuid', user.uuid)
          .single()

        if (error) {
          console.error('Error al obtener usuario para MapRPG:', error)
          setPlayerSlug(null)
          return
        }

        // En Navbar se pone username: userData.uid
        // así que usamos uid también aquí
        if (data?.uid) {
          setPlayerSlug(data.uid)
        } else {
          setPlayerSlug(null)
        }
      } catch (err) {
        console.error('Error inesperado al cargar usuario en MapRPG:', err)
        setPlayerSlug(null)
      }
    }

    fetchPlayerSlug()
  }, [user?.uuid])

  const handleClick = (route, index) => {
    clickSound.play()

    const cards = document.querySelectorAll('.zone-card')
    const el = cards[index]
    if (el) {
      el.classList.add('vibrate')
      requestAnimationFrame(() => {
        setTimeout(() => el.classList.remove('vibrate'), 180)
      })
    }

    navigate(route)
  }

  const handleKeyDown = (e, route, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(route, index)
    }
  }

  return (
    <section className="map-rpg-wrapper">
      <div className="map-rpg-background" />

      <section className="map-rpg">
        <header className="map-header">
          <h2 className="map-title">
            <DoorOpen className="map-title-icon" size={24} />
            Portales Mágicos
          </h2>
          <p className="map-subtitle">
            Desde esta sala puedes viajar a la taberna, el tribunal, la mina de
            estadísticas o el templo de recompensas. Elige tu portal.
          </p>
        </header>

        <Motion.div
          className="zones-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {zones.map((zone, index) => {
            // Si es la Torre del Jugador y tenemos slug de jugador,
            // usamos /perfil/<uid> igual que en el navbar
            const dynamicRoute =
              zone.className === 'player' && isLoggedIn && playerSlug
                ? `/perfil/${playerSlug}`
                : zone.route

            return (
              <Motion.div
                key={zone.title}
                className={`zone-card ${zone.className}`}
                variants={cardVariants}
                role="button"
                tabIndex={0}
                onClick={() => handleClick(dynamicRoute, index)}
                onKeyDown={(e) => handleKeyDown(e, dynamicRoute, index)}
              >
                {/* capa de imagen con zoom/parallax */}
                <div
                  className="zone-image-layer"
                  style={{ backgroundImage: `url(${zone.image})` }}
                />

                <div className="zone-overlay" />

                <div className="zone-inner">
                  <div className="zone-icon-wrapper">
                    <span className="zone-medallion">
                      <span className="zone-medallion-inner">{zone.icon}</span>
                    </span>
                  </div>

                  <div className="zone-text">
                    <h3>{zone.title}</h3>
                    <p>{zone.description}</p>
                  </div>
                </div>
              </Motion.div>
            )
          })}
        </Motion.div>
      </section>
    </section>
  )
}

export default MapRPG
