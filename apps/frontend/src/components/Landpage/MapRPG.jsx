import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from 'react'
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
    runeImage: '/assets/runes/runa-taberna.webp',
  },
  {
    id: 'tribunal',
    labelCorto: 'Tribunal',
    title: 'Fortaleza de Sanciones',
    shortDescription: 'Historial de sanciones y sentencias.',
    route: '/tribunal',
    image: '/assets/fortaleza.webp',
    runeImage: '/assets/runes/runa-tribunal.webp',
  },
  {
    id: 'stats',
    labelCorto: 'Estadísticas',
    title: 'Estadísticas',
    shortDescription: 'Rankings, tiempo de juego y récords.',
    route: '/leaderboards',
    image: '/assets/mina.webp',
    runeImage: '/assets/runes/runa-estadisticas.webp',
  },
  {
    id: 'rewards',
    labelCorto: 'Recompensas',
    title: 'Templo de Recompensas',
    shortDescription: 'Cofres, monedas y premios del pase.',
    route: '/dashboard',
    image: '/assets/recompensas.webp',
    runeImage: '/assets/runes/runa-recompensas.webp',
  },
  {
    id: 'player',
    labelCorto: 'Perfil',
    title: 'Torre del Jugador',
    shortDescription: 'Tu perfil público y progreso global.',
    route: '/perfil/tuNombre',
    image: '/assets/torre.webp',
    runeImage: '/assets/runes/runa-perfil.webp',
  },
  {
    id: 'shop',
    labelCorto: 'Tienda',
    title: 'Tienda Oficial',
    shortDescription: 'Rangos, llaves y mucho más.',
    route: '/tienda',
    image: '/assets/mercado.webp',
    runeImage: '/assets/runes/runa-tienda.webp',
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

// Importante: aquí ya NO tocamos scale ni translate,
// solo opacidad, para no interferir con el zoom del CSS.
const portalVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
}

