// src/sanityClient.jsx
import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url"; // Importamos el builder de imágenes

const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,  // ID de tu proyecto Sanity
  dataset: 'production',                             // Dataset por defecto
  useCdn: true,                                      // Usa CDN si no necesitas datos en tiempo real
  apiVersion: '2023-01-01',                          // Versión estable de la API
  token: import.meta.env.VITE_SANITY_TOKEN,           // Token secreto desde .env
});

// Crear la instancia de imageUrlBuilder
const builder = imageUrlBuilder(client);

// Función que genera la URL de las imágenes
export const urlFor = (source) => builder.image(source);

export default client;
