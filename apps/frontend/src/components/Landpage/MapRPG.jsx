import React, { useContext, useEffect, useMemo, useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { Howl } from 'howler'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { UserContext } from '../../context/UserContext'
import { supabase } from '@lib/supabaseClient'
import clickSoundFile from '/assets/sounds/vibration.wav'
import teleportSoundFile from '/assets/sounds/teleport.wav'
import '../../styles/components/Landpage/_maprpg.scss'

const baseZones = [
  {
    id: 'news',
    labelCorto: 'Taberna',
    title: 'Taberna de Noticias',
    shortDescription: 'Noticias, cambios y eventos del reino.',
    route: '/news',
    image: '/assets/taberna.webp',
    runeImage: '/assets/runes/runa-taberna.png',
  },
  {
    id: 'tribunal',
    labelCorto: 'Tribunal',
    title: 'Fortaleza de Sanciones',
    shortDescription: 'Historial de sanciones y sentencias.',
    route: '/tribunal',
    image: '/assets/fortaleza.webp',
    runeImage: '/assets/runes/runa-tribunal.png',
  },
  {
    id: 'stats',
    labelCorto: 'Estadísticas',
    title: 'Estadísticas',
    shortDescription: 'Rankings, tiempo de juego y récords.',
    route: '/leaderboards',
    image: '/assets/mina.webp',
    runeImage: '/assets/runes/runa-estadisticas.png',
  },
  {
    id: 'rewards',
    labelCorto: 'Recompensas',
    title: 'Templo de Recompensas',
    shortDescription: 'Cofres, monedas y premios del pase.',
    route: '/dashboard',
    image: '/assets/recompensas.webp',
    runeImage: '/assets/runes/runa-recompensas.png',
  },
  {
    id: 'player',
    labelCorto: 'Perfil',
    title: 'Torre del Jugador',
    shortDescription: 'Tu perfil público y progreso global.',
    route: '/perfil/tuNombre',
    image: '/assets/torre.webp',
    runeImage: '/assets/runes/runa-perfil.png',
  },
  {
    id: 'shop',
    labelCorto: 'Tienda',
    title: 'Tienda Oficial',
    shortDescription: 'Rangos, llaves y mucho más.',
    route: '/tienda',
    image: '/assets/mercado.webp',
    runeImage: '/assets/runes/runa-tienda.png',
  },
]

// SFX globales (no se recrean en cada render)
const clickSound = new Howl({
  src: [clickSoundFile],
  volume: 0.4,
})

const teleportSound = new Howl({
  src: [teleportSoundFile],
  volume: 0.1,
})

const portalVariants = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    scale: 1.03,
    y: -10,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

const MapRPG = () => {
  const navigate = useNavigate()
  const { user } = useContext(UserContext)

  const isLoggedIn = Boolean(user && user.loggedIn)
  const [playerSlug, setPlayerSlug] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0) // -1 izq, 1 dcha, 0 neutro

  // slug del perfil público
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

  const zones = useMemo(
    () =>
      baseZones.map((zone) =>
        zone.id === 'player' && isLoggedIn && playerSlug
          ? { ...zone, route: `/perfil/${playerSlug}` }
          : zone
      ),
    [isLoggedIn, playerSlug]
  )

  const len = zones.length
  const selectedZone = zones[currentIndex] ?? zones[0]

  const prevIndex = (currentIndex - 1 + len) % len
  const nextIndex = (currentIndex + 1) % len

  // navegación con flechas
  const moveCarousel = (side) => {
    const dirNum = side === 'left' ? -1 : 1
    setDirection(dirNum)

    setCurrentIndex((prev) => {
      const next =
        side === 'left' ? (prev - 1 + len) % len : (prev + 1) % len
      return next
    })

    // SFX de cambio de selección
    clickSound.play()
  }

  // entrar al portal
  const handlePortalClick = () => {
    if (!selectedZone?.route) return
    // SFX de teletransporte
    teleportSound.play()
    navigate(selectedZone.route)
  }

  const handlePortalKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handlePortalClick()
    }
  }

  // click en runas
  const handleRuneClick = (index) => {
    if (index === currentIndex) return

    let dirNum = 1
    if (index === prevIndex) dirNum = -1
    if (index === nextIndex) dirNum = 1

    setDirection(dirNum)
    clickSound.play()
    setCurrentIndex(index)
  }

  const handleRuneKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleRuneClick(index)
    }
  }

  // click en puntitos
  const handleDotClick = (index) => {
    if (index === currentIndex) return
    setDirection(0)
    clickSound.play()
    setCurrentIndex(index)
  }

  const handleDotKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleDotClick(index)
    }
  }

  // trío visible: izquierda / centro / derecha
  const carouselZones = [
    { zone: zones[prevIndex], index: prevIndex, position: 'left' },
    { zone: selectedZone, index: currentIndex, position: 'center' },
    { zone: zones[nextIndex], index: nextIndex, position: 'right' },
  ]

  return (
    <section className="maprpg-wrapper">
      <div className="maprpg-inner">
        <header className="maprpg-header">
          <h2 className="maprpg-title">PORTAL DE TELETRANSPORTE</h2>
        </header>

        <div className="maprpg-stage">
          <div className="maprpg-portal-block">
            {/* PORTAL */}
            <div className="maprpg-portal-frame">
              <div className="maprpg-portal-frame-image" />

              <div className="maprpg-portal-inner">
                <AnimatePresence mode="wait">
                  {selectedZone && (
                    <Motion.div
                      key={selectedZone.id}
                      className="maprpg-portal-layer"
                      variants={portalVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <div
                        className="maprpg-portal-backdrop"
                        style={{
                          backgroundImage: `url(${selectedZone.image})`,
                        }}
                      />

                      <div
                        className="maprpg-portal-aura"
                        role="button"
                        tabIndex={0}
                        onClick={handlePortalClick}
                        onKeyDown={handlePortalKeyDown}
                        aria-label={`Entrar en ${selectedZone.title}`}
                      />

                      <div className="maprpg-portal-content">
                        <h3 className="maprpg-portal-title">
                          {selectedZone.title}
                        </h3>
                        <p className="maprpg-portal-desc">
                          {selectedZone.shortDescription}
                        </p>
                      </div>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CARRUSEL DE RUNAS */}
            <div className="maprpg-carousel">
              <button
                type="button"
                className="maprpg-carousel-arrow maprpg-carousel-arrow--left"
                onClick={() => moveCarousel('left')}
                aria-label="Anterior destino"
              >
                <ChevronLeft size={22} />
              </button>

              <div className="maprpg-carousel-center">
                <Motion.div
                  className="maprpg-carousel-runes"
                  layout
                  transition={{ layout: { duration: 0.6, ease: 'easeInOut' } }}
                >
                  {carouselZones.map(({ zone, index, position }) => {
                    const isNew =
                      direction !== 0 &&
                      ((direction === 1 && position === 'right') ||
                        (direction === -1 && position === 'left'))

                    return (
                      <Motion.button
                        key={zone.id}
                        type="button"
                        className={`maprpg-rune maprpg-rune--${position}`}
                        onClick={() => handleRuneClick(index)}
                        onKeyDown={(e) => handleRuneKeyDown(e, index)}
                        aria-label={zone.title}
                        layout
                        initial={
                          isNew
                            ? {
                                x: direction === 1 ? 40 : -40,
                                opacity: 0,
                              }
                            : { opacity: 1 }
                        }
                        animate={{ x: 0, opacity: 1 }}
                        transition={{
                          layout: { duration: 0.6, ease: 'easeInOut' },
                          duration: 0.6,
                          ease: 'easeInOut',
                        }}
                        whileTap={{ scale: 0.94 }}
                      >
                        <span
                          className="maprpg-rune-image"
                          style={{ backgroundImage: `url(${zone.runeImage})` }}
                        />
                      </Motion.button>
                    )
                  })}
                </Motion.div>

                <p className="maprpg-carousel-hint">
                  Haz clic en el portal para viajar al destino seleccionado.
                </p>

                <div className="maprpg-carousel-dots">
                  {zones.map((zone, index) => (
                    <button
                      key={zone.id}
                      type="button"
                      className={`maprpg-dot ${
                        index === currentIndex ? 'maprpg-dot--active' : ''
                      }`}
                      onClick={() => handleDotClick(index)}
                      onKeyDown={(e) => handleDotKeyDown(e, index)}
                      aria-label={zone.title}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="maprpg-carousel-arrow maprpg-carousel-arrow--right"
                onClick={() => moveCarousel('right')}
                aria-label="Siguiente destino"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MapRPG