const MapRPG = () => {
  const navigate = useNavigate()
  const { user } = useContext(UserContext)

  const isLoggedIn = Boolean(user && user.loggedIn)
  const [playerSlug, setPlayerSlug] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0) // -1 izq, 1 dcha, 0 neutro

  // Estado para luciérnagas "asustadas"
  const [firefliesScared, setFirefliesScared] = useState(false)
  const scareTimeoutRef = useRef(null)
  const scareActiveRef = useRef(false)

  // Preload (evita “micro-cortes” al cambiar de destino)
  const preloadedRef = useRef(false)

  // slug del perfil público
  useEffect(() => {
    let alive = true

    const fetchPlayerSlug = async () => {
      if (!user?.uuid) {
        if (alive) setPlayerSlug(null)
        return
      }

      try {
        // Solo necesitamos uid (evita traer un * entero)
        const { data, error } = await supabase
          .from('usuarios')
          .select('uid')
          .eq('uuid', user.uuid)
          .single()

        if (!alive) return

        if (error) {
          console.error('Error al obtener usuario para MapRPG:', error)
          setPlayerSlug(null)
          return
        }

        setPlayerSlug(data?.uid || null)
      } catch (err) {
        if (!alive) return
        console.error('Error inesperado al cargar usuario en MapRPG:', err)
        setPlayerSlug(null)
      }
    }

    fetchPlayerSlug()

    return () => {
      alive = false
    }
  }, [user?.uuid])

  // Preload de imágenes del carrusel + portal (en idle si existe)
  useEffect(() => {
    if (preloadedRef.current) return
    preloadedRef.current = true

    // precarga también sonidos para evitar el “lag” del primer play
    try {
      clickSound.load()
      teleportSound.load()
    } catch (_) {}

    const assets = [
      ...baseZones.flatMap((z) => [z.image, z.runeImage]),
      // assets css “críticos” del MapRPG (evita primer paint tardío)
      '/assets/maprpg/nether-portal-frame.webp',
      '/assets/maprpg/ground-rock.webp',
    ].filter(Boolean)

    const preload = () => {
      assets.forEach((src) => {
        const img = new Image()
        img.decoding = 'async'
        img.loading = 'eager'
        img.src = src
      })
    }

    // intenta hacerlo cuando el navegador esté libre
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preload, { timeout: 1200 })
    } else {
      const id = window.setTimeout(preload, 0)
      return () => window.clearTimeout(id)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (scareTimeoutRef.current) {
        clearTimeout(scareTimeoutRef.current)
      }
      scareActiveRef.current = false
    }
  }, [])

  const triggerFirefliesScare = useCallback(() => {
    // Evita spam de setState en pointermove/mousemove
    if (scareActiveRef.current) return

    scareActiveRef.current = true

    if (scareTimeoutRef.current) {
      clearTimeout(scareTimeoutRef.current)
    }

    setFirefliesScared(true)

    scareTimeoutRef.current = setTimeout(() => {
      setFirefliesScared(false)
      scareActiveRef.current = false
    }, 350)
  }, [])

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
  const moveCarousel = useCallback(
    (side) => {
      const dirNum = side === 'left' ? -1 : 1
      setDirection(dirNum)

      setCurrentIndex((prev) => {
        const next =
          side === 'left' ? (prev - 1 + len) % len : (prev + 1) % len
        return next
      })

      // SFX de cambio de selección
      clickSound.play()
    },
    [len]
  )

  // entrar al portal
  const handlePortalClick = useCallback(() => {
    if (!selectedZone?.route) return
    teleportSound.play()
    navigate(selectedZone.route)
  }, [navigate, selectedZone?.route])

  const handlePortalKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handlePortalClick()
      }
    },
    [handlePortalClick]
  )

  // click en runas
  const handleRuneClick = useCallback(
    (index) => {
      if (index === currentIndex) return

      let dirNum = 1
      if (index === prevIndex) dirNum = -1
      if (index === nextIndex) dirNum = 1

      setDirection(dirNum)
      clickSound.play()
      setCurrentIndex(index)
    },
    [currentIndex, prevIndex, nextIndex]
  )

  const handleRuneKeyDown = useCallback(
    (e, index) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleRuneClick(index)
      }
    },
    [handleRuneClick]
  )

  // click en puntitos
  const handleDotClick = useCallback(
    (index) => {
      if (index === currentIndex) return
      setDirection(0)
      clickSound.play()
      setCurrentIndex(index)
    },
    [currentIndex]
  )

  const handleDotKeyDown = useCallback(
    (e, index) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleDotClick(index)
      }
    },
    [handleDotClick]
  )

  // trío visible: izquierda / centro / derecha
  const carouselZones = useMemo(
    () => [
      { zone: zones[prevIndex], index: prevIndex, position: 'left' },
      { zone: selectedZone, index: currentIndex, position: 'center' },
      { zone: zones[nextIndex], index: nextIndex, position: 'right' },
    ],
    [zones, prevIndex, selectedZone, currentIndex, nextIndex]
  )

  return (
    <section className="maprpg-wrapper">
      <div className="maprpg-inner">
        <header className="maprpg-header">{/* título opcional */}</header>

        <div className="maprpg-stage">
          <div className="maprpg-portal-block">
            {/* PORTAL */}
            <div
              className={`maprpg-portal-frame ${
                firefliesScared ? 'maprpg-portal-frame--scared' : ''
              }`}
              // ✅ cambia mousemove “spam” por eventos más controlados + guard
              onPointerEnter={triggerFirefliesScare}
              onPointerDown={triggerFirefliesScare}
              onTouchStart={triggerFirefliesScare}
            >
              <div className="maprpg-portal-frame-image" />

              <div className="maprpg-portal-inner">
                {/* Solo el BACKDROP cambia con AnimatePresence.
                    El aura y el texto NO se desmontan => la animación del aura no se reinicia */}
                <AnimatePresence mode="wait">
                  {selectedZone && (
                    <Motion.div
                      key={selectedZone.id}
                      className="maprpg-portal-backdrop"
                      variants={portalVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      style={{
                        backgroundImage: `url(${selectedZone.image})`,
                      }}
                    />
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  className="maprpg-portal-aura"
                  onClick={handlePortalClick}
                  onKeyDown={handlePortalKeyDown}
                  aria-label={`Entrar en ${selectedZone.title}`}
                >
                  <div className="maprpg-portal-content">
                    <h3 className="maprpg-portal-title">{selectedZone.title}</h3>
                    <p className="maprpg-portal-desc">
                      {selectedZone.shortDescription}
                    </p>
                  </div>
                </button>
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
                          style={{
                            backgroundImage: `url(${zone.runeImage})`,
                          }}
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

// ✅ CLAVE: si Home re-renderiza por animaciones/estados, MapRPG no se recalcula
export default memo(MapRPG)
