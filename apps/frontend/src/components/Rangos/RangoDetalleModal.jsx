// apps/frontend/src/components/Rangos/RangoDetalleModal.jsx
import ModalNovaDetalle from "./ModalNovaDetalle";
import ModalAlphaDetalle from "./ModalAlphaDetalle";
import ModalInmortalDetalle from "./ModalInmortalDetalle";

function RangoDetalleModal({ detalleRango, onClose }) {
  if (!detalleRango) return null;

  if (detalleRango.id === "nova") {
    return <ModalNovaDetalle detalleRango={detalleRango} onClose={onClose} />;
  }
  
  if (detalleRango.id === "alpha") {
    return <ModalAlphaDetalle detalleRango={detalleRango} onClose={onClose} />;
  }

    if (detalleRango.id === "inmortal") {
    return <ModalInmortalDetalle detalleRango={detalleRango} onClose={onClose} />;
  }

}

export default RangoDetalleModal;
