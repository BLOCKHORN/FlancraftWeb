import React, { useState } from "react";
import { toast } from "react-hot-toast";

const CopyCommand = ({ command }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast.success("Comando copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="wiki-copy-command" onClick={handleCopy} title="Clic para copiar">
      <code>{command}</code>
      <span className="copy-icon">{copied ? "✅" : "📋"}</span>
    </span>
  );
};

export default CopyCommand;
