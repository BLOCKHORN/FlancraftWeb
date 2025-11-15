import React from 'react';
import NewsHighlight from './Landpage/NewsHighlight';
import '../styles/components/_playerdashboard.scss';

const PlayerDashboard = () => {
  return (
    <section className="player-dashboard">
      <div className="pd-bg" />
      <div className="pd-wrapper">
        {/* ✅ Reemplazamos todo el dashboard antiguo */}

        {/* ✅ Noticias (sección inferior se mantiene igual) */}
        <NewsHighlight />
      </div>
    </section>
  );
};

export default PlayerDashboard;
