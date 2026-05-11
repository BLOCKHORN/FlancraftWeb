import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import CopyCommand from "./Shared/CopyCommand";

const flaniteIcon = "/tienda/assets/flanite.webp";

// Componente para enriquecer cualquier texto con iconos y enlaces
const EnrichedText = ({ children }) => {
  if (typeof children !== 'string') {
    if (Array.isArray(children)) {
      return children.map((child, i) => <EnrichedText key={i}>{child}</EnrichedText>);
    }
    return children;
  }

  const regex = /(!flanite!|FLANITES)/g;
  const parts = children.split(regex);
  
  if (parts.length === 1) return children;

  return parts.map((part, index) => {
    if (part === '!flanite!' || part === 'FLANITES') {
      return (
        <Link 
          key={index}
          to="/wiki/forja" 
          className="wiki-flanite-link" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            verticalAlign: 'middle', 
            margin: '0 2px',
            gap: '4px',
            color: 'var(--wiki-accent)',
            fontWeight: 'bold',
            textDecoration: 'none',
            borderBottom: part === 'FLANITES' ? '1px dashed rgba(var(--wiki-accent-rgb), 0.4)' : 'none'
          }}
        >
          <img 
            src={flaniteIcon} 
            alt="Flanite" 
            className="inline-icon flanite-icon" 
            style={{ width: '18px', height: '18px', imageRendering: 'pixelated' }}
          />
          {part === 'FLANITES' ? 'FLANITES' : ''}
        </Link>
      );
    }
    return part;
  });
};

const WikiMarkdown = ({ fileName }) => {
  const [content, setContent] = useState("");

  useEffect(() => {
    import(`../../data/wiki/${fileName}.md?raw`)
      .then((module) => {
        setContent(module.default);
      })
      .catch((err) => {
        console.error("Error loading markdown:", err);
        setContent("# Error\nNo se pudo cargar el contenido de la Wiki.");
      });
  }, [fileName]);

  return (
    <div className="wiki-markdown-content">
      <ReactMarkdown
        components={{
          // Comandos interactivos
          code({ node, inline, className, children, ...props }) {
            const match = String(children).startsWith("/");
            if (inline && match) {
              return <CopyCommand command={String(children)} />;
            }
            return <code className={className} {...props}>{children}</code>;
          },
          // Enlaces internos y externos con soporte para Flanites
          a({ node, children, href, ...props }) {
            const content = <EnrichedText>{children}</EnrichedText>;
            if (href?.startsWith("/")) {
              return <Link to={href} {...props}>{content}</Link>;
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{content}</a>;
          },
          // Enriquecer todos los elementos de texto comunes
          p: ({ children }) => <p><EnrichedText>{children}</EnrichedText></p>,
          strong: ({ children }) => <strong><EnrichedText>{children}</EnrichedText></strong>,
          li: ({ children }) => <li><EnrichedText>{children}</EnrichedText></li>,
          h1: ({ children }) => <h1><EnrichedText>{children}</EnrichedText></h1>,
          h2: ({ children }) => <h2><EnrichedText>{children}</EnrichedText></h2>,
          h3: ({ children }) => <h3><EnrichedText>{children}</EnrichedText></h3>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default WikiMarkdown;
