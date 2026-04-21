/// <reference types="vite/client" />

// Allow TypeScript to import plain CSS files (Vite handles them at runtime)
declare module '*.css' {
  const content: string;
  export default content;
}

// Allow CSS imports from package exports (e.g. @corredor/ui/styles/tokens.css)
declare module '@corredor/ui/styles/tokens.css' {
  const content: string;
  export default content;
}
